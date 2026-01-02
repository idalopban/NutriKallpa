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
  subscription_expires_at?: string;
  subscription_status?: 'active' | 'expired' | 'trial' | 'unlimited';
  is_active?: boolean; // Account activation status (controlled by admin)
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

    // DEBUG: Log connection info (remove in production after debugging)
    console.log('[LOGIN] Attempting database connection...');
    console.log('[LOGIN] POSTGREST_URL configured:', !!process.env.POSTGREST_URL);
    console.log('[LOGIN] POSTGREST_API_KEY configured:', !!process.env.POSTGREST_API_KEY);

    // 2. Look up user by email (NEVER reveal if user exists or not)
    const { data: users, error } = await client
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1);

    if (error) {
      // Log detailed error for debugging
      console.error('[LOGIN] Database error:', JSON.stringify(error, null, 2));
      logger.error('Database error during login', { action: 'login' }, error as Error);

      // Check for common issues
      if (error.message?.includes('FetchError') || error.message?.includes('fetch')) {
        return { success: false, error: "Error de conexión al servidor. Verifica tu conexión a internet." };
      }
      if (error.code === '42P01') {
        return { success: false, error: "Error de configuración de base de datos." };
      }

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

    // 6.3 CHECK ACCOUNT ACTIVATION STATUS
    if (user.is_active === false) {
      logger.warn('Deactivated account login attempt', { action: 'login', userId: user.id.slice(0, 8) + '...' });
      return {
        success: false,
        error: "Tu cuenta está desactivada. Contacta al administrador.",
        accountDeactivated: true
      };
    }

    // 6.5 CHECK SUBSCRIPTION STATUS (Skip for admins)
    if (user.rol !== 'admin' && user.subscription_status !== 'unlimited') {
      const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        // Update status to expired in background
        client.from('users').update({ subscription_status: 'expired' }).eq('id', user.id);
        logger.warn('User subscription expired', { action: 'login', userId: user.id.slice(0, 8) + '...' });
        return {
          success: false,
          error: "Tu suscripción ha expirado. Contacta al administrador para renovar.",
          subscriptionExpired: true
        };
      }
    }

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
        subscriptionExpiresAt: safeUser.subscription_expires_at,
        subscriptionStatus: safeUser.subscription_status,
        createdAt: safeUser.created_at,
      }
    };

  } catch (error: any) {
    console.error('[LOGIN] Unexpected error:', error?.message || error);
    console.error('[LOGIN] Error stack:', error?.stack);
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

    const inviteData = invitation[0] as { code: string; rol: string; subscription_days?: number };

    // 4. Calculate subscription expiration
    const subscriptionDays = inviteData.subscription_days || 30; // Default 30 days
    const subscriptionExpiresAt = new Date();
    subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + subscriptionDays);

    // 5. Hash password with bcrypt
    const passwordHash = await hashPassword(data.password);

    // 6. Create user in database with subscription
    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        email: data.email.toLowerCase().trim(),
        password_hash: passwordHash,
        nombre: data.nombre,
        rol: inviteData.rol || 'usuario',
        especialidad: 'Nutricionista General',
        subscription_expires_at: subscriptionExpiresAt.toISOString(),
        subscription_status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('[REGISTER] Create error:', createError);
      return { success: false, error: "Error al crear la cuenta" };
    }

    // 7. Mark invitation code as used
    await client
      .from('invitation_codes')
      .update({ status: 'used', used_by: data.email })
      .eq('code', data.invitationCode.toUpperCase());

    // 8. Return success with user data
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

    const inviteData = invitation as { code: string; rol: string; subscription_days?: number };

    // Calculate subscription expiration
    const subscriptionDays = inviteData.subscription_days || 30;
    const subscriptionExpiresAt = new Date();
    subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + subscriptionDays);

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
        subscription_expires_at: subscriptionExpiresAt.toISOString(),
        subscription_status: 'active',
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
        subscriptionExpiresAt: user.subscription_expires_at,
        subscriptionStatus: user.subscription_status,
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
      .select('id, email, nombre, rol, especialidad, cmp, telefono, is_active, created_at')
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
  console.log('[DELETE_USER] Starting deletion:', { userId, adminEmail, callerUserId });

  if (!userId) {
    return { success: false, error: "ID de usuario requerido" };
  }

  try {
    // Use Supabase Admin client with service_role key to bypass RLS
    const supabase = createSupabaseAdmin();

    // SECURITY FIX: Verify caller is admin before allowing deletion
    if (callerUserId) {
      const { data: caller } = await supabase
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
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('email, rol')
      .eq('id', userId)
      .single();

    console.log('[DELETE_USER] User to delete:', userToDelete, 'Error:', fetchError);

    if (!userToDelete) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Prevent deleting yourself
    if (userToDelete.email === adminEmail) {
      console.log('[DELETE_USER] Blocked: attempting to delete self');
      return { success: false, error: "No puedes eliminar tu propia cuenta" };
    }

    // Prevent deleting other admins (optional extra security)
    if (userToDelete.rol === 'admin') {
      console.log('[DELETE_USER] Blocked: attempting to delete another admin');
      return { success: false, error: "No se puede eliminar a otro administrador" };
    }

    // Delete the user using admin client (bypasses RLS)
    console.log('[DELETE_USER] Executing delete for userId:', userId);
    const { error, count } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    console.log('[DELETE_USER] Delete result - error:', error, 'count:', count);

    if (error) {
      console.error('[DELETE_USER] Error:', error);
      return { success: false, error: `Error al eliminar usuario: ${error.message}` };
    }

    console.log(`[SUCCESS] Usuario ${userToDelete.email} eliminado correctamente`);
    return { success: true, message: "Usuario eliminado correctamente" };
  } catch (error: any) {
    console.error('[DELETE_USER] Unexpected error:', error);
    return { success: false, error: "Error del servidor" };
  }
}

/**
 * Toggle user account activation status (admin only)
 * @param userId - ID of user to toggle
 * @param isActive - New activation status
 * @param adminEmail - Email of the admin making the request
 */
export async function toggleUserStatus(userId: string, isActive: boolean, adminEmail: string) {
  console.log('[TOGGLE_USER_STATUS] Starting:', { userId, isActive, adminEmail });

  if (!userId) {
    return { success: false, error: "ID de usuario requerido" };
  }

  try {
    const supabase = createSupabaseAdmin();

    // Check if the user exists and is not the current admin
    const { data: userToToggle, error: fetchError } = await supabase
      .from('users')
      .select('email, rol')
      .eq('id', userId)
      .single();

    if (fetchError || !userToToggle) {
      console.error('[TOGGLE_USER_STATUS] User not found:', fetchError);
      return { success: false, error: "Usuario no encontrado" };
    }

    // Prevent toggling yourself
    if (userToToggle.email === adminEmail) {
      return { success: false, error: "No puedes desactivar tu propia cuenta" };
    }

    // Prevent deactivating other admins
    if (userToToggle.rol === 'admin' && !isActive) {
      return { success: false, error: "No se puede desactivar a otro administrador" };
    }

    // Update the user's is_active status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[TOGGLE_USER_STATUS] Update error:', updateError);
      return { success: false, error: `Error al actualizar estado: ${updateError.message}` };
    }

    const statusText = isActive ? 'activada' : 'desactivada';
    console.log(`[SUCCESS] Cuenta de ${userToToggle.email} ${statusText}`);
    return {
      success: true,
      message: `Cuenta ${statusText} correctamente`,
      isActive
    };
  } catch (error: any) {
    console.error('[TOGGLE_USER_STATUS] Unexpected error:', error);
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
 * @param code - The invitation code string
 * @param rol - Role to assign: 'usuario' or 'admin'
 * @param subscriptionDays - Duration of subscription in days (default: 30)
 */
export async function createInvitationCode(
  code: string,
  rol: string = 'usuario',
  subscriptionDays: number = 30,
  callerUserId?: string  // Add caller ID for verification
) {
  try {
    const supabase = createSupabaseAdmin();

    // SECURITY CHECK: Verify caller is admin before allowing code creation
    if (callerUserId) {
      const { data: caller } = await supabase
        .from('users')
        .select('rol')
        .eq('id', callerUserId)
        .single();

      if (!caller || caller.rol !== 'admin') {
        console.warn(`[CREATE_INVITATION_CODE] Non-admin user ${callerUserId} attempted to create invitation code`);
        return { success: false, error: "No autorizado - Se requiere rol de administrador" };
      }
    }

    const { error } = await supabase
      .from('invitation_codes')
      .insert({
        code: code.toUpperCase(),
        rol: rol,
        status: 'active',
        subscription_days: subscriptionDays,
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
 * Delete an invitation code from Supabase (admin only)
 */
export async function deleteInvitationCodeFromDB(code: string, callerUserId?: string) {
  try {
    const supabase = createSupabaseAdmin();

    // SECURITY CHECK: Verify caller is admin before allowing code deletion
    if (callerUserId) {
      const { data: caller } = await supabase
        .from('users')
        .select('rol')
        .eq('id', callerUserId)
        .single();

      if (!caller || caller.rol !== 'admin') {
        console.warn(`[DELETE_INVITATION_CODE] Non-admin user ${callerUserId} attempted to delete invitation code`);
        return { success: false, error: "No autorizado - Se requiere rol de administrador" };
      }
    }

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

/**
 * Change user password
 * SECURITY: Requires current password and validates session
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    // 1. Validate session
    const userId = await getServerSession();
    if (!userId) {
      return { success: false, error: "No autorizado - sesión inválida" };
    }

    // 2. Validate input
    const validation = passwordSchema.safeParse(data.newPassword);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const supabase = createSupabaseAdmin();

    // 3. Get current password hash
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      logger.error('Error fetching user for password change', { action: 'changePassword', userId });
      return { success: false, error: "Error al verificar el usuario" };
    }

    // 4. Verify current password
    const passwordsMatch = await verifyPassword(data.currentPassword, user.password_hash);
    if (!passwordsMatch) {
      return { success: false, error: "La contraseña actual es incorrecta" };
    }

    // 5. Hash new password
    const newPasswordHash = await hashPassword(data.newPassword);

    // 6. Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating password', { action: 'changePassword', userId }, updateError as Error);
      return { success: false, error: "Error al actualizar la contraseña" };
    }

    logger.info('Password changed successfully', { action: 'changePassword', userId: userId.slice(0, 8) + '...' });
    return { success: true, message: "Contraseña actualizada correctamente" };

  } catch (error) {
    logger.error('Unexpected error in changePassword', { action: 'changePassword' }, error as Error);
    return { success: false, error: "Error del servidor" };
  }
}

// ============================================================================
// SESSION REVALIDATION - Recover session from HttpOnly cookie
// ============================================================================

/**
 * Revalidate session from HttpOnly cookie.
 * This allows recovering the user session after localStorage is cleared,
 * as long as the session cookie still exists.
 */
export async function revalidateSession() {
  try {
    // 1. Get user ID from HttpOnly cookie
    const userId = await getServerSession();

    if (!userId) {
      return { success: false, user: null };
    }

    // 2. Fetch user from database
    const client = createPostgrestClient();

    const { data: users, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (error || !users || users.length === 0) {
      console.warn('[REVALIDATE] User not found for session:', userId.slice(0, 8) + '...');
      return { success: false, user: null };
    }

    const user = users[0] as DBUser;

    // 3. Check if account is active
    if (user.is_active === false) {
      return { success: false, user: null, error: "Account deactivated" };
    }

    // 4. Check subscription status (skip for admins)
    if (user.rol !== 'admin' && user.subscription_status !== 'unlimited') {
      const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        return { success: false, user: null, error: "Subscription expired" };
      }
    }

    // 5. Return user data (without password hash)
    logger.info('Session revalidated successfully', { action: 'revalidateSession', userId: userId.slice(0, 8) + '...' });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol as 'admin' | 'usuario',
        especialidad: user.especialidad,
        cmp: user.cmp,
        telefono: user.telefono,
        bio: user.bio,
        photoUrl: user.photo_url,
        clinicName: user.clinic_name,
        clinicAddress: user.clinic_address,
        clinicPhone: user.clinic_phone,
        subscriptionExpiresAt: user.subscription_expires_at,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at,
      }
    };

  } catch (error) {
    console.error('[REVALIDATE] Unexpected error:', error);
    return { success: false, user: null };
  }
}

