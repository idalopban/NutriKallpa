'use server';

import nodemailer from 'nodemailer';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/password-utils';
import { createPostgrestClient } from '@/lib/postgrest';
import { createSupabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, recordAttempt, formatRetryTime } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { setServerSession, clearServerSession, getServerSession } from '@/lib/session-utils';

// Schemas
const emailSchema = z.string().email({ message: "Email inválido" });
const codeSchema = z.string().length(6, { message: "El código debe tener 6 dígitos" });
const passwordSchema = z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" });

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(1, { message: "La contraseña es requerida" }),
});

const registerSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre es muy corto" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
  invitationCode: z.string().min(1, { message: "Código de invitación requerido" }),
});

// User type for database
interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  nombre: string;
  rol: string;
  especialidad?: string;
  cmp?: string;
  telefono?: string;
  bio?: string;
  photo_url?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// SECURE LOGIN ACTION - WITH RATE LIMITING
// ============================================================================
export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // 0. CHECK RATE LIMIT FIRST
  const rateCheck = checkRateLimit('login', normalizedEmail);
  if (rateCheck.isLimited) {
    logger.warn('Login blocked by rate limit', { action: 'login', userId: normalizedEmail.slice(0, 5) + '...' });
    return {
      success: false,
      error: `Demasiados intentos. Intenta de nuevo en ${formatRetryTime(rateCheck.retryAfterMs)}.`
    };
  }

  // 1. Validate input
  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    recordAttempt('login', normalizedEmail, false);
    return { success: false, error: "Credenciales inválidas" };
  }

  try {
    const client = createPostgrestClient();

    // 2. Look up user by email (NEVER reveal if user exists or not)
    const { data: users, error } = await client
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1);

    if (error) {
      logger.error('Database error during login', { action: 'login' }, error as Error);
      return { success: false, error: "Error del servidor. Intenta más tarde." };
    }

    const user = users?.[0] as DBUser | undefined;

    // 3. If user doesn't exist, return GENERIC error (prevent email enumeration)
    if (!user) {
      recordAttempt('login', normalizedEmail, false);
      // Add small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: false, error: "Credenciales inválidas" };
    }

    // 4. THE CRITICAL CHECK: Verify password with bcrypt
    const passwordsMatch = await verifyPassword(password, user.password_hash);

    // 5. STRICT CONDITIONAL: Only proceed if password matches
    if (!passwordsMatch) {
      recordAttempt('login', normalizedEmail, false);
      logger.auth.loginAttempt(normalizedEmail, false);
      return { success: false, error: "Credenciales inválidas" };
    }

    // 6. SUCCESS: Record successful attempt (clears rate limit)
    recordAttempt('login', normalizedEmail, true);
    logger.auth.loginAttempt(normalizedEmail, true);

    // 7. Set server-side session
    await setServerSession(user.id);

    // 8. Return user data (without password hash)
    const { password_hash: _, ...safeUser } = user;

    return {
      success: true,
      user: {
        id: safeUser.id,
        email: safeUser.email,
        nombre: safeUser.nombre,
        rol: safeUser.rol as 'admin' | 'usuario',
        especialidad: safeUser.especialidad,
        cmp: safeUser.cmp,
        telefono: safeUser.telefono,
        bio: safeUser.bio,
        photoUrl: safeUser.photo_url,
        clinicName: safeUser.clinic_name,
        clinicAddress: safeUser.clinic_address,
        clinicPhone: safeUser.clinic_phone,
        createdAt: safeUser.created_at,
      }
    };

  } catch (error) {
    logger.error('Unexpected error during login', { action: 'login' }, error as Error);
    return { success: false, error: "Error del servidor. Intenta más tarde." };
  }
}

// ============================================================================
// SECURE REGISTER ACTION
// ============================================================================
export async function registerUser(data: {
  nombre: string;
  email: string;
  password: string;
  invitationCode: string;
}) {
  // 1. Validate input
  const validation = registerSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    const client = createPostgrestClient();

    // 2. Check if email already exists
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase().trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "Este correo ya está registrado" };
    }

    // 3. Validate invitation code
    const { data: invitation } = await client
      .from('invitation_codes')
      .select('*')
      .eq('code', data.invitationCode.toUpperCase())
      .eq('status', 'active')
      .limit(1);

    if (!invitation || invitation.length === 0) {
      return { success: false, error: "Código de invitación inválido o ya utilizado" };
    }

    const inviteData = invitation[0] as { code: string; rol: string };

    // 4. Hash password with bcrypt
    const passwordHash = await hashPassword(data.password);

    // 5. Create user in database
    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        email: data.email.toLowerCase().trim(),
        password_hash: passwordHash,
        nombre: data.nombre,
        rol: inviteData.rol || 'usuario',
        especialidad: 'Nutricionista General',
      })
      .select()
      .single();

    if (createError) {
      console.error('[REGISTER] Create error:', createError);
      return { success: false, error: "Error al crear la cuenta" };
    }

    // 6. Mark invitation code as used
    await client
      .from('invitation_codes')
      .update({ status: 'used', used_by: data.email })
      .eq('code', data.invitationCode.toUpperCase());

    // 7. Return success with user data
    const user = newUser as DBUser;
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol as 'admin' | 'usuario',
        especialidad: user.especialidad,
      }
    };

  } catch (error) {
    console.error('[REGISTER] Unexpected error:', error);
    return { success: false, error: "Error del servidor. Intenta más tarde." };
  }
}

// ============================================================================
// GOOGLE OAUTH REGISTRATION
// ============================================================================
export async function registerGoogleUser(data: {
  nombre: string;
  email: string;
  photoUrl?: string;
  invitationCode: string;
}) {
  // Validate invitation code
  const codeValidation = z.string().min(1).safeParse(data.invitationCode);
  if (!codeValidation.success) {
    return { success: false, error: "Código de invitación requerido" };
  }

  try {
    const supabase = createSupabaseAdmin();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Este correo ya está registrado" };
    }

    // Validate invitation code
    const { data: invitation } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', data.invitationCode.toUpperCase())
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!invitation) {
      return { success: false, error: "Código de invitación inválido o ya utilizado" };
    }

    const inviteData = invitation as { code: string; rol: string };

    // Create user in database (no password hash for OAuth users)
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: data.email.toLowerCase().trim(),
        password_hash: 'GOOGLE_OAUTH_USER', // Marker for OAuth users
        nombre: data.nombre,
        rol: inviteData.rol || 'usuario',
        especialidad: 'Nutricionista General',
        photo_url: data.photoUrl,
      })
      .select()
      .single();

    if (createError) {
      console.error('[REGISTER_GOOGLE] Create error:', createError);
      return { success: false, error: "Error al crear la cuenta" };
    }

    // Mark invitation code as used
    await supabase
      .from('invitation_codes')
      .update({ status: 'used', used_by: data.email })
      .eq('code', data.invitationCode.toUpperCase());

    // Return success with user data
    const user = newUser as DBUser;
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol as 'admin' | 'usuario',
        especialidad: user.especialidad,
        photoUrl: user.photo_url,
      }
    };

  } catch (error: any) {
    console.error('[REGISTER_GOOGLE] Unexpected error:', error);
    // Return the actual error for debugging
    return { success: false, error: error.message || "Error del servidor. Intenta más tarde." };
  }
}

// ============================================================================
// PASSWORD RECOVERY ACTIONS (SECURITY FIX: Store codes in DB + Rate Limit)
// ============================================================================

/**
 * Send recovery code - now stores code in database with 15min expiration
 * Rate limited to 3 attempts per hour
 */
export async function sendRecoveryCode(email: string) {
  // 1. Validar el email
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    return { success: false, message: "Formato de correo inválido" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1.5 CHECK RATE LIMIT
  const rateCheck = checkRateLimit('recovery', normalizedEmail);
  if (rateCheck.isLimited) {
    logger.warn('Recovery blocked by rate limit', { action: 'recovery', userId: normalizedEmail.slice(0, 5) + '...' });
    return {
      success: false,
      message: `Demasiados intentos. Intenta de nuevo en ${formatRetryTime(rateCheck.retryAfterMs)}.`
    };
  }

  const supabase = createSupabaseAdmin();

  // 2. Verificar si el usuario existe
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .limit(1);

    if (error) {
      logger.error('Database error during recovery', { action: 'recovery' }, error as Error);
      return { success: false, message: "Error al verificar el correo. Intenta más tarde." };
    }

    if (!users || users.length === 0) {
      // SECURITY: Don't reveal if email exists - return generic message
      console.log(`[RECOVERY] Email not found: ${email}`);
      return { success: false, message: "No encontramos una cuenta registrada con este correo electrónico" };
    }

    const userId = users[0].id;
    console.log(`[RECOVERY] User found: ${users[0].email}`);

    // 3. Generar código de recuperación (6 dígitos)
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. SECURITY FIX: Guardar código en base de datos con expiración de 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { error: updateError } = await supabase
      .from('users')
      .update({
        recovery_code: recoveryCode,
        recovery_code_expires: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[RECOVERY] Failed to store recovery code:', updateError);
      return { success: false, message: "Error al generar código. Intenta más tarde." };
    }

    // 5. Configurar transporte de Nodemailer (Gmail)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn("⚠️ GMAIL_USER o GMAIL_APP_PASSWORD no configurados. Simulando envío.");
      console.log(`[DEV MODE] Código para ${email}: ${recoveryCode}`);
      return {
        success: true,
        message: "Código enviado correctamente (Simulado: Revisa la consola del servidor)"
      };
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    // 6. Enviar correo
    await transporter.sendMail({
      from: `"Soporte ComVida" <${gmailUser}>`,
      to: email,
      subject: "Código de recuperación de contraseña - ComVida",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6cba00; margin: 0;">ComVida</h1>
            <p style="color: #666; font-size: 14px;">Nutrición Profesional Simplificada</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="font-size: 16px; color: #333;">Hola,</p>
            <p style="font-size: 16px; color: #333;">Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
            
            <div style="margin: 30px 0;">
              <span style="display: inline-block; background-color: #ff8508; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; letter-spacing: 5px; border-radius: 5px;">
                ${recoveryCode}
              </span>
            </div>
            
            <p style="font-size: 14px; color: #666;">Este código es válido por 15 minutos.</p>
            <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} ComVida. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    });

    console.log(`[SUCCESS] Correo enviado a ${email}`);
    return { success: true, message: "Código enviado correctamente. Revisa tu bandeja de entrada." };

  } catch (error) {
    console.error("[RECOVERY] Error:", error);
    return { success: false, message: "Error al enviar el correo. Intenta nuevamente más tarde." };
  }
}

/**
 * Verify recovery code - SECURITY FIX: Now validates against stored code in DB
 */
export async function verifyRecoveryCode(email: string, code: string) {
  // Validar formato
  const emailResult = emailSchema.safeParse(email);
  const codeResult = codeSchema.safeParse(code);

  if (!emailResult.success || !codeResult.success) {
    return { success: false, message: "Datos inválidos" };
  }

  try {
    const supabase = createSupabaseAdmin();

    // SECURITY FIX: Verify code against database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, recovery_code, recovery_code_expires')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      console.warn('[VERIFY_CODE] User not found:', email);
      return { success: false, message: "Código inválido o expirado" };
    }

    // Check if code matches
    if (user.recovery_code !== code) {
      console.warn('[VERIFY_CODE] Code mismatch for:', email);
      return { success: false, message: "Código inválido o expirado" };
    }

    // Check if code is expired
    if (user.recovery_code_expires && new Date(user.recovery_code_expires) < new Date()) {
      console.warn('[VERIFY_CODE] Code expired for:', email);
      // Clear expired code
      await supabase
        .from('users')
        .update({ recovery_code: null, recovery_code_expires: null })
        .eq('id', user.id);
      return { success: false, message: "El código ha expirado. Solicita uno nuevo." };
    }

    console.log(`[SUCCESS] Código verificado para ${email}`);
    return { success: true, message: "Código verificado" };

  } catch (error) {
    console.error('[VERIFY_CODE] Error:', error);
    return { success: false, message: "Error al verificar el código" };
  }
}

/**
 * Reset password - SECURITY FIX: Clears recovery code after use
 */
export async function resetPassword(email: string, newPassword: string) {
  const result = passwordSchema.safeParse(newPassword);
  if (!result.success) {
    return { success: false, message: result.error.errors[0].message };
  }

  try {
    const supabase = createSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update password AND clear recovery code (prevent code reuse)
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        recovery_code: null,
        recovery_code_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail);

    if (error) {
      console.error('[RESET_PASSWORD] Error:', error);
      return { success: false, message: "Error al actualizar la contraseña" };
    }

    console.log(`[SUCCESS] Contraseña actualizada para ${email}`);
    return { success: true, message: "Contraseña actualizada exitosamente" };
  } catch (error) {
    console.error('[RESET_PASSWORD] Unexpected error:', error);
    return { success: false, message: "Error del servidor" };
  }
}

// ============================================================================
// ADMIN ACTIONS - User Management (with role verification)
// ============================================================================

/**
 * Get all users from the database (admin only)
 * @param callerUserId - The ID of the user making the request (for role verification)
 */
export async function getAllUsers(callerUserId?: string) {
  try {
    const client = createPostgrestClient();

    // SECURITY FIX: Verify caller is admin before returning user list
    if (callerUserId) {
      const { data: caller } = await client
        .from('users')
        .select('rol')
        .eq('id', callerUserId)
        .single();

      if (!caller || caller.rol !== 'admin') {
        console.warn(`[GET_USERS] Non-admin user ${callerUserId} attempted to access user list`);
        return { success: false, error: "No autorizado - Se requiere rol de administrador", users: [] };
      }
    }

    const { data: users, error } = await client
      .from('users')
      .select('id, email, nombre, rol, especialidad, cmp, telefono, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_USERS] Error:', error);
      return { success: false, error: "Error al obtener usuarios", users: [] };
    }

    return { success: true, users: users || [] };
  } catch (error) {
    console.error('[GET_USERS] Unexpected error:', error);
    return { success: false, error: "Error del servidor", users: [] };
  }
}

/**
 * Delete a user from the database (admin only)
 * @param userId - ID of user to delete
 * @param adminEmail - Email of the admin making the request
 * @param callerUserId - ID of the user making the request (for role verification)
 */
export async function deleteUser(userId: string, adminEmail: string, callerUserId?: string) {
  if (!userId) {
    return { success: false, error: "ID de usuario requerido" };
  }

  try {
    const client = createPostgrestClient();

    // SECURITY FIX: Verify caller is admin before allowing deletion
    if (callerUserId) {
      const { data: caller } = await client
        .from('users')
        .select('rol')
        .eq('id', callerUserId)
        .single();

      if (!caller || caller.rol !== 'admin') {
        console.warn(`[DELETE_USER] Non-admin user ${callerUserId} attempted to delete user ${userId}`);
        return { success: false, error: "No autorizado - Se requiere rol de administrador" };
      }
    }

    // Check if the user exists and is not the current admin
    const { data: userToDelete } = await client
      .from('users')
      .select('email, rol')
      .eq('id', userId)
      .single();

    if (!userToDelete) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Prevent deleting yourself
    if (userToDelete.email === adminEmail) {
      return { success: false, error: "No puedes eliminar tu propia cuenta" };
    }

    // Prevent deleting other admins (optional extra security)
    if (userToDelete.rol === 'admin') {
      return { success: false, error: "No se puede eliminar a otro administrador" };
    }

    // Delete the user
    const { error } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('[DELETE_USER] Error:', error);
      return { success: false, error: "Error al eliminar usuario" };
    }

    console.log(`[SUCCESS] Usuario ${userToDelete.email} eliminado por admin`);
    return { success: true, message: "Usuario eliminado correctamente" };
  } catch (error) {
    console.error('[DELETE_USER] Unexpected error:', error);
    return { success: false, error: "Error del servidor" };
  }
}

// ============================================================================
// INVITATION CODE MANAGEMENT (Supabase)
// ============================================================================

/**
 * Get all invitation codes from Supabase
 */
export async function getInvitationCodesFromDB() {
  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_INVITATION_CODES] Error:', error);
      return { success: false, error: "Error al obtener códigos", codes: [] };
    }

    return { success: true, codes: data || [] };
  } catch (error) {
    console.error('[GET_INVITATION_CODES] Unexpected error:', error);
    return { success: false, error: "Error del servidor", codes: [] };
  }
}

/**
 * Create a new invitation code in Supabase
 */
export async function createInvitationCode(code: string, rol: string = 'usuario') {
  try {
    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('invitation_codes')
      .insert({
        code: code.toUpperCase(),
        rol: rol,
        status: 'active',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[CREATE_INVITATION_CODE] Error:', error);
      return { success: false, error: "Error al crear código" };
    }

    return { success: true, message: "Código creado correctamente" };
  } catch (error) {
    console.error('[CREATE_INVITATION_CODE] Unexpected error:', error);
    return { success: false, error: "Error del servidor" };
  }
}

/**
 * Delete an invitation code from Supabase
 */
export async function deleteInvitationCodeFromDB(code: string) {
  try {
    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('code', code.toUpperCase());

    if (error) {
      console.error('[DELETE_INVITATION_CODE] Error:', error);
      return { success: false, error: "Error al eliminar código" };
    }

    return { success: true, message: "Código eliminado correctamente" };
  } catch (error) {
    console.error('[DELETE_INVITATION_CODE] Unexpected error:', error);
    return { success: false, error: "Error del servidor" };
  }
}

// ============================================================================
// PROFILE IMAGE & USER UPDATE
// ============================================================================

/**
 * Upload a profile image to Supabase Storage and update user's photo_url
 */
export async function uploadProfileImage(userId: string, base64Image: string) {
  try {
    const supabase = createSupabaseAdmin();

    // Extract the base64 data (remove data:image/...;base64, prefix)
    const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: "Formato de imagen inválido" };
    }

    const extension = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const fileName = `${userId}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('[UPLOAD_IMAGE] Storage error:', uploadError);
      return { success: false, error: `Error al subir: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update user's photo_url in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[UPLOAD_IMAGE] DB update error:', updateError);
      return { success: false, error: "Error al actualizar perfil" };
    }

    return { success: true, photoUrl: publicUrl };
  } catch (error) {
    console.error('[UPLOAD_IMAGE] Unexpected error:', error);
    return { success: false, error: "Error del servidor" };
  }
}

/**
 * Update user profile data in Supabase
 * SECURITY: Validates that the caller can only update their own profile
 */
export async function updateUserProfile(userId: string, data: {
  nombre?: string;
  especialidad?: string;
  cmp?: string;
  telefono?: string;
  bio?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}) {
  try {
    // SECURITY FIX: Validate session and ensure user can only update their own profile
    const sessionUserId = await getServerSession();
    if (!sessionUserId) {
      logger.warn('updateUserProfile called without valid session');
      return { success: false, error: "No autorizado - sesión inválida" };
    }

    // SECURITY FIX: Users can only update their own profile
    if (sessionUserId !== userId) {
      logger.warn('Unauthorized profile update attempt', {
        callerUserId: sessionUserId.slice(0, 8) + '...',
        targetUserId: userId.slice(0, 8) + '...'
      });
      return { success: false, error: "No autorizado - solo puedes editar tu propio perfil" };
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('users')
      .update({
        nombre: data.nombre,
        especialidad: data.especialidad,
        cmp: data.cmp,
        telefono: data.telefono,
        bio: data.bio,
        clinic_name: data.clinicName,
        clinic_address: data.clinicAddress,
        clinic_phone: data.clinicPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Error updating profile', { action: 'updateUserProfile' }, error as Error);
      return { success: false, error: "Error al actualizar perfil" };
    }

    logger.info('Profile updated', { action: 'updateUserProfile', userId: userId.slice(0, 8) + '...' });
    return { success: true, message: "Perfil actualizado correctamente" };
  } catch (error) {
    logger.error('Unexpected error in updateUserProfile', { action: 'updateUserProfile' }, error as Error);
    return { success: false, error: "Error del servidor" };
  }
}
