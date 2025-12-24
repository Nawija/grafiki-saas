"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
    Employee,
    ContractType,
    EmployeeRole,
    NotificationPreferences,
} from "@/types";

// ============================================
// COLORS FOR EMPLOYEES
// ============================================

const EMPLOYEE_COLORS = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#6366f1", // indigo
];

function getNextColor(existingColors: string[]): string {
    const usedCounts = EMPLOYEE_COLORS.map(
        (c) => existingColors.filter((e) => e === c).length
    );
    const minCount = Math.min(...usedCounts);
    const leastUsedIndex = usedCounts.findIndex((c) => c === minCount);
    return EMPLOYEE_COLORS[leastUsedIndex];
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    receive_email: false,
    schedule_published: true,
    shift_changes: true,
    reminders: false,
};

// ============================================
// GET OPERATIONS
// ============================================

export async function getEmployeesByTeam(
    teamId: string,
    includeInactive = false
): Promise<{ data: Employee[] | null; error: string | null }> {
    const supabase = await createClient();

    let query = supabase
        .from("employees")
        .select("*")
        .eq("team_id", teamId)
        .order("first_name");

    if (!includeInactive) {
        query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getEmployee(
    id: string
): Promise<{ data: Employee | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getEmployeeCount(
    teamId: string
): Promise<{ count: number; error: string | null }> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("is_active", true);

    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateEmployeeInput {
    team_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    position: string;
    role?: EmployeeRole;
    contract_type?: ContractType;
    contract_hours?: number;
    hours_per_week?: number;
    hourly_rate?: number;
}

export async function createEmployee(
    input: CreateEmployeeInput
): Promise<{ data: Employee | null; error: string | null }> {
    const supabase = await createClient();

    // Check employee limit
    const { data: team } = await supabase
        .from("teams")
        .select("organization_id")
        .eq("id", input.team_id)
        .single();

    if (team?.organization_id) {
        const { data: org } = await supabase
            .from("organizations")
            .select("max_employees_per_team")
            .eq("id", team.organization_id)
            .single();

        if (org) {
            const { count } = await getEmployeeCount(input.team_id);
            if (count >= org.max_employees_per_team) {
                return {
                    data: null,
                    error: `Osiągnięto limit pracowników (${org.max_employees_per_team}). Ulepsz plan, aby dodać więcej.`,
                };
            }
        }
    }

    // Get existing colors to assign new unique one
    const { data: existingEmployees } = await supabase
        .from("employees")
        .select("color")
        .eq("team_id", input.team_id);

    const existingColors = existingEmployees?.map((e) => e.color) || [];
    const color = getNextColor(existingColors);

    const { data, error } = await supabase
        .from("employees")
        .insert({
            team_id: input.team_id,
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email || null,
            phone: input.phone || null,
            position: input.position,
            role: input.role || "employee",
            contract_type: input.contract_type || "full_time",
            contract_hours: input.contract_hours || 160,
            hours_per_week:
                input.hours_per_week ||
                (input.contract_hours ? input.contract_hours / 4 : 40),
            hourly_rate: input.hourly_rate,
            color,
            is_active: true,
            notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
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

export async function updateEmployee(
    id: string,
    updates: Partial<
        Pick<
            Employee,
            | "first_name"
            | "last_name"
            | "email"
            | "phone"
            | "position"
            | "role"
            | "contract_type"
            | "contract_hours"
            | "hourly_rate"
            | "color"
            | "is_active"
            | "notification_preferences"
            | "preferences"
        >
    >
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

export async function updateNotificationPreferences(
    employeeId: string,
    preferences: Partial<NotificationPreferences>
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    // Get current preferences
    const { data: employee } = await supabase
        .from("employees")
        .select("notification_preferences")
        .eq("id", employeeId)
        .single();

    const currentPrefs =
        employee?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES;

    const { error } = await supabase
        .from("employees")
        .update({
            notification_preferences: { ...currentPrefs, ...preferences },
        })
        .eq("id", employeeId);

    if (error) return { error: error.message };
    return { error: null };
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteEmployee(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    // Soft delete - just deactivate
    const { error } = await supabase
        .from("employees")
        .update({ is_active: false })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

export async function permanentlyDeleteEmployee(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}
