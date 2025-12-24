"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Team, TeamSettings } from "@/types";

// ============================================
// DEFAULT SETTINGS
// ============================================

const DEFAULT_TEAM_SETTINGS: TeamSettings = {
    default_shift_duration: 480, // 8 hours
    min_shift_duration: 240, // 4 hours
    max_shift_duration: 720, // 12 hours
    break_duration: 30,
    week_starts_on: 1, // Monday
    working_days: [1, 2, 3, 4, 5], // Mon-Fri
    opening_hours: {
        0: null, // Sunday
        1: { start: "08:00", end: "20:00" },
        2: { start: "08:00", end: "20:00" },
        3: { start: "08:00", end: "20:00" },
        4: { start: "08:00", end: "20:00" },
        5: { start: "08:00", end: "20:00" },
        6: { start: "09:00", end: "17:00" },
    },
    respect_polish_trading_sundays: true,
    auto_calculate_breaks: true,
    overtime_threshold_daily: 8,
    overtime_threshold_weekly: 40,
};

// ============================================
// GET OPERATIONS
// ============================================

export async function getTeamsByOrganization(
    organizationId: string
): Promise<{ data: Team[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getTeam(
    id: string
): Promise<{ data: Team | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getTeamCount(
    organizationId: string
): Promise<{ count: number; error: string | null }> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createTeam(
    organizationId: string,
    name: string,
    description?: string
): Promise<{ data: Team | null; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Nie jesteś zalogowany" };

    // Check team limit for organization
    const { data: org } = await supabase
        .from("organizations")
        .select("max_teams")
        .eq("id", organizationId)
        .single();

    if (org) {
        const { count } = await getTeamCount(organizationId);
        if (count >= org.max_teams) {
            return {
                data: null,
                error: `Osiągnięto limit zespołów (${org.max_teams}). Ulepsz plan, aby dodać więcej.`,
            };
        }
    }

    const { data, error } = await supabase
        .from("teams")
        .insert({
            organization_id: organizationId,
            owner_id: user.id,
            name,
            description,
            settings: DEFAULT_TEAM_SETTINGS,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard");
    return { data, error: null };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateTeam(
    id: string,
    updates: Partial<Pick<Team, "name" | "description" | "settings">>
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase.from("teams").update(updates).eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteTeam(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase.from("teams").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}
