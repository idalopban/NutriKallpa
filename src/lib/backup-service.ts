/**
 * Backup Service
 * 
 * Provides functionality to export and import all application data.
 * Useful for backup, migration, and data portability.
 */

import type { Paciente, MedidasAntropometricas, Cita } from '@/types';
import type { SavedPlan } from './diet-service';
import * as storage from './storage';
import * as dietService from './diet-service';

export interface BackupData {
    version: string;
    exportedAt: string;
    userId: string;
    data: {
        pacientes: Paciente[];
        medidas: MedidasAntropometricas[];
        dietPlans: SavedPlan[];
        citas: Cita[];
    };
}

// ============================================================================
// EXPORT DATA
// ============================================================================

export async function exportAllData(userId: string): Promise<BackupData> {
    // Gather all data
    const pacientes = await storage.getPacientes(userId);

    // Get medidas for all pacientes
    const medidasPromises = pacientes.map(p => storage.getMedidasByPaciente(p.id));
    const medidasArrays = await Promise.all(medidasPromises);
    const medidas = medidasArrays.flat();

    // Get diet plans
    const dietPlans = await dietService.getUserDietHistory(userId);

    // Get citas
    const citas = await storage.getCitas();

    const backup: BackupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId,
        data: {
            pacientes,
            medidas,
            dietPlans,
            citas,
        }
    };

    return backup;
}

export function downloadBackup(backup: BackupData): void {
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `nutrikallpa-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    if (link.parentNode === document.body) {
        document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
}

// ============================================================================
// IMPORT DATA
// ============================================================================

export interface ImportResult {
    success: boolean;
    imported: {
        pacientes: number;
        medidas: number;
        dietPlans: number;
        citas: number;
    };
    errors: string[];
}

export async function importData(backup: BackupData, userId: string): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        imported: {
            pacientes: 0,
            medidas: 0,
            dietPlans: 0,
            citas: 0,
        },
        errors: [],
    };

    try {
        // Import pacientes
        for (const paciente of backup.data.pacientes) {
            try {
                // Update usuarioId to current user
                const updatedPaciente = { ...paciente, usuarioId: userId };
                await storage.savePaciente(updatedPaciente);
                result.imported.pacientes++;
            } catch (e) {
                result.errors.push(`Error importing paciente ${paciente.id}: ${e}`);
            }
        }

        // Import medidas
        for (const medida of backup.data.medidas) {
            try {
                await storage.saveMedidas(medida);
                result.imported.medidas++;
            } catch (e) {
                result.errors.push(`Error importing medida ${medida.id}: ${e}`);
            }
        }

        // Import diet plans
        for (const plan of backup.data.dietPlans) {
            try {
                // Update userId to current user
                await dietService.saveWeeklyPlan(
                    plan.planData,
                    plan.name,
                    userId,
                    plan.patientId
                );
                result.imported.dietPlans++;
            } catch (e) {
                result.errors.push(`Error importing diet plan ${plan.id}: ${e}`);
            }
        }

        // Import citas
        for (const cita of backup.data.citas) {
            try {
                await storage.saveCita(cita);
                result.imported.citas++;
            } catch (e) {
                result.errors.push(`Error importing cita ${cita.id}: ${e}`);
            }
        }

        if (result.errors.length > 0) {
            result.success = false;
        }
    } catch (e) {
        result.success = false;
        result.errors.push(`General import error: ${e}`);
    }

    return result;
}

export async function parseBackupFile(file: File): Promise<BackupData | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const backup = JSON.parse(content) as BackupData;

                // Validate structure
                if (!backup.version || !backup.data) {
                    console.error('Invalid backup file structure');
                    resolve(null);
                    return;
                }

                resolve(backup);
            } catch (error) {
                console.error('Error parsing backup file:', error);
                resolve(null);
            }
        };

        reader.onerror = () => {
            console.error('Error reading backup file');
            resolve(null);
        };

        reader.readAsText(file);
    });
}

// ============================================================================
// SYNC LOCAL TO CLOUD
// ============================================================================

export interface SyncResult {
    success: boolean;
    synced: {
        pacientes: number;
        medidas: number;
        dietPlans: number;
        citas: number;
    };
    errors: string[];
}

export async function syncLocalToCloud(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: true,
        synced: {
            pacientes: 0,
            medidas: 0,
            dietPlans: 0,
            citas: 0,
        },
        errors: [],
    };

    try {
        // Sync pacientes
        const localPacientes = storage.getPacientes(userId);
        for (const paciente of localPacientes) {
            try {
                await storage.savePaciente(paciente);
                result.synced.pacientes++;
            } catch (e) {
                result.errors.push(`Error syncing paciente ${paciente.id}`);
            }
        }

        // Sync diet plans
        const syncedPlans = await dietService.syncLocalPlansToSupabase(userId);
        result.synced.dietPlans = syncedPlans;

        // Sync citas
        const localCitas = storage.getCitas();
        for (const cita of localCitas) {
            try {
                await storage.saveCita(cita);
                result.synced.citas++;
            } catch (e) {
                result.errors.push(`Error syncing cita ${cita.id}`);
            }
        }

        if (result.errors.length > 0) {
            result.success = false;
        }
    } catch (e) {
        result.success = false;
        result.errors.push(`General sync error: ${e}`);
    }

    return result;
}
