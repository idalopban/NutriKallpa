/**
 * Supabase Storage Service
 * 
 * Provides async CRUD operations for all entities using Supabase as the backend.
 * Falls back to localStorage when offline or on error.
 */

import { createBrowserClient } from './supabase';
import type { User, Paciente, MedidasAntropometricas, Cita, InvitationCode } from '@/types';
import type { DailyPlan } from './diet-generator';

// Type for saved diet plans (from diet-service)
export interface SavedPlan {
    id: string;
    userId: string;
    patientId?: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'archived';
    planData: DailyPlan[];
    createdAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSupabase() {
    if (typeof window === 'undefined') return null;
    try {
        return createBrowserClient();
    } catch {
        return null;
    }
}

async function getCurrentUserId(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

function getNumericValue(v: any): number | null {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && 'final' in v) return v.final;
    return null;
}

// ============================================================================
// PACIENTES
// ============================================================================

export async function getPacientesFromSupabase(usuarioId?: string): Promise<Paciente[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const userId = usuarioId || await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pacientes from Supabase:', error);
        return [];
    }

    // Transform from DB format to app format
    return (data || []).map(row => ({
        id: row.id,
        usuarioId: row.usuario_id,
        datosPersonales: {
            nombre: row.nombre,
            apellido: row.apellido,
            email: row.email || '',
            telefono: row.telefono || undefined,
            fechaNacimiento: row.fecha_nacimiento,
            sexo: row.sexo,
            documentoIdentidad: row.documento_identidad,
            avatarUrl: row.avatar_url || undefined,
        },
        historiaClinica: row.historia_clinica || {},
        preferencias: row.preferencias || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

export async function getPacienteByIdFromSupabase(id: string): Promise<Paciente | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching paciente by ID:', error);
        return null;
    }

    return {
        id: data.id,
        usuarioId: data.usuario_id,
        datosPersonales: {
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email || '',
            telefono: data.telefono || undefined,
            fechaNacimiento: data.fecha_nacimiento,
            sexo: data.sexo,
            documentoIdentidad: data.documento_identidad,
            avatarUrl: data.avatar_url || undefined,
        },
        historiaClinica: data.historia_clinica || {},
        preferencias: data.preferencias || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function savePacienteToSupabase(paciente: Paciente): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const userId = await getCurrentUserId();
    if (!userId) return false;

    const dbData = {
        id: paciente.id,
        usuario_id: userId,
        nombre: paciente.datosPersonales.nombre,
        apellido: paciente.datosPersonales.apellido,
        email: paciente.datosPersonales.email,
        telefono: paciente.datosPersonales.telefono || null,
        fecha_nacimiento: paciente.datosPersonales.fechaNacimiento,
        sexo: paciente.datosPersonales.sexo,
        documento_identidad: paciente.datosPersonales.documentoIdentidad,
        avatar_url: paciente.datosPersonales.avatarUrl || null,
        historia_clinica: paciente.historiaClinica || {},
        preferencias: paciente.preferencias || {},
    };

    const { error } = await supabase
        .from('pacientes')
        .upsert(dbData, { onConflict: 'id' });

    if (error) {
        console.error('Error saving paciente to Supabase:', error);
        return false;
    }

    return true;
}

export async function deletePacienteFromSupabase(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting paciente from Supabase:', error);
        return false;
    }

    return true;
}

// ============================================================================
// MEDIDAS ANTROPOMETRICAS
// ============================================================================

export async function getMedidasFromSupabase(pacienteId: string): Promise<MedidasAntropometricas[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('anthropometry_records')
        .select('*')
        .eq('patient_id', pacienteId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching medidas from Supabase:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        pacienteId: row.patient_id,
        fecha: row.created_at,
        peso: row.weight,
        talla: row.height,
        edad: row.age,
        sexo: 'masculino', // This should be stored or derived
        tipoPaciente: row.tipo_paciente || (row.age < 18 ? 'pediatrico' : 'adulto'),
        headCircumference: row.head_circumference || undefined,
        pliegues: {
            triceps: row.triceps,
            subscapular: row.subscapular,
            biceps: row.biceps,
            iliac_crest: row.iliac_crest,
            supraspinale: row.supraspinale,
            abdominal: row.abdominal,
            thigh: row.thigh,
            calf: row.calf,
        },
        perimetros: {
            brazoRelax: row.arm_relaxed,
            brazoFlex: row.arm_flexed,
            cintura: row.waist,
            cadera: row.hip,
            musloMedio: row.thigh_mid,
            pantorrilla: row.calf_max,
            headCircumference: row.head_circumference || undefined,
        },
        diametros: {
            humero: row.humerus,
            femur: row.femur,
            biacromial: row.biacromial,
            biiliocristal: row.biiliocristal,
            biestiloideo: row.biestiloideo,
        },
        porcentajeGrasa: row.body_fat_percent,
        masaMuscular: row.muscle_mass_kg,
        somatotype: row.somatotype_endo ? {
            endo: row.somatotype_endo,
            meso: row.somatotype_meso,
            ecto: row.somatotype_ecto,
        } : undefined,
        createdAt: row.created_at,
    }));
}

export async function saveMedidasToSupabase(medidas: MedidasAntropometricas): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const dbData = {
        id: medidas.id,
        patient_id: medidas.pacienteId,
        weight: medidas.peso,
        height: medidas.talla,
        age: medidas.edad,
        triceps: getNumericValue(medidas.pliegues?.triceps),
        subscapular: getNumericValue(medidas.pliegues?.subscapular),
        biceps: getNumericValue(medidas.pliegues?.biceps),
        iliac_crest: getNumericValue(medidas.pliegues?.iliac_crest),
        supraspinale: getNumericValue(medidas.pliegues?.supraspinale),
        abdominal: getNumericValue(medidas.pliegues?.abdominal),
        thigh: getNumericValue(medidas.pliegues?.thigh),
        calf: getNumericValue(medidas.pliegues?.calf),
        arm_relaxed: getNumericValue(medidas.perimetros?.brazoRelax || medidas.perimetros?.brazoRelajado),
        arm_flexed: getNumericValue(medidas.perimetros?.brazoFlex),
        waist: getNumericValue(medidas.perimetros?.cintura),
        hip: getNumericValue(medidas.perimetros?.cadera),
        thigh_mid: getNumericValue(medidas.perimetros?.musloMedio),
        calf_max: getNumericValue(medidas.perimetros?.pantorrilla),
        humerus: getNumericValue(medidas.diametros?.humero),
        femur: getNumericValue(medidas.diametros?.femur),
        biacromial: getNumericValue(medidas.diametros?.biacromial),
        biiliocristal: getNumericValue(medidas.diametros?.biiliocristal),
        biestiloideo: getNumericValue(medidas.diametros?.biestiloideo),
        body_fat_percent: getNumericValue(medidas.porcentajeGrasa),
        muscle_mass_kg: getNumericValue(medidas.masaMuscular),
        somatotype_endo: getNumericValue(medidas.somatotype?.endo),
        somatotype_meso: getNumericValue(medidas.somatotype?.meso),
        somatotype_ecto: getNumericValue(medidas.somatotype?.ecto),
        head_circumference: medidas.headCircumference || medidas.perimetros?.headCircumference || null,
        tipo_paciente: medidas.tipoPaciente || 'general',
    };

    const { error } = await supabase
        .from('anthropometry_records')
        .upsert(dbData, { onConflict: 'id' });

    if (error) {
        console.error('Error saving medidas to Supabase:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            data: dbData
        });
        return false;
    }

    return true;
}

export async function deleteMedidaFromSupabase(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('anthropometry_records')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting medida from Supabase:', error);
        return false;
    }

    return true;
}

// ============================================================================
// DIET PLANS
// ============================================================================

export async function getDietPlansFromSupabase(userId?: string, patientId?: string): Promise<SavedPlan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return [];

    let query = supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

    if (patientId) {
        query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching diet plans from Supabase:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        patientId: row.patient_id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status || 'active',
        planData: row.plan_data || [],
        createdAt: row.created_at,
    }));
}

export async function getPatientDietPlansFromSupabase(patientId: string): Promise<SavedPlan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching patient diet plans from Supabase:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        patientId: row.patient_id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status || 'active',
        planData: row.plan_data || [],
        createdAt: row.created_at,
    }));
}

export async function saveDietPlanToSupabase(plan: SavedPlan): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const userId = await getCurrentUserId();
    if (!userId) return false;

    const dbData = {
        id: plan.id,
        user_id: userId,
        patient_id: plan.patientId || null,
        name: plan.name,
        start_date: plan.startDate,
        end_date: plan.endDate,
        status: plan.status,
        plan_data: plan.planData,
    };

    const { error } = await supabase
        .from('diet_plans')
        .upsert(dbData, { onConflict: 'id' });

    if (error) {
        console.error('Error saving diet plan to Supabase:', error);
        return false;
    }

    return true;
}

export async function deleteDietPlanFromSupabase(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('diet_plans')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting diet plan from Supabase:', error);
        return false;
    }

    return true;
}

// ============================================================================
// CITAS (APPOINTMENTS)
// ============================================================================

export async function getCitasFromSupabase(): Promise<Cita[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

    if (error) {
        console.error('Error fetching citas from Supabase:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        pacienteId: row.patient_id,
        fecha: row.fecha,
        hora: row.hora,
        motivo: row.motivo || '',
        estado: row.estado || 'pendiente',
        modalidad: row.modalidad,
        enlaceReunion: row.enlace_reunion,
        categoria: row.categoria,
        notas: row.notas || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

export async function saveCitaToSupabase(cita: Cita): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const userId = await getCurrentUserId();
    if (!userId) return false;

    const dbData = {
        id: cita.id,
        user_id: userId,
        patient_id: cita.pacienteId,
        fecha: cita.fecha,
        hora: cita.hora,
        motivo: cita.motivo,
        estado: cita.estado,
        modalidad: cita.modalidad,
        enlace_reunion: cita.enlaceReunion,
        categoria: cita.categoria,
        notas: cita.notas || null,
    };

    const { error } = await supabase
        .from('citas')
        .upsert(dbData, { onConflict: 'id' });

    if (error) {
        console.error('Error saving cita to Supabase:', error);
        return false;
    }

    return true;
}

export async function deleteCitaFromSupabase(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting cita from Supabase:', error);
        return false;
    }

    return true;
}

// ============================================================================
// USER PROFILES
// ============================================================================

export async function getUserProfileFromSupabase(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        id: data.id,
        email: data.email || '',
        nombre: data.nombre || '',
        rol: data.rol || 'usuario',
        especialidad: data.especialidad,
        cmp: data.cmp,
        telefono: data.telefono,
        bio: data.bio,
        photoUrl: data.photo_url,
        isActive: data.is_active ?? true,
        clinicName: data.clinic_name,
        clinicAddress: data.clinic_address,
        clinicPhone: data.clinic_phone,
        subscriptionExpiresAt: data.subscription_expires_at,
        subscriptionStatus: data.subscription_status || 'trial',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function saveUserProfileToSupabase(user: User): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const dbData = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        especialidad: user.especialidad,
        cmp: user.cmp,
        telefono: user.telefono,
        bio: user.bio,
        photo_url: user.photoUrl,
        is_active: user.isActive ?? true,
        clinic_name: user.clinicName,
        clinic_address: user.clinicAddress,
        clinic_phone: user.clinicPhone,
        subscription_expires_at: user.subscriptionExpiresAt || null,
        subscription_status: user.subscriptionStatus || 'trial',
    };

    const { error } = await supabase
        .from('user_profiles')
        .upsert(dbData, { onConflict: 'id' });

    if (error) {
        // Silencioso: la sincronización con Supabase es opcional
        return false;
    }

    return true;
}

// ============================================================================
// INVITATION CODES
// ============================================================================

export async function getInvitationCodesFromSupabase(): Promise<InvitationCode[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching invitation codes from Supabase:', error);
        return [];
    }

    return (data || []).map(row => ({
        code: row.code,
        rol: row.rol,
        status: row.status,
        subscriptionDays: row.subscription_days || 30,
        createdAt: row.created_at,
        usedBy: row.used_by,
    }));
}

export async function saveInvitationCodeToSupabase(invitation: InvitationCode): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const dbData = {
        code: invitation.code,
        rol: invitation.rol,
        status: invitation.status,
        subscription_days: invitation.subscriptionDays || 30,
        used_by: invitation.usedBy,
    };

    const { error } = await supabase
        .from('invitation_codes')
        .upsert(dbData, { onConflict: 'code' });

    if (error) {
        console.error('Error saving invitation code to Supabase:', error);
        return false;
    }

    return true;
}

export async function validateInvitationCodeFromSupabase(code: string): Promise<InvitationCode | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .eq('status', 'active')
        .single();

    if (error || !data) {
        return null;
    }

    return {
        code: data.code,
        rol: data.rol,
        status: data.status,
        subscriptionDays: data.subscription_days || 30,
        createdAt: data.created_at,
        usedBy: data.used_by,
    };
}

export async function markInvitationCodeAsUsedInSupabase(code: string, email: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('invitation_codes')
        .update({ status: 'used', used_by: email })
        .eq('code', code);

    if (error) {
        console.error('Error marking invitation code as used:', error);
        return false;
    }

    return true;
}

export async function deleteInvitationCodeFromSupabase(code: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('code', code);

    if (error) {
        console.error('Error deleting invitation code from Supabase:', error);
        return false;
    }

    return true;
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

export async function isSupabaseConnected(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return !!user;
    } catch {
        return false;
    }
}
