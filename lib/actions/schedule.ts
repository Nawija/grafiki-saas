"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Employee, Shift, TeamSettings, ShiftWithEmployee } from "@/types";
import { getEmployeeFullName } from "@/types";
import { createShifts, deleteShiftsByDateRange } from "./shift";
import { isTradingSunday } from "@/lib/polish-holidays";

// ============================================
// SCHEDULE GENERATION
// ============================================

export interface GenerateScheduleInput {
    teamId: string;
    startDate: string;
    endDate: string;
    employees: {
        id: string;
        firstName: string;
        lastName: string;
        contractType: string;
        hoursPerWeek: number;
    }[];
    settings: TeamSettings;
    clearExisting?: boolean;
}

export interface GeneratedShift {
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
}

export async function generateSchedule(
    input: GenerateScheduleInput
): Promise<{ data: GeneratedShift[] | null; error: string | null }> {
    const { teamId, startDate, endDate, employees, settings, clearExisting } =
        input;

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: Date[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    // Filter working days based on settings
    const workingDays = days.filter((day) => {
        const dayOfWeek = day.getDay();

        // Check if it's a working day
        if (
            settings.working_days &&
            !settings.working_days.includes(dayOfWeek)
        ) {
            return false;
        }

        // Check Polish trading Sundays
        if (dayOfWeek === 0 && settings.respect_polish_trading_sundays) {
            return isTradingSunday(day);
        }

        return true;
    });

    // Generate shifts
    const generatedShifts: GeneratedShift[] = [];

    for (const day of workingDays) {
        const dateStr = day.toISOString().split("T")[0];

        // Distribute employees across the day
        for (let i = 0; i < employees.length; i++) {
            const employee = employees[i];

            // Skip employees with no hours
            if (employee.hoursPerWeek <= 0) continue;

            // Calculate daily hours (assuming 5-day work week)
            const dailyHours = Math.min(8, employee.hoursPerWeek / 5);

            if (dailyHours <= 0) continue;

            // Stagger start times slightly for variety - use opening hours from settings
            const openingHour =
                settings.opening_hours?.[day.getDay()]?.start || "08:00";
            const baseStartHour = parseInt(openingHour.split(":")[0] || "8");
            const startHour = baseStartHour + (i % 2); // Alternate between base and base+1

            const endHour = startHour + dailyHours;

            generatedShifts.push({
                employeeId: employee.id,
                date: dateStr,
                startTime: `${String(startHour).padStart(2, "0")}:00`,
                endTime: `${String(Math.floor(endHour)).padStart(
                    2,
                    "0"
                )}:${Math.floor((endHour % 1) * 60)
                    .toString()
                    .padStart(2, "0")}`,
                breakDuration:
                    dailyHours >= 6 ? settings.break_duration || 30 : 0,
            });
        }
    }

    return { data: generatedShifts, error: null };
}

export async function saveGeneratedSchedule(
    teamId: string,
    shifts: GeneratedShift[],
    clearExisting: boolean = false
): Promise<{ count: number; error: string | null }> {
    // Optionally clear existing shifts
    if (clearExisting && shifts.length > 0) {
        const dates = shifts.map((s) => s.date).sort();
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];

        await deleteShiftsByDateRange(teamId, minDate, maxDate);
    }

    // Create new shifts
    const shiftsToCreate = shifts.map((s) => ({
        team_id: teamId,
        employee_id: s.employeeId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        break_duration: s.breakDuration,
    }));

    const result = await createShifts(shiftsToCreate);

    revalidatePath("/dashboard/schedule");
    return result;
}

// ============================================
// SCHEDULE TEMPLATES
// ============================================

export interface ScheduleTemplate {
    id: string;
    name: string;
    teamId: string;
    shifts: {
        dayOfWeek: number;
        employeeIndex: number;
        startTime: string;
        endTime: string;
        breakDuration: number;
    }[];
    createdAt: string;
}

export async function getScheduleTemplates(
    teamId: string
): Promise<{ data: ScheduleTemplate[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("schedule_templates")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function createScheduleTemplate(
    teamId: string,
    name: string,
    shifts: ShiftWithEmployee[]
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Nie jesteś zalogowany" };

    // Convert shifts to template format (day of week based)
    const templateShifts = shifts.map((shift) => ({
        dayOfWeek: new Date(shift.date).getDay(),
        employeeId: shift.employee_id,
        startTime: shift.start_time,
        endTime: shift.end_time,
        breakDuration: shift.break_duration || 30,
    }));

    const { error } = await supabase.from("schedule_templates").insert({
        team_id: teamId,
        name,
        shifts: templateShifts,
        created_by: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/schedule");
    return { error: null };
}

// ============================================
// SCHEDULE STATISTICS
// ============================================

export interface ScheduleStats {
    totalShifts: number;
    totalHours: number;
    employeeStats: {
        employeeId: string;
        employeeName: string;
        shifts: number;
        hours: number;
        overtimeHours: number;
    }[];
    dailyStats: {
        date: string;
        shifts: number;
        totalHours: number;
    }[];
}

export async function getScheduleStats(
    teamId: string,
    startDate: string,
    endDate: string
): Promise<{ data: ScheduleStats | null; error: string | null }> {
    const supabase = await createClient();

    const { data: shifts, error } = await supabase
        .from("shifts")
        .select(
            `
            *,
            employee:employees (
                id,
                first_name,
                last_name,
                hours_per_week
            )
        `
        )
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate);

    if (error) return { data: null, error: error.message };

    // Calculate stats
    const employeeMap = new Map<
        string,
        {
            name: string;
            shifts: number;
            hours: number;
            overtimeHours: number;
            hoursPerWeek: number;
        }
    >();
    const dailyMap = new Map<string, { shifts: number; totalHours: number }>();

    let totalShifts = 0;
    let totalHours = 0;

    for (const shift of shifts || []) {
        const hours = calculateShiftHours(
            shift.start_time,
            shift.end_time,
            shift.break_duration || 0
        );

        totalShifts++;
        totalHours += hours;

        // Employee stats
        const emp = shift.employee as any;
        if (emp) {
            const empId = emp.id;
            const empName = `${emp.first_name} ${emp.last_name}`;
            const existing = employeeMap.get(empId) || {
                name: empName,
                shifts: 0,
                hours: 0,
                overtimeHours: 0,
                hoursPerWeek: emp.hours_per_week || 40,
            };
            existing.shifts++;
            existing.hours += hours;
            employeeMap.set(empId, existing);
        }

        // Daily stats
        const date = shift.date;
        const dailyExisting = dailyMap.get(date) || {
            shifts: 0,
            totalHours: 0,
        };
        dailyExisting.shifts++;
        dailyExisting.totalHours += hours;
        dailyMap.set(date, dailyExisting);
    }

    // Calculate overtime
    const employeeStats = Array.from(employeeMap.entries()).map(
        ([id, stats]) => {
            // Simple overtime calculation - hours over weekly limit
            const weeklyOvertime = Math.max(
                0,
                stats.hours - stats.hoursPerWeek
            );
            return {
                employeeId: id,
                employeeName: stats.name,
                shifts: stats.shifts,
                hours: Math.round(stats.hours * 100) / 100,
                overtimeHours: Math.round(weeklyOvertime * 100) / 100,
            };
        }
    );

    const dailyStats = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
            date,
            shifts: stats.shifts,
            totalHours: Math.round(stats.totalHours * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        data: {
            totalShifts,
            totalHours: Math.round(totalHours * 100) / 100,
            employeeStats,
            dailyStats,
        },
        error: null,
    };
}

// ============================================
// CONFLICT DETECTION
// ============================================

export interface ScheduleConflict {
    type: "overlap" | "too_many_hours" | "rest_time" | "sunday_violation";
    employeeId: string;
    employeeName: string;
    date: string;
    message: string;
    severity: "warning" | "error";
}

export async function checkScheduleConflicts(
    teamId: string,
    startDate: string,
    endDate: string,
    settings: TeamSettings
): Promise<{ data: ScheduleConflict[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data: shifts, error } = await supabase
        .from("shifts")
        .select(
            `
            *,
            employee:employees (
                id,
                first_name,
                last_name,
                hours_per_week
            )
        `
        )
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("employee_id")
        .order("date")
        .order("start_time");

    if (error) return { data: null, error: error.message };

    const conflicts: ScheduleConflict[] = [];

    // Group shifts by employee
    const employeeShifts = new Map<string, any[]>();
    for (const shift of shifts || []) {
        const empId = shift.employee_id;
        const existing = employeeShifts.get(empId) || [];
        existing.push(shift);
        employeeShifts.set(empId, existing);
    }

    // Check each employee
    for (const [empId, empShifts] of employeeShifts.entries()) {
        const emp = empShifts[0]?.employee as any;
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : "Nieznany";

        // Check for overlapping shifts
        for (let i = 0; i < empShifts.length; i++) {
            for (let j = i + 1; j < empShifts.length; j++) {
                if (
                    empShifts[i].date === empShifts[j].date &&
                    shiftsOverlap(empShifts[i], empShifts[j])
                ) {
                    conflicts.push({
                        type: "overlap",
                        employeeId: empId,
                        employeeName: empName,
                        date: empShifts[i].date,
                        message: `Nakładające się zmiany`,
                        severity: "error",
                    });
                }
            }
        }

        // Check daily hours limit (11 hours max by default)
        const dailyHours = new Map<string, number>();
        for (const shift of empShifts) {
            const hours = calculateShiftHours(
                shift.start_time,
                shift.end_time,
                shift.break_duration || 0
            );
            const existing = dailyHours.get(shift.date) || 0;
            dailyHours.set(shift.date, existing + hours);
        }

        for (const [date, hours] of dailyHours.entries()) {
            if (hours > (settings.overtime_threshold_daily || 11)) {
                conflicts.push({
                    type: "too_many_hours",
                    employeeId: empId,
                    employeeName: empName,
                    date,
                    message: `Za dużo godzin (${hours.toFixed(1)}h)`,
                    severity: "warning",
                });
            }
        }

        // Check rest time between shifts (11 hours)
        const sortedShifts = [...empShifts].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.end_time}`);
            const dateB = new Date(`${b.date}T${b.start_time}`);
            return dateA.getTime() - dateB.getTime();
        });

        for (let i = 0; i < sortedShifts.length - 1; i++) {
            const currentEnd = new Date(
                `${sortedShifts[i].date}T${sortedShifts[i].end_time}`
            );
            const nextStart = new Date(
                `${sortedShifts[i + 1].date}T${sortedShifts[i + 1].start_time}`
            );

            const restHours =
                (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);

            // Polish labor code requires 11 hours rest between shifts
            if (restHours < 11 && restHours >= 0) {
                conflicts.push({
                    type: "rest_time",
                    employeeId: empId,
                    employeeName: empName,
                    date: sortedShifts[i + 1].date,
                    message: `Za krótki odpoczynek (${restHours.toFixed(1)}h)`,
                    severity: "warning",
                });
            }
        }
    }

    // Check Polish Sunday law
    if (settings.respect_polish_trading_sundays) {
        for (const shift of shifts || []) {
            const shiftDate = new Date(shift.date);
            if (shiftDate.getDay() === 0 && !isTradingSunday(shiftDate)) {
                const emp = shift.employee as any;
                conflicts.push({
                    type: "sunday_violation",
                    employeeId: shift.employee_id,
                    employeeName: emp
                        ? `${emp.first_name} ${emp.last_name}`
                        : "Nieznany",
                    date: shift.date,
                    message: `Niehandlowa niedziela`,
                    severity: "error",
                });
            }
        }
    }

    return { data: conflicts, error: null };
}

// ============================================
// HELPERS
// ============================================

function calculateShiftHours(
    startTime: string,
    endTime: string,
    breakMinutes: number
): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    return (endMinutes - startMinutes - breakMinutes) / 60;
}

function shiftsOverlap(shift1: any, shift2: any): boolean {
    const [s1Start, s1End] = [shift1.start_time, shift1.end_time].map(
        timeToMinutes
    );
    const [s2Start, s2End] = [shift2.start_time, shift2.end_time].map(
        timeToMinutes
    );

    return s1Start < s2End && s2Start < s1End;
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}
