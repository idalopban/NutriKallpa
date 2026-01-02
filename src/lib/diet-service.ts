/**
 * Diet Service
 * 
 * Manages saving, loading, and managing weekly diet plans.
 * Uses localStorage for immediate access with background sync to Supabase.
 */

import type { DailyPlan } from './diet-generator';
import * as supabaseStorage from './supabase-storage';
import { getDietPlansAction } from "@/actions/diet-actions";

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

const STORAGE_KEY = 'nutrikallpa_diet_plans_v1';

// ============================================================================
// HELPER: localStorage functions
// ============================================================================

function getSavedPlansFromStorage(): SavedPlan[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function savePlansToStorage(plans: SavedPlan[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

// ============================================================================
// SAVE PLAN (sync - immediate localStorage + background Supabase)
// ============================================================================

export function saveWeeklyPlan(
    plan: DailyPlan[],
    name: string,
    userId: string,
    patientId?: string
): void {
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 6);

    const newPlan: SavedPlan = {
        id: crypto.randomUUID(),
        userId,
        patientId,
        name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
        planData: plan,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage immediately
    const plans = getSavedPlansFromStorage();
    plans.push(newPlan);
    savePlansToStorage(plans);

    // Background sync to Supabase
    supabaseStorage.saveDietPlanToSupabase(newPlan).catch(console.error);
}

// ============================================================================
// GET USER DIET HISTORY (sync - from localStorage)
// ============================================================================

export function getUserDietHistory(userId: string): SavedPlan[] {
    const plans = getSavedPlansFromStorage();
    return plans
        .filter(p => p.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Async version that fetches from Supabase
export async function getUserDietHistoryAsync(userId: string): Promise<SavedPlan[]> {
    // Use Server Action for Cloud-First fetching (Cross-Device Fix)
    const result = await getDietPlansAction();

    if (result.success && result.data && result.data.length > 0) {
        // Sync cloud data to localStorage
        const localPlans = getSavedPlansFromStorage();
        const otherPlans = localPlans.filter(p => p.userId !== userId);
        savePlansToStorage([...otherPlans, ...result.data]);
        return result.data;
    }

    return getUserDietHistory(userId);
}


// ============================================================================
// GET PATIENT DIET HISTORY (sync - from localStorage)
// ============================================================================

export function getPatientDietHistory(patientId: string): SavedPlan[] {
    const plans = getSavedPlansFromStorage();
    return plans
        .filter(p => p.patientId === patientId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Async version
export async function getPatientDietHistoryAsync(patientId: string): Promise<SavedPlan[]> {
    const result = await getDietPlansAction();

    if (result.success && result.data && result.data.length > 0) {
        // Filter by patientId on the returned data
        const patientPlans = result.data.filter(p => p.patientId === patientId);
        if (patientPlans.length > 0) {
            return patientPlans;
        }
    }

    return getPatientDietHistory(patientId);
}

// ============================================================================
// GET PLAN BY ID
// ============================================================================

export function getPlanById(planId: string): SavedPlan | null {
    const plans = getSavedPlansFromStorage();
    return plans.find(p => p.id === planId) || null;
}

// ============================================================================
// DELETE PLAN (sync + background Supabase)
// ============================================================================

export function deleteSavedPlan(planId: string): void {
    // Delete from localStorage immediately
    const plans = getSavedPlansFromStorage();
    const filtered = plans.filter(p => p.id !== planId);
    savePlansToStorage(filtered);

    // Background sync to Supabase
    supabaseStorage.deleteDietPlanFromSupabase(planId).catch(console.error);
}

// ============================================================================
// UPDATE PLAN STATUS
// ============================================================================

export function updatePlanStatus(planId: string, status: 'active' | 'archived'): void {
    const plans = getSavedPlansFromStorage();
    const index = plans.findIndex(p => p.id === planId);

    if (index >= 0) {
        plans[index].status = status;
        savePlansToStorage(plans);

        // Background sync to Supabase
        supabaseStorage.saveDietPlanToSupabase(plans[index]).catch(console.error);
    }
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

export async function syncDietPlansFromSupabase(userId: string): Promise<void> {
    const result = await getDietPlansAction();

    if (result.success && result.data && result.data.length > 0) {
        const localPlans = getSavedPlansFromStorage();
        const otherPlans = localPlans.filter(p => p.userId !== userId);
        savePlansToStorage([...otherPlans, ...result.data]);
    }
}

export async function syncLocalPlansToSupabase(userId: string): Promise<number> {
    const localPlans = getSavedPlansFromStorage().filter(p => p.userId === userId);
    let synced = 0;

    for (const plan of localPlans) {
        const success = await supabaseStorage.saveDietPlanToSupabase(plan);
        if (success) synced++;
    }

    return synced;
}

// ============================================================================
// CLONE PLAN TO CURRENT WEEK
// ============================================================================

export async function clonePlanToCurrentWeek(planId: string): Promise<DailyPlan[] | null> {
    const originalPlan = getPlanById(planId);
    if (!originalPlan) return null;

    return originalPlan.planData;
}
