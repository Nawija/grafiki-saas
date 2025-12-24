"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Shift, ShiftWithEmployee, Employee } from "@/types";
import { getEmployeeFullName } from "@/types";

// ============================================
// GET OPERATIONS
// ============================================

export async function getShiftsByDateRange(
    teamId: string,
    startDate: string,
    endDate: string
): Promise<{ data: ShiftWithEmployee[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .select(
            `
            *,
            employee:employees (*)
        `
        )
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time");

    if (error) return { data: null, error: error.message };

    // Transform to include employee object
    const shiftsWithEmployee = data?.map((shift) => ({
        ...shift,
        employee: shift.employee as Employee,
    })) as ShiftWithEmployee[];

    return { data: shiftsWithEmployee, error: null };
}

export async function getShift(
    id: string
): Promise<{ data: ShiftWithEmployee | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .select(
            `
            *,
            employee:employees (*)
        `
        )
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ShiftWithEmployee, error: null };
}

export async function getEmployeeShiftsForMonth(
    employeeId: string,
    year: number,
    month: number
): Promise<{ data: Shift[] | null; totalHours: number; error: string | null }> {
    const supabase = await createClient();

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", startDate)
        .lte("date", endDate);

    if (error) return { data: null, totalHours: 0, error: error.message };

    // Calculate total hours
    const totalHours =
        data?.reduce((sum, shift) => {
            const duration = calculateShiftDuration(
                shift.start_time,
                shift.end_time,
                shift.break_duration || 0
            );
            return sum + duration;
        }, 0) || 0;

    return { data, totalHours, error: null };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateShiftInput {
    team_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_duration?: number;
    type?: string;
    position?: string;
    notes?: string;
}

export async function createShift(
    input: CreateShiftInput
): Promise<{ data: Shift | null; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Nie jesteś zalogowany" };

    const { data, error } = await supabase
        .from("shifts")
        .insert({
            team_id: input.team_id,
            employee_id: input.employee_id,
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
            break_duration: input.break_duration || 30,
            type: input.type || "regular",
            position: input.position,
            notes: input.notes,
            is_overtime: false,
            is_published: false,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/schedule");
    return { data, error: null };
}

export async function createShifts(
    shifts: CreateShiftInput[]
): Promise<{ count: number; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: "Nie jesteś zalogowany" };

    const shiftsToInsert = shifts.map((shift) => ({
        team_id: shift.team_id,
        employee_id: shift.employee_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_duration: shift.break_duration || 30,
        type: shift.type || "regular",
        position: shift.position,
        notes: shift.notes,
        is_overtime: false,
        is_published: false,
        created_by: user.id,
    }));

    console.log(`📝 Zapisuję ${shiftsToInsert.length} zmian do bazy...`);

    const { data, error } = await supabase
        .from("shifts")
        .insert(shiftsToInsert)
        .select();

    if (error) {
        console.error("❌ Błąd zapisu zmian:", error);
        return { count: 0, error: error.message };
    }

    console.log(`✅ Zapisano ${data?.length || 0} zmian`);

    revalidatePath("/dashboard/schedule");
    return { count: data?.length || shifts.length, error: null };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateShift(
    id: string,
    updates: Partial<
        Pick<
            Shift,
            | "employee_id"
            | "date"
            | "start_time"
            | "end_time"
            | "break_duration"
            | "type"
            | "position"
            | "notes"
            | "is_overtime"
        >
    >
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/schedule");
    return { error: null };
}

export async function moveShift(
    id: string,
    newDate: string,
    newEmployeeId?: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const updates: Record<string, string> = { date: newDate };
    if (newEmployeeId) {
        updates.employee_id = newEmployeeId;
    }

    const { error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/schedule");
    return { error: null };
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteShift(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase.from("shifts").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/schedule");
    return { error: null };
}

export async function deleteShiftsByDateRange(
    teamId: string,
    startDate: string,
    endDate: string
): Promise<{ count: number; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .delete()
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
        .select();

    if (error) return { count: 0, error: error.message };

    revalidatePath("/dashboard/schedule");
    return { count: data?.length || 0, error: null };
}

// ============================================
// PUBLISH OPERATIONS
// ============================================

export async function publishShifts(
    teamId: string,
    startDate: string,
    endDate: string,
    sendNotifications: boolean = false
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Nie jesteś zalogowany" };

    // Update shifts to published
    const { error: updateError } = await supabase
        .from("shifts")
        .update({
            is_published: true,
            published_at: new Date().toISOString(),
        })
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate);

    if (updateError) return { error: updateError.message };

    // Create published schedule record
    const { error: recordError } = await supabase
        .from("published_schedules")
        .insert({
            team_id: teamId,
            start_date: startDate,
            end_date: endDate,
            published_by: user.id,
            notification_sent: sendNotifications,
            notification_sent_at: sendNotifications
                ? new Date().toISOString()
                : null,
        });

    if (recordError) {
        console.error("Error creating published schedule record:", recordError);
    }

    // TODO: Send email notifications if sendNotifications is true

    revalidatePath("/dashboard/schedule");
    return { error: null };
}

// ============================================
// HELPERS
// ============================================

function calculateShiftDuration(
    startTime: string,
    endTime: string,
    breakMinutes: number
): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    return (endMinutes - startMinutes - breakMinutes) / 60;
}
