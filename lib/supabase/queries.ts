import { createClient } from "@/lib/supabase/server";
import type {
    Employee,
    Team,
    TeamSettings,
    Shift,
    ShiftTemplate,
    Absence,
    Notification,
} from "@/types";

// =============================================
// TEAMS
// =============================================

export async function getTeam(teamId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

    if (error) throw error;
    return data as Team;
}

export async function getUserTeams() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id);

    if (error) throw error;
    return data as Team[];
}

export async function createTeam(team: Partial<Team>) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("teams")
        .insert({
            ...team,
            owner_id: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Team;
}

export async function updateTeamSettings(
    teamId: string,
    settings: TeamSettings
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("teams")
        .update({ settings })
        .eq("id", teamId)
        .select()
        .single();

    if (error) throw error;
    return data as Team;
}

// =============================================
// EMPLOYEES
// =============================================

export async function getEmployees(teamId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("team_id", teamId)
        .order("last_name", { ascending: true });

    if (error) throw error;
    return data as Employee[];
}

export async function getEmployee(employeeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function getActiveEmployees(teamId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_active", true)
        .order("last_name", { ascending: true });

    if (error) throw error;
    return data as Employee[];
}

export async function createEmployee(
    employee: Omit<Employee, "id" | "createdAt" | "updatedAt">
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .insert(employee)
        .select()
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function updateEmployee(
    employeeId: string,
    updates: Partial<Employee>
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", employeeId)
        .select()
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function deleteEmployee(employeeId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

    if (error) throw error;
}

// =============================================
// SHIFT TEMPLATES
// =============================================

export async function getShiftTemplates(teamId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("team_id", teamId)
        .order("start_time", { ascending: true });

    if (error) throw error;
    return data as ShiftTemplate[];
}

export async function createShiftTemplate(template: Omit<ShiftTemplate, "id">) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .insert(template)
        .select()
        .single();

    if (error) throw error;
    return data as ShiftTemplate;
}

export async function updateShiftTemplate(
    templateId: string,
    updates: Partial<ShiftTemplate>
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .update(updates)
        .eq("id", templateId)
        .select()
        .single();

    if (error) throw error;
    return data as ShiftTemplate;
}

export async function deleteShiftTemplate(templateId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("shift_templates")
        .delete()
        .eq("id", templateId);

    if (error) throw error;
}

// =============================================
// SHIFTS
// =============================================

export async function getShifts(
    teamId: string,
    startDate: string,
    endDate: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .select(
            `
      *,
      employee:employees(id, first_name, last_name, color, position)
    `
        )
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

    if (error) throw error;
    return data as (Shift & {
        employee: Pick<
            Employee,
            "id" | "first_name" | "last_name" | "color" | "position"
        >;
    })[];
}

export async function getEmployeeShifts(
    employeeId: string,
    startDate: string,
    endDate: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

    if (error) throw error;
    return data as Shift[];
}

export async function createShift(
    shift: Omit<Shift, "id" | "createdAt" | "updatedAt">
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("shifts")
        .insert({
            ...shift,
            created_by: user?.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Shift;
}

export async function createShifts(
    shifts: Omit<Shift, "id" | "createdAt" | "updatedAt">[]
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("shifts")
        .insert(
            shifts.map((shift) => ({
                ...shift,
                created_by: user?.id,
            }))
        )
        .select();

    if (error) throw error;
    return data as Shift[];
}

export async function updateShift(shiftId: string, updates: Partial<Shift>) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", shiftId)
        .select()
        .single();

    if (error) throw error;
    return data as Shift;
}

export async function deleteShift(shiftId: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("shifts").delete().eq("id", shiftId);

    if (error) throw error;
}

export async function deleteShiftsInRange(
    teamId: string,
    startDate: string,
    endDate: string
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate);

    if (error) throw error;
}

// =============================================
// ABSENCES
// =============================================

export async function getAbsences(
    teamId: string,
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient();

    let query = supabase
        .from("absences")
        .select(
            `
      *,
      employee:employees(id, first_name, last_name, color, position)
    `
        )
        .eq("team_id", teamId)
        .order("start_date", { ascending: true });

    if (startDate) {
        query = query.gte("end_date", startDate);
    }
    if (endDate) {
        query = query.lte("start_date", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as (Absence & {
        employee: Pick<
            Employee,
            "id" | "first_name" | "last_name" | "color" | "position"
        >;
    })[];
}

export async function getPendingAbsences(teamId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .select(
            `
      *,
      employee:employees(id, first_name, last_name, color, position)
    `
        )
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data as (Absence & {
        employee: Pick<
            Employee,
            "id" | "first_name" | "last_name" | "color" | "position"
        >;
    })[];
}

export async function getEmployeeAbsences(employeeId: string, year?: number) {
    const supabase = await createClient();

    let query = supabase
        .from("absences")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("status", "approved");

    if (year) {
        query = query
            .gte("start_date", `${year}-01-01`)
            .lte("end_date", `${year}-12-31`);
    }

    const { data, error } = await query.order("start_date", {
        ascending: true,
    });

    if (error) throw error;
    return data as Absence[];
}

export async function createAbsence(
    absence: Omit<Absence, "id" | "createdAt" | "updatedAt">
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("absences")
        .insert(absence)
        .select()
        .single();

    if (error) throw error;
    return data as Absence;
}

export async function approveAbsence(absenceId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("absences")
        .update({
            status: "approved",
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
        })
        .eq("id", absenceId)
        .select()
        .single();

    if (error) throw error;
    return data as Absence;
}

export async function rejectAbsence(absenceId: string, reason?: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("absences")
        .update({
            status: "rejected",
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            rejection_reason: reason,
        })
        .eq("id", absenceId)
        .select()
        .single();

    if (error) throw error;
    return data as Absence;
}

export async function deleteAbsence(absenceId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("absences")
        .delete()
        .eq("id", absenceId);

    if (error) throw error;
}

// =============================================
// NOTIFICATIONS
// =============================================

export async function getNotifications(limit = 20) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as Notification[];
}

export async function getUnreadNotificationsCount() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) throw error;
    return count || 0;
}

export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("notifications")
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

    if (error) throw error;
}

export async function markAllNotificationsAsRead() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) throw error;
}

// =============================================
// SCHEDULE GENERATION
// =============================================

export async function saveScheduleGeneration(
    teamId: string,
    startDate: string,
    endDate: string,
    config: any,
    results: { shiftsCreated: number; warnings: string[]; statistics: any }
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("schedule_generations")
        .insert({
            team_id: teamId,
            start_date: startDate,
            end_date: endDate,
            config,
            shifts_created: results.shiftsCreated,
            warnings: results.warnings,
            statistics: results.statistics,
            created_by: user?.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// STATISTICS
// =============================================

export async function getEmployeeWorkHours(
    employeeId: string,
    startDate: string,
    endDate: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("calculate_employee_hours", {
        p_employee_id: employeeId,
        p_start_date: startDate,
        p_end_date: endDate,
    });

    if (error) throw error;
    return data as {
        total_hours: number;
        regular_hours: number;
        overtime_hours: number;
    };
}

export async function getTeamScheduleStats(
    teamId: string,
    startDate: string,
    endDate: string
) {
    const supabase = await createClient();

    const [shiftsResult, absencesResult, employeesResult] = await Promise.all([
        supabase
            .from("shifts")
            .select("*", { count: "exact" })
            .eq("team_id", teamId)
            .gte("date", startDate)
            .lte("date", endDate),
        supabase
            .from("absences")
            .select("*", { count: "exact" })
            .eq("team_id", teamId)
            .eq("status", "approved")
            .gte("end_date", startDate)
            .lte("start_date", endDate),
        supabase
            .from("employees")
            .select("*", { count: "exact" })
            .eq("team_id", teamId)
            .eq("is_active", true),
    ]);

    return {
        totalShifts: shiftsResult.count || 0,
        activeAbsences: absencesResult.count || 0,
        activeEmployees: employeesResult.count || 0,
    };
}
