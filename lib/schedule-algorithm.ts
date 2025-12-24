// ===========================================
// SCHEDULE GENERATION ALGORITHM
// ===========================================

import {
    Employee,
    EmployeePreferences,
    Shift,
    ShiftTemplate,
    Absence,
    ScheduleGenerationConfig,
    ScheduleGenerationResult,
    ShiftType,
} from "@/types";
import {
    format,
    parseISO,
    addDays,
    eachDayOfInterval,
    getDay,
    differenceInHours,
    differenceInMinutes,
    isSameDay,
    startOfWeek,
    endOfWeek,
} from "date-fns";
import {
    isWorkingDay,
    isNonTradingSunday,
    isPublicHoliday,
    isTradingSunday,
} from "./polish-holidays";

// Shift type is always "regular" for standard shifts (matches DB enum)
// The DB enum is: 'regular', 'overtime', 'training', 'on_call'

// Manager rules:
// - Weekdays: max 6h per day
// - Weekends: can work up to 12h per day
// - Weekly limit: max 35h per week (instead of 40h for regular employees)
const MANAGER_MAX_HOURS_WEEKDAY = 6;
const MANAGER_MAX_HOURS_WEEKEND = 12;
const MANAGER_MAX_HOURS_WEEKLY = 35;
const EMPLOYEE_MAX_HOURS_WEEKLY = 40;

interface EmployeeWorkload {
    employeeId: string;
    totalHours: number;
    shiftsCount: number;
    weekendShifts: number;
    consecutiveDays: number;
    lastShiftEnd: Date | null;
    assignedDays: Set<string>;
}

interface DayRequirement {
    date: string;
    dayOfWeek: number;
    minEmployees: number;
    maxEmployees: number;
    isWorkingDay: boolean;
    isTradingSunday: boolean;
    requiredPositions?: { position: string; count: number }[];
}

// Calculate shift duration in hours
function getShiftDurationHours(shift: {
    start_time: string;
    end_time: string;
    break_duration: number;
}): number {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes - shift.break_duration;
    return totalMinutes / 60;
}

// Check if manager can work given shift duration on a specific day
function canManagerWorkShift(
    dayOfWeek: number,
    shiftDuration: number
): { allowed: boolean; maxHours: number; reason?: string } {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const maxHours = isWeekend
        ? MANAGER_MAX_HOURS_WEEKEND
        : MANAGER_MAX_HOURS_WEEKDAY;

    if (shiftDuration > maxHours) {
        return {
            allowed: false,
            maxHours,
            reason: isWeekend
                ? `Kierownik: max ${maxHours}h w weekend`
                : `Kierownik: max ${maxHours}h w dni robocze`,
        };
    }
    return { allowed: true, maxHours };
}

// Check if employee can work on a specific day
function canEmployeeWork(
    employee: Employee,
    preferences: EmployeePreferences | undefined,
    date: Date,
    workload: EmployeeWorkload,
    absences: Absence[],
    config: ScheduleGenerationConfig
): { canWork: boolean; reason?: string } {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date);

    // Check if employee is on absence
    const hasAbsence = absences.some(
        (a) =>
            a.employee_id === employee.id &&
            a.status === "approved" &&
            dateStr >= a.start_date &&
            dateStr <= a.end_date
    );
    if (hasAbsence) {
        return { canWork: false, reason: "Nieobecność" };
    }

    // Check if already assigned this day
    if (workload.assignedDays.has(dateStr)) {
        return { canWork: false, reason: "Już przypisany" };
    }

    // Check consecutive days limit
    if (workload.consecutiveDays >= (config.max_consecutive_work_days || 6)) {
        return { canWork: false, reason: "Limit dni z rzędu" };
    }

    // Check rest time between shifts (Polish labor code: min 11h)
    if (workload.lastShiftEnd) {
        const minRestHours = config.min_rest_between_shifts || 11;
        const shiftStart = new Date(date);
        shiftStart.setHours(8, 0, 0, 0); // Assume 8:00 start

        const restHours = differenceInHours(shiftStart, workload.lastShiftEnd);
        if (restHours < minRestHours) {
            return { canWork: false, reason: "Za krótki odpoczynek" };
        }
    }

    // Check preferences - avoided days
    if (preferences?.avoided_days.includes(dayOfWeek)) {
        return { canWork: true, reason: "Niechciany dzień (możliwe)" }; // Can work but not preferred
    }

    // Check weekly hours limit based on role
    const isManager = employee.role === "manager";
    const maxWeeklyHours = isManager
        ? MANAGER_MAX_HOURS_WEEKLY
        : EMPLOYEE_MAX_HOURS_WEEKLY;

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    // Calculate hours already assigned this week
    let weekHours = 0;
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    for (const d of weekDays) {
        if (workload.assignedDays.has(format(d, "yyyy-MM-dd"))) {
            weekHours += 8; // Assume 8h per shift
        }
    }

    if (weekHours >= maxWeeklyHours) {
        return {
            canWork: false,
            reason: isManager
                ? "Limit 35h/tydzień (kierownik)"
                : "Limit godzin tygodniowo",
        };
    }

    // Check max hours per week from preferences
    if (
        preferences?.max_hours_per_week &&
        weekHours >= preferences.max_hours_per_week
    ) {
        return { canWork: false, reason: "Limit godzin tygodniowo" };
    }

    return { canWork: true };
}

// Score employee for a specific day (higher = better fit)
function scoreEmployeeForDay(
    employee: Employee,
    preferences: EmployeePreferences | undefined,
    date: Date,
    workload: EmployeeWorkload,
    config: ScheduleGenerationConfig,
    allWorkloads: Map<string, EmployeeWorkload>
): number {
    let score = 100;
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Penalize if employee has more hours than average
    const avgHours =
        Array.from(allWorkloads.values()).reduce(
            (sum, w) => sum + w.totalHours,
            0
        ) / allWorkloads.size;

    if (workload.totalHours > avgHours) {
        score -= (workload.totalHours - avgHours) * 5;
    } else {
        score += (avgHours - workload.totalHours) * 3;
    }

    // Reward if employee prefers this day
    if (preferences?.preferred_days.includes(dayOfWeek)) {
        score += 20;
    }

    // Penalize if employee avoids this day
    if (preferences?.avoided_days.includes(dayOfWeek)) {
        score -= 15;
    }

    // Penalize weekend shifts if employee already has many
    if (isWeekend) {
        const maxWeekends = config.max_weekends_per_month || 2;
        if (workload.weekendShifts >= maxWeekends) {
            score -= 50;
        } else {
            // Distribute weekend shifts evenly
            const avgWeekendShifts =
                Array.from(allWorkloads.values()).reduce(
                    (sum, w) => sum + w.weekendShifts,
                    0
                ) / allWorkloads.size;

            if (workload.weekendShifts > avgWeekendShifts) {
                score -= 20;
            }
        }
    }

    // Consider contract hours - prioritize those who need more hours
    const targetHours = employee.contract_hours;
    const hoursNeeded = targetHours - workload.totalHours;
    if (hoursNeeded > 0) {
        score += Math.min(hoursNeeded, 20);
    }

    return score;
}

// Main schedule generation function
export function generateSchedule(
    config: ScheduleGenerationConfig,
    employees: Employee[],
    employeePreferences: Map<string, EmployeePreferences>,
    shiftTemplates: ShiftTemplate[],
    existingAbsences: Absence[]
): ScheduleGenerationResult {
    const result: ScheduleGenerationResult = {
        success: true,
        shifts: [],
        warnings: [],
        unfilledSlots: [],
        statistics: {
            totalShifts: 0,
            hoursPerEmployee: {},
            weekendShiftsPerEmployee: {},
        },
    };

    // Filter active employees
    const activeEmployees = employees.filter((e) => e.is_active);
    if (activeEmployees.length === 0) {
        result.success = false;
        result.warnings.push("Brak aktywnych pracowników");
        return result;
    }

    // Initialize workloads
    const workloads = new Map<string, EmployeeWorkload>();
    for (const employee of activeEmployees) {
        workloads.set(employee.id, {
            employeeId: employee.id,
            totalHours: 0,
            shiftsCount: 0,
            weekendShifts: 0,
            consecutiveDays: 0,
            lastShiftEnd: null,
            assignedDays: new Set(),
        });
        result.statistics.hoursPerEmployee[employee.id] = 0;
        result.statistics.weekendShiftsPerEmployee[employee.id] = 0;
    }

    // Generate day requirements
    const startDate = parseISO(config.start_date);
    const endDate = parseISO(config.end_date);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const dayRequirements: DayRequirement[] = days.map((day) => {
        const dayOfWeek = getDay(day);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayConfig = config.staffing_requirements[dayOfWeek] || {
            min_employees: 1,
            max_employees: 5,
        };

        // Check if it's a working day for the business
        const isTradingSun = isTradingSunday(day);
        const isNonTradingSun = isNonTradingSunday(day);
        const isHoliday = isPublicHoliday(day);

        // Determine if we should schedule for this day
        let shouldSchedule = true;
        if (isHoliday) {
            shouldSchedule = false;
        } else if (isNonTradingSun) {
            shouldSchedule = false;
        }

        return {
            date: dateStr,
            dayOfWeek,
            minEmployees: shouldSchedule ? dayConfig.min_employees : 0,
            maxEmployees: shouldSchedule ? dayConfig.max_employees : 0,
            isWorkingDay: shouldSchedule,
            isTradingSunday: isTradingSun,
            requiredPositions: dayConfig.required_positions,
        };
    });

    // Get default shift template
    const defaultTemplate = shiftTemplates.find((t) => t.is_default) || {
        start_time: "09:00",
        end_time: "17:00",
        break_duration: 30,
    };

    // Process each day
    for (const dayReq of dayRequirements) {
        if (!dayReq.isWorkingDay || dayReq.minEmployees === 0) {
            continue;
        }

        const date = parseISO(dayReq.date);
        const isWeekend = dayReq.dayOfWeek === 0 || dayReq.dayOfWeek === 6;

        // Get available employees for this day
        const availableEmployees: { employee: Employee; score: number }[] = [];

        for (const employee of activeEmployees) {
            const workload = workloads.get(employee.id)!;
            const preferences = employeePreferences.get(employee.id);

            const { canWork, reason } = canEmployeeWork(
                employee,
                preferences,
                date,
                workload,
                existingAbsences,
                config
            );

            if (canWork) {
                const score = scoreEmployeeForDay(
                    employee,
                    preferences,
                    date,
                    workload,
                    config,
                    workloads
                );
                availableEmployees.push({ employee, score });
            }
        }

        // Sort by score (highest first)
        availableEmployees.sort((a, b) => b.score - a.score);

        // Assign shifts
        const shiftsToCreate = Math.min(
            dayReq.minEmployees,
            availableEmployees.length
        );

        if (shiftsToCreate < dayReq.minEmployees) {
            result.warnings.push(
                `${dayReq.date}: Brak wystarczającej liczby pracowników (potrzeba: ${dayReq.minEmployees}, dostępnych: ${availableEmployees.length})`
            );
            result.unfilledSlots.push({
                date: dayReq.date,
                reason: `Brak ${
                    dayReq.minEmployees - shiftsToCreate
                } pracowników`,
            });
        }

        for (let i = 0; i < shiftsToCreate; i++) {
            const { employee } = availableEmployees[i];
            const workload = workloads.get(employee.id)!;

            let shiftStartTime = defaultTemplate.start_time;
            let shiftEndTime = defaultTemplate.end_time;
            let shiftBreakDuration = defaultTemplate.break_duration;

            let shiftDuration = getShiftDurationHours({
                start_time: shiftStartTime,
                end_time: shiftEndTime,
                break_duration: shiftBreakDuration,
            });

            // Check manager shift duration rules
            if (employee.role === "manager") {
                const managerCheck = canManagerWorkShift(
                    dayReq.dayOfWeek,
                    shiftDuration
                );
                if (!managerCheck.allowed) {
                    // Adjust shift duration for managers
                    const maxMinutes = managerCheck.maxHours * 60;
                    const [startH, startM] = shiftStartTime
                        .split(":")
                        .map(Number);
                    const endMinutes =
                        startH * 60 + startM + maxMinutes + shiftBreakDuration;
                    const endH = Math.floor(endMinutes / 60) % 24;
                    const endM = endMinutes % 60;
                    shiftEndTime = `${String(endH).padStart(2, "0")}:${String(
                        endM
                    ).padStart(2, "0")}`;

                    shiftDuration = managerCheck.maxHours;
                    result.warnings.push(
                        `${dayReq.date}: Zmiana kierownika ${employee.first_name} ${employee.last_name} skrócona do ${managerCheck.maxHours}h`
                    );
                }
            }

            // Create shift
            const shift: Omit<Shift, "id" | "created_at" | "updated_at"> = {
                team_id: config.team_id,
                employee_id: employee.id,
                date: dayReq.date,
                start_time: shiftStartTime,
                end_time: shiftEndTime,
                break_duration: shiftBreakDuration,
                type: "regular", // Standard shift type from DB enum
                status: "scheduled",
                is_overtime: false,
                created_by: "algorithm",
            };

            result.shifts.push(shift);
            result.statistics.totalShifts++;

            // Update workload
            workload.totalHours += shiftDuration;
            workload.shiftsCount++;
            workload.assignedDays.add(dayReq.date);

            if (isWeekend || dayReq.isTradingSunday) {
                workload.weekendShifts++;
                result.statistics.weekendShiftsPerEmployee[employee.id]++;
            }

            // Update last shift end time
            const [endH, endM] = defaultTemplate.end_time
                .split(":")
                .map(Number);
            const shiftEnd = new Date(date);
            shiftEnd.setHours(endH, endM, 0, 0);
            workload.lastShiftEnd = shiftEnd;

            // Update consecutive days
            const yesterday = format(addDays(date, -1), "yyyy-MM-dd");
            if (workload.assignedDays.has(yesterday)) {
                workload.consecutiveDays++;
            } else {
                workload.consecutiveDays = 1;
            }

            result.statistics.hoursPerEmployee[employee.id] =
                workload.totalHours;
        }
    }

    // Final validation and warnings
    for (const employee of activeEmployees) {
        const workload = workloads.get(employee.id)!;
        const targetHours = employee.contract_hours;
        const actualHours = workload.totalHours;
        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const isManager = employee.role === "manager";

        // Check weekly overtime limits
        const maxWeeklyHours = isManager
            ? MANAGER_MAX_HOURS_WEEKLY
            : EMPLOYEE_MAX_HOURS_WEEKLY;
        if (actualHours > maxWeeklyHours) {
            result.warnings.push(
                `⚠️ ${employeeName}: ${actualHours.toFixed(
                    1
                )}h przekracza limit ${maxWeeklyHours}h/tydzień${
                    isManager ? " (kierownik)" : ""
                }`
            );
        }

        const deviation = Math.abs(actualHours - targetHours) / targetHours;
        if (deviation > 0.1) {
            // More than 10% deviation
            if (actualHours < targetHours) {
                result.warnings.push(
                    `${employeeName}: Przypisano ${actualHours.toFixed(
                        1
                    )}h z ${targetHours}h (niedogodziny)`
                );
            } else {
                result.warnings.push(
                    `${employeeName}: Przypisano ${actualHours.toFixed(
                        1
                    )}h z ${targetHours}h (nadgodziny)`
                );
            }
        }
    }

    return result;
}

// Validate a single shift assignment
export function validateShiftAssignment(
    shift: Partial<Shift>,
    employee: Employee,
    preferences: EmployeePreferences | undefined,
    existingShifts: Shift[],
    absences: Absence[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shift.date || !shift.start_time || !shift.end_time) {
        errors.push("Brakuje wymaganych pól");
        return { valid: false, errors };
    }

    const date = parseISO(shift.date);
    const dateStr = shift.date;

    // Check public holiday
    if (isPublicHoliday(date)) {
        errors.push("Dzień jest świętem publicznym");
    }

    // Check non-trading Sunday
    if (isNonTradingSunday(date)) {
        errors.push("Niedziela niehandlowa - sklepy zamknięte");
    }

    // Check absence
    const hasAbsence = absences.some(
        (a) =>
            a.employee_id === employee.id &&
            a.status === "approved" &&
            dateStr >= a.start_date &&
            dateStr <= a.end_date
    );
    if (hasAbsence) {
        errors.push("Pracownik ma zaplanowaną nieobecność");
    }

    // Check for overlapping shifts
    const overlapping = existingShifts.find((s) => {
        if (s.employee_id !== employee.id || s.date !== dateStr) return false;
        // Same day - check time overlap
        return true; // Simplified - in reality would check time overlap
    });
    if (overlapping) {
        errors.push("Pracownik ma już zmianę w tym dniu");
    }

    // Check rest time
    const previousDayShift = existingShifts.find((s) => {
        const prevDay = format(addDays(date, -1), "yyyy-MM-dd");
        return s.employee_id === employee.id && s.date === prevDay;
    });

    if (previousDayShift) {
        const [prevEndH, prevEndM] = previousDayShift.end_time
            .split(":")
            .map(Number);
        const [newStartH, newStartM] = shift.start_time.split(":").map(Number);

        // Calculate rest hours (simplified - assumes same day)
        const prevEndMinutes = prevEndH * 60 + prevEndM;
        const newStartMinutes = newStartH * 60 + newStartM + 24 * 60; // Next day
        const restMinutes = newStartMinutes - prevEndMinutes;
        const restHours = restMinutes / 60;

        if (restHours < 11) {
            errors.push(
                `Za krótki odpoczynek (${restHours.toFixed(
                    1
                )}h zamiast min. 11h)`
            );
        }
    }

    return { valid: errors.length === 0, errors };
}

// Quick assign - find best employee for a specific slot
export function findBestEmployeeForSlot(
    date: string,
    employees: Employee[],
    employeePreferences: Map<string, EmployeePreferences>,
    existingShifts: Shift[],
    absences: Absence[]
): { employee: Employee; score: number } | null {
    const dateObj = parseISO(date);
    const candidates: { employee: Employee; score: number }[] = [];

    for (const employee of employees.filter((e) => e.is_active)) {
        const preferences = employeePreferences.get(employee.id);

        // Check basic availability
        const hasAbsence = absences.some(
            (a) =>
                a.employee_id === employee.id &&
                a.status === "approved" &&
                date >= a.start_date &&
                date <= a.end_date
        );
        if (hasAbsence) continue;

        const alreadyAssigned = existingShifts.some(
            (s) => s.employee_id === employee.id && s.date === date
        );
        if (alreadyAssigned) continue;

        // Calculate simple score
        let score = 100;
        const dayOfWeek = getDay(dateObj);

        // Prefer employees who like this day
        if (preferences?.preferred_days.includes(dayOfWeek)) {
            score += 20;
        }
        if (preferences?.avoided_days.includes(dayOfWeek)) {
            score -= 20;
        }

        // Prefer employees with fewer shifts this week
        const weekShifts = existingShifts.filter((s) => {
            const shiftDate = parseISO(s.date);
            const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 });
            return (
                s.employee_id === employee.id &&
                shiftDate >= weekStart &&
                shiftDate <= weekEnd
            );
        }).length;

        score -= weekShifts * 10;

        candidates.push({ employee, score });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}
