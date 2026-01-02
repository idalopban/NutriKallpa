/**
 * Unified Storage Service
 * 
 * Provides CRUD operations with localStorage as primary for immediate access
 * and Supabase for cloud sync. Background sync keeps data up to date.
 * 
 * SECURITY: All medical data is encrypted using AES-256 before storing in localStorage.
 */

import type { User, Paciente, MedidasAntropometricas, Dieta, Alimento, Cita, InvitationCode } from "@/types";
import * as supabaseStorage from './supabase-storage';
import { secureStorage, migrateToEncryptedStorage, isEncrypted } from './secure-storage';
import { createPatient, deletePatient as deletePatientAction, getPatientsAction, getPatientServer, getMedidasServer } from "@/actions/patient-actions";
import { getAppointmentsAction } from "@/actions/appointment-actions";
import { saveEvaluation } from "@/actions/anthropometry-actions";

const STORAGE_KEYS = {
  USERS: "nutrikallpa_users_v3",  // v3 = encrypted
  PACIENTES: "nutrikallpa_pacientes_v3",
  MEDIDAS: "nutrikallpa_medidas_v3",
  DIETAS: "nutrikallpa_dietas_v3",
  ALIMENTOS: "nutrikallpa_alimentos_v3",
  CURRENT_USER: "nutrikallpa_user_v3",
  AUTHENTICATED: "nutrikallpa_authenticated_v3",
  CITAS: "nutrikallpa_citas_v3",
  INVITATIONS: "nutrikallpa_invitations_v3",
  LAST_SYNC: "nutrikallpa_last_sync_v3",
} as const;

// Legacy keys for migration
const LEGACY_KEYS = {
  USERS: "nutrikallpa_users_v2",
  PACIENTES: "nutrikallpa_pacientes_v2",
  MEDIDAS: "nutrikallpa_medidas_v2",
  DIETAS: "nutrikallpa_dietas_v2",
  CURRENT_USER: "nutrikallpa_user_v2",
  CITAS: "nutrikallpa_citas_v2",
  INVITATIONS: "nutrikallpa_invitations_v2",
} as const;

// ============================================================================
// MIGRATION: Migrate legacy unencrypted data to encrypted v3
// ============================================================================

let migrationDone = false;

function migrateLegacyData(): void {
  if (typeof window === 'undefined' || migrationDone) return;
  migrationDone = true;

  // Migrate each legacy key to new encrypted format
  Object.entries(LEGACY_KEYS).forEach(([keyName, legacyKey]) => {
    const newKey = STORAGE_KEYS[keyName as keyof typeof STORAGE_KEYS];
    const legacyData = localStorage.getItem(legacyKey);
    const newData = localStorage.getItem(newKey);

    // If legacy data exists and new data doesn't, migrate
    if (legacyData && !newData) {
      try {
        const parsed = JSON.parse(legacyData);
        secureStorage.setItem(newKey, parsed);
        localStorage.removeItem(legacyKey); // Clean up legacy
        console.log(`[Storage] Migrated ${keyName} to encrypted storage`);
      } catch (e) {
        console.error(`[Storage] Migration failed for ${keyName}:`, e);
      }
    }
  });
}

// ============================================================================
// HELPER: Encrypted localStorage functions (synchronous)
// ============================================================================

function getFromLocalStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  // Ensure migration has run
  migrateLegacyData();

  const data = secureStorage.getItem<T[]>(key);
  return data || [];
}

function saveToLocalStorage<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  secureStorage.setItem(key, items);
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

let syncInProgress = false;

export async function syncWithSupabase(userId: string): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    // Sync pacientes from Supabase using secure actions
    const pResult = await getPatientsAction();
    if (pResult.success && pResult.data && pResult.data.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.PACIENTES, pResult.data);
    }

    // Sync citas using secure actions
    const cResult = await getAppointmentsAction();
    if (cResult.success && cResult.data && cResult.data.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.CITAS, cResult.data);
    }

    // Mark sync time
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Sync with Supabase failed:', error);
  } finally {
    syncInProgress = false;
  }
}


// ============================================================================
// USERS (localStorage for session, sync to Supabase)
// ============================================================================

export function getUsers(): User[] {
  return getFromLocalStorage<User>(STORAGE_KEYS.USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index >= 0) users[index] = user;
  else users.push(user);
  saveToLocalStorage(STORAGE_KEYS.USERS, users);

  // Update current user if needed
  try {
    const current = getCurrentUser();
    if (current && current.id === user.id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  } catch (e) {
    // ignore
  }

  // Background sync to Supabase (silencioso si falla)
  supabaseStorage.saveUserProfileToSupabase(user).catch(() => { /* silencioso */ });
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

// ============================================================================
// PACIENTES (sync operations - localStorage first, Supabase in background)
// ============================================================================

export function getPacientes(usuarioId?: string): Paciente[] {
  const pacientes = getFromLocalStorage<Paciente>(STORAGE_KEYS.PACIENTES);
  if (usuarioId) return pacientes.filter((p) => p.usuarioId === usuarioId);
  return pacientes;
}

export function getPacienteById(id: string): Paciente | null {
  const pacientes = getFromLocalStorage<Paciente>(STORAGE_KEYS.PACIENTES);
  return pacientes.find((p) => p.id === id) || null;
}

export async function savePaciente(paciente: Paciente): Promise<boolean> {
  const pacientes = getFromLocalStorage<Paciente>(STORAGE_KEYS.PACIENTES);
  const index = pacientes.findIndex((p) => p.id === paciente.id);
  const now = new Date().toISOString();

  const updatedPaciente = {
    ...paciente,
    updatedAt: now,
    createdAt: index >= 0 ? pacientes[index].createdAt : now
  };

  if (index >= 0) {
    pacientes[index] = updatedPaciente;
  } else {
    pacientes.push(updatedPaciente);
  }

  saveToLocalStorage(STORAGE_KEYS.PACIENTES, pacientes);

  // DBRE FIX: Use Server Action for Atomic Persistence
  // This ensures the write completes even if the user closes the tab
  const result = await createPatient(updatedPaciente);
  return result.success;
}

export function updatePaciente(pacienteActualizado: Paciente): void {
  savePaciente(pacienteActualizado);
}

export async function deletePaciente(id: string): Promise<boolean> {
  // 1. Local Delete
  const pacientes = getFromLocalStorage<Paciente>(STORAGE_KEYS.PACIENTES);
  saveToLocalStorage(STORAGE_KEYS.PACIENTES, pacientes.filter((p) => p.id !== id));

  // Delete related medidas
  const medidas = getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
  saveToLocalStorage(STORAGE_KEYS.MEDIDAS, medidas.filter((m) => m.pacienteId !== id));

  // Delete related dietas
  const dietas = getFromLocalStorage<Dieta>(STORAGE_KEYS.DIETAS);
  saveToLocalStorage(STORAGE_KEYS.DIETAS, dietas.filter((d) => d.pacienteId !== id));

  // Delete related citas
  const citas = getFromLocalStorage<Cita>(STORAGE_KEYS.CITAS);
  saveToLocalStorage(STORAGE_KEYS.CITAS, citas.filter((c) => c.pacienteId !== id));

  const result = await deletePatientAction(id);
  return result.success;
}

// ============================================================================
// MEDIDAS (sync operations)
// ============================================================================

export function getMedidasByPaciente(pacienteId: string): MedidasAntropometricas[] {
  const allMedidas = getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
  return allMedidas.filter((m) => m.pacienteId === pacienteId);
}

export async function saveMedidas(medidas: MedidasAntropometricas): Promise<boolean> {
  const allMedidas = getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
  const index = allMedidas.findIndex((m) => m.id === medidas.id);
  const now = new Date().toISOString();

  const updatedMedidas = {
    ...medidas,
    updatedAt: now,
    createdAt: index >= 0 ? allMedidas[index].createdAt : now
  };

  if (index >= 0) {
    allMedidas[index] = updatedMedidas;
  } else {
    allMedidas.push(updatedMedidas);
  }

  saveToLocalStorage(STORAGE_KEYS.MEDIDAS, allMedidas);

  // DBRE FIX: Use Server Action for Atomic Persistence
  const result = await saveEvaluation(updatedMedidas);
  return result.success;
}

export function getAllMedidas(): MedidasAntropometricas[] {
  return getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
}

export function deleteMedida(id: string): void {
  const allMedidas = getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
  saveToLocalStorage(STORAGE_KEYS.MEDIDAS, allMedidas.filter((m) => m.id !== id));

  // Background sync to Supabase
  supabaseStorage.deleteMedidaFromSupabase(id).catch(console.error);
}

export function deleteAllMedidasByPaciente(pacienteId: string): void {
  const allMedidas = getFromLocalStorage<MedidasAntropometricas>(STORAGE_KEYS.MEDIDAS);
  saveToLocalStorage(STORAGE_KEYS.MEDIDAS, allMedidas.filter((m) => m.pacienteId !== pacienteId));
}

// ============================================================================
// CITAS (sync operations)
// ============================================================================

export function getCitas(): Cita[] {
  return getFromLocalStorage<Cita>(STORAGE_KEYS.CITAS);
}

export async function saveCita(cita: Cita): Promise<boolean> {
  const citas = getFromLocalStorage<Cita>(STORAGE_KEYS.CITAS);
  const index = citas.findIndex((c) => c.id === cita.id);
  if (index >= 0) citas[index] = { ...cita };
  else citas.push(cita);

  citas.sort((a, b) => {
    const dateA = new Date(`${a.fecha}T${a.hora}`);
    const dateB = new Date(`${b.fecha}T${b.hora}`);
    return dateA.getTime() - dateB.getTime();
  });
  saveToLocalStorage(STORAGE_KEYS.CITAS, citas);

  // Background sync to Supabase (ahora esperado)
  return await supabaseStorage.saveCitaToSupabase(cita);
}

export function deleteCita(id: string): void {
  const citas = getFromLocalStorage<Cita>(STORAGE_KEYS.CITAS);
  saveToLocalStorage(STORAGE_KEYS.CITAS, citas.filter((c) => c.id !== id));

  // Background sync to Supabase
  supabaseStorage.deleteCitaFromSupabase(id).catch(console.error);
}

// ============================================================================
// DIETAS (legacy format)
// ============================================================================

export function getDietas(): Dieta[] {
  return getFromLocalStorage<Dieta>(STORAGE_KEYS.DIETAS);
}

export function saveDieta(dieta: Dieta): void {
  const dietas = getDietas();
  const index = dietas.findIndex((d) => d.id === dieta.id);
  if (index >= 0) dietas[index] = { ...dieta, updatedAt: new Date().toISOString() };
  else dietas.push({ ...dieta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveToLocalStorage(STORAGE_KEYS.DIETAS, dietas);
}

// ============================================================================
// ALIMENTOS
// ============================================================================

export function getAlimentos(): Alimento[] {
  return getFromLocalStorage<Alimento>(STORAGE_KEYS.ALIMENTOS);
}

export function saveAlimento(alimento: Alimento): void {
  const alimentos = getAlimentos();
  const index = alimentos.findIndex((a) => a.id === alimento.id);
  if (index >= 0) alimentos[index] = { ...alimento, updatedAt: new Date().toISOString() };
  else alimentos.push({ ...alimento, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveToLocalStorage(STORAGE_KEYS.ALIMENTOS, alimentos);
}

export function initializeMockData(): void {
  // No-op
}

// ============================================================================
// INVITACIONES (sync operations)
// ============================================================================

export function getInvitationCodes(): InvitationCode[] {
  return getFromLocalStorage<InvitationCode>(STORAGE_KEYS.INVITATIONS);
}

export function saveInvitationCode(invitation: InvitationCode): void {
  const codes = getFromLocalStorage<InvitationCode>(STORAGE_KEYS.INVITATIONS);
  const index = codes.findIndex((c) => c.code === invitation.code);
  if (index >= 0) codes[index] = invitation;
  else codes.push(invitation);
  saveToLocalStorage(STORAGE_KEYS.INVITATIONS, codes);

  // Background sync to Supabase
  supabaseStorage.saveInvitationCodeToSupabase(invitation).catch(console.error);
}

export function validateInvitationCode(code: string): InvitationCode | null {
  const codes = getFromLocalStorage<InvitationCode>(STORAGE_KEYS.INVITATIONS);
  return codes.find((c) => c.code === code && c.status === 'active') || null;
}

export async function validateInvitationCodeAsync(code: string): Promise<InvitationCode | null> {
  // Try Supabase first for validation
  const supabaseCode = await supabaseStorage.validateInvitationCodeFromSupabase(code);
  if (supabaseCode) return supabaseCode;

  // Fallback to localStorage
  return validateInvitationCode(code);
}

export function markInvitationCodeAsUsed(code: string, email: string): void {
  const codes = getFromLocalStorage<InvitationCode>(STORAGE_KEYS.INVITATIONS);
  const index = codes.findIndex((c) => c.code === code);
  if (index >= 0) {
    codes[index].status = 'used';
    codes[index].usedBy = email;
    saveToLocalStorage(STORAGE_KEYS.INVITATIONS, codes);
  }

  // Background sync to Supabase
  supabaseStorage.markInvitationCodeAsUsedInSupabase(code, email).catch(console.error);
}

export function deleteInvitationCode(code: string): void {
  const codes = getFromLocalStorage<InvitationCode>(STORAGE_KEYS.INVITATIONS);
  saveToLocalStorage(STORAGE_KEYS.INVITATIONS, codes.filter((c) => c.code !== code));

  // Background sync to Supabase
  supabaseStorage.deleteInvitationCodeFromSupabase(code).catch(console.error);
}

// ============================================================================
// ASYNC VERSIONS (for explicit cloud operations)
// ============================================================================

export async function getPacientesAsync(usuarioId?: string): Promise<Paciente[]> {
  // Use Server Action for Cloud-First fetching (Cross-Device Fix)
  // This bypasses client-side RLS limitations
  const result = await getPatientsAction();

  if (result.success && result.data && result.data.length > 0) {
    // Sync cloud data to localStorage for offline access
    saveToLocalStorage(STORAGE_KEYS.PACIENTES, result.data);
    return result.data;
  }

  // Fallback to local data if server call failed or returned empty
  const localPacientes = getPacientes(usuarioId);
  return localPacientes;
}


export async function getPacienteByIdAsync(id: string): Promise<Paciente | null> {
  // Use server action to fetch a single patient securely
  const supabasePaciente = await getPatientServer(id);
  if (supabasePaciente) {
    return supabasePaciente;
  }
  // Fallback to local
  return getPacienteById(id);
}


export async function getMedidasByPacienteAsync(pacienteId: string): Promise<MedidasAntropometricas[]> {
  // Use server action to fetch measurements
  const supabaseMedidas = await getMedidasServer(pacienteId);
  if (supabaseMedidas && supabaseMedidas.length > 0) {
    return supabaseMedidas;
  }
  return getMedidasByPaciente(pacienteId);
}


export async function getCitasAsync(): Promise<Cita[]> {
  const result = await getAppointmentsAction();
  if (result.success && result.data && result.data.length > 0) {
    saveToLocalStorage(STORAGE_KEYS.CITAS, result.data);
    return result.data;
  }
  return getCitas();
}


export async function getInvitationCodesAsync(): Promise<InvitationCode[]> {
  const supabaseCodes = await supabaseStorage.getInvitationCodesFromSupabase();
  if (supabaseCodes.length > 0) {
    saveToLocalStorage(STORAGE_KEYS.INVITATIONS, supabaseCodes);
    return supabaseCodes;
  }
  return getInvitationCodes();
}