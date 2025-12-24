"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ShiftTemplate } from "@/types";

// ============================================
// GET OPERATIONS
// ============================================

export async function getShiftTemplatesByTeam(
    teamId: string
): Promise<{ data: ShiftTemplate[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("team_id", teamId)
        .order("start_time");

    if (error) return { data: null, error: error.message };
    return { data: data as ShiftTemplate[], error: null };
}

export async function getShiftTemplate(
    id: string
): Promise<{ data: ShiftTemplate | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ShiftTemplate, error: null };
}

export async function getDefaultTemplates(
    teamId: string
): Promise<{ data: ShiftTemplate[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_default", true)
        .order("start_time");

    if (error) return { data: null, error: error.message };
    return { data: data as ShiftTemplate[], error: null };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateShiftTemplateInput {
    team_id: string;
    name: string;
    start_time: string;
    end_time: string;
    break_duration?: number;
    color?: string;
    is_default?: boolean;
}

export async function createShiftTemplate(
    input: CreateShiftTemplateInput
): Promise<{ data: ShiftTemplate | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .insert({
            team_id: input.team_id,
            name: input.name,
            start_time: input.start_time,
            end_time: input.end_time,
            break_duration: input.break_duration ?? 30,
            color: input.color ?? "#3b82f6",
            is_default: input.is_default ?? false,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/templates");
    return { data: data as ShiftTemplate, error: null };
}

export async function createDefaultTemplatesForTeam(
    teamId: string
): Promise<{ data: ShiftTemplate[] | null; error: string | null }> {
    const supabase = await createClient();

    const defaultTemplates = [
        {
            team_id: teamId,
            name: "Rano",
            start_time: "06:00",
            end_time: "14:00",
            break_duration: 30,
            color: "#22c55e",
            is_default: true,
        },
        {
            team_id: teamId,
            name: "Popołudnie",
            start_time: "14:00",
            end_time: "22:00",
            break_duration: 30,
            color: "#f59e0b",
            is_default: true,
        },
        {
            team_id: teamId,
            name: "Cały dzień",
            start_time: "08:00",
            end_time: "16:00",
            break_duration: 30,
            color: "#3b82f6",
            is_default: true,
        },
        {
            team_id: teamId,
            name: "Noc",
            start_time: "22:00",
            end_time: "06:00",
            break_duration: 30,
            color: "#8b5cf6",
            is_default: true,
        },
    ];

    const { data, error } = await supabase
        .from("shift_templates")
        .insert(defaultTemplates)
        .select();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/templates");
    return { data: data as ShiftTemplate[], error: null };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateShiftTemplate(
    id: string,
    updates: Partial<Omit<ShiftTemplate, "id" | "created_at">>
): Promise<{ data: ShiftTemplate | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/templates");
    return { data: data as ShiftTemplate, error: null };
}

export async function setDefaultTemplate(
    id: string,
    isDefault: boolean
): Promise<{ data: ShiftTemplate | null; error: string | null }> {
    return updateShiftTemplate(id, { is_default: isDefault });
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteShiftTemplate(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("shift_templates")
        .delete()
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/templates");
    return { error: null };
}

// ============================================
// DUPLICATE
// ============================================

export async function duplicateShiftTemplate(
    id: string,
    newName?: string
): Promise<{ data: ShiftTemplate | null; error: string | null }> {
    const supabase = await createClient();

    // Get original template
    const { data: original, error: fetchError } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !original) {
        return {
            data: null,
            error: fetchError?.message || "Template not found",
        };
    }

    // Create copy
    const { data, error } = await supabase
        .from("shift_templates")
        .insert({
            team_id: original.team_id,
            name: newName || `${original.name} (kopia)`,
            type: original.type,
            start_time: original.start_time,
            end_time: original.end_time,
            break_duration: original.break_duration,
            color: original.color,
            is_default: false,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/templates");
    return { data: data as ShiftTemplate, error: null };
}

// ============================================
// HELPERS (not exported - use locally only)
// ============================================

function calculateTemplateDuration(template: ShiftTemplate): number {
    const [startH, startM] = template.start_time.split(":").map(Number);
    const [endH, endM] = template.end_time.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes =
        endMinutes - startMinutes - (template.break_duration || 0);
    return totalMinutes / 60; // Return hours
}
