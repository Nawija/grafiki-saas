"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
    Absence,
    AbsenceWithEmployee,
    AbsenceType,
    AbsenceStatus,
} from "@/types";
import { countWorkingDays } from "@/lib/polish-holidays";

// ============================================
// GET OPERATIONS
// ============================================

export async function getAbsencesByTeam(
    teamId: string,
    options?: {
        startDate?: string;
        endDate?: string;
        status?: AbsenceStatus;
        employeeId?: string;
    }
): Promise<{ data: AbsenceWithEmployee[] | null; error: string | null }> {
    const supabase = await createClient();

    let query = supabase
        .from("absences")
        .select(
            `
            *,
            employee:employees (*)
        `
        )
        .eq("team_id", teamId);

    if (options?.startDate) {
        query = query.gte("end_date", options.startDate);
    }
    if (options?.endDate) {
        query = query.lte("start_date", options.endDate);
    }
    if (options?.status) {
        query = query.eq("status", options.status);
    }
    if (options?.employeeId) {
        query = query.eq("employee_id", options.employeeId);
    }

    const { data, error } = await query.order("start_date", {
        ascending: false,
    });

    if (error) return { data: null, error: error.message };
    return { data: data as AbsenceWithEmployee[], error: null };
}

export async function getAbsence(
    id: string
): Promise<{ data: AbsenceWithEmployee | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .select(
            `
            *,
            employee:employees (*)
        `
        )
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as AbsenceWithEmployee, error: null };
}

export async function getEmployeeAbsences(
    employeeId: string,
    year?: number
): Promise<{ data: Absence[] | null; error: string | null }> {
    const supabase = await createClient();

    let query = supabase
        .from("absences")
        .select("*")
        .eq("employee_id", employeeId);

    if (year) {
        query = query
            .gte("start_date", `${year}-01-01`)
            .lte("end_date", `${year}-12-31`);
    }

    const { data, error } = await query.order("start_date", {
        ascending: false,
    });

    if (error) return { data: null, error: error.message };
    return { data: data as Absence[], error: null };
}

export async function getAbsenceStats(
    teamId: string,
    year: number
): Promise<{
    data: {
        pending: number;
        approved: number;
        rejected: number;
        totalDays: number;
        byType: Record<AbsenceType, number>;
    } | null;
    error: string | null;
}> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .select("*")
        .eq("team_id", teamId)
        .gte("start_date", `${year}-01-01`)
        .lte("end_date", `${year}-12-31`);

    if (error) return { data: null, error: error.message };

    const absences = data as Absence[];
    const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        totalDays: 0,
        byType: {} as Record<AbsenceType, number>,
    };

    absences.forEach((absence) => {
        if (absence.status === "pending") stats.pending++;
        else if (absence.status === "approved") stats.approved++;
        else if (absence.status === "rejected") stats.rejected++;

        if (absence.status === "approved") {
            // Calculate work days on-the-fly
            const workDays = countWorkingDays(
                new Date(absence.start_date),
                new Date(absence.end_date)
            );
            stats.totalDays += workDays;
        }

        const type = absence.type as AbsenceType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return { data: stats, error: null };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateAbsenceInput {
    team_id: string;
    employee_id: string;
    type: AbsenceType;
    start_date: string;
    end_date: string;
    reason?: string;
}

export async function createAbsence(
    input: CreateAbsenceInput
): Promise<{ data: Absence | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .insert({
            team_id: input.team_id,
            employee_id: input.employee_id,
            type: input.type,
            start_date: input.start_date,
            end_date: input.end_date,
            reason: input.reason,
            status: "pending",
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/absences");
    return { data: data as Absence, error: null };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateAbsence(
    id: string,
    updates: Partial<Omit<Absence, "id" | "created_at">>
): Promise<{ data: Absence | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/absences");
    return { data: data as Absence, error: null };
}

export async function approveAbsence(
    id: string,
    approvedBy: string
): Promise<{ data: Absence | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .update({
            status: "approved",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/absences");
    return { data: data as Absence, error: null };
}

export async function rejectAbsence(
    id: string,
    rejectedBy: string,
    reason?: string
): Promise<{ data: Absence | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .update({
            status: "rejected",
            approved_by: rejectedBy,
            reason: reason || undefined,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/absences");
    return { data: data as Absence, error: null };
}

export async function cancelAbsence(
    id: string
): Promise<{ data: Absence | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/absences");
    return { data: data as Absence, error: null };
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteAbsence(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase.from("absences").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/absences");
    return { error: null };
}

// ============================================
// VALIDATION
// ============================================

export async function checkAbsenceConflicts(
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeAbsenceId?: string
): Promise<{ hasConflict: boolean; conflictingAbsences: Absence[] }> {
    const supabase = await createClient();

    let query = supabase
        .from("absences")
        .select("*")
        .eq("employee_id", employeeId)
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .lte("start_date", endDate)
        .gte("end_date", startDate);

    if (excludeAbsenceId) {
        query = query.neq("id", excludeAbsenceId);
    }

    const { data } = await query;

    return {
        hasConflict: (data?.length || 0) > 0,
        conflictingAbsences: (data as Absence[]) || [],
    };
}
