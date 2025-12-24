// ===========================================
// ALGORYTM GENEROWANIA GRAFIKU
// Wersja 5.0 - Wielokrotne przejścia, 2-3+ osoby na zmianę
// ===========================================

import {
    Employee,
    EmployeePreferences,
    ShiftTemplate,
    Absence,
    TeamSettings,
    DEFAULT_EMPLOYEE_PREFERENCES,
} from "@/types";
import {
    format,
    eachDayOfInterval,
    getDay,
    endOfMonth,
    differenceInHours,
} from "date-fns";
import { isNonTradingSunday, isPublicHoliday } from "./polish-holidays";

// ===========================================
// TYPY
// ===========================================

export interface GeneratorConfig {
    teamId: string;
    month: number; // 1-12
    year: number;
    settings: TeamSettings;
}

export interface GeneratorResult {
    success: boolean;
    shifts: GeneratedShift[];
    warnings: string[];
    statistics: {
        totalShifts: number;
        hoursPerEmployee: Record<string, number>;
        targetHoursPerEmployee: Record<string, number>;
        slotsFilledPerTemplate: Record<string, number>;
    };
}

export interface GeneratedShift {
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    type: "regular" | "overtime" | "training" | "on_call";
}

interface EmployeeScheduleData {
    employee: Employee;
    preferences: EmployeePreferences;
    targetHours: number;
    assignedHours: number;
    assignedDays: Set<string>;
    shiftsPerDay: Map<string, number>;
    lastShiftEnd: Date | null;
    consecutiveDays: number;
    weeklyHours: Map<number, number>;
}

// ===========================================
// GŁÓWNA FUNKCJA GENEROWANIA
// ===========================================

export function generateMonthlySchedule(
    config: GeneratorConfig,
    employees: Employee[],
    absences: Absence[],
    shiftTemplates: ShiftTemplate[]
): GeneratorResult {
    const result: GeneratorResult = {
        success: true,
        shifts: [],
        warnings: [],
        statistics: {
            totalShifts: 0,
            hoursPerEmployee: {},
            targetHoursPerEmployee: {},
            slotsFilledPerTemplate: {},
        },
    };

    // 1. Filtruj aktywnych pracowników
    const activeEmployees = employees.filter((e) => e.is_active);
    if (activeEmployees.length === 0) {
        result.success = false;
        result.warnings.push("Brak aktywnych pracowników do zaplanowania");
        return result;
    }

    // 2. Sprawdź szablony
    if (shiftTemplates.length === 0) {
        result.success = false;
        result.warnings.push(
            "Brak szablonów zmian - dodaj szablony w zakładce Szablony"
        );
        return result;
    }

    // 3. Oblicz zakres dat
    const monthStart = new Date(config.year, config.month - 1, 1);
    const monthEnd = endOfMonth(monthStart);

    // 4. Policz DNI ROBOCZE wg ustawień sklepu
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = allDays.filter((day) =>
        isDayOpen(day, config.settings)
    );
    const workingDaysCount = workingDays.length;

    // 5. Standardowy etat = dni robocze × 8h
    const standardHoursPerDay = 8;
    const fullTimeMonthlyHours = workingDaysCount * standardHoursPerDay;

    console.log(`📅 Miesiąc: ${config.month}/${config.year}`);
    console.log(
        `📅 Dni robocze sklepu: ${workingDaysCount}, pełny etat: ${fullTimeMonthlyHours}h`
    );
    console.log(`📋 Szablony zmian: ${shiftTemplates.length}`);

    // 6. Przygotuj dane pracowników
    const employeeData = new Map<string, EmployeeScheduleData>();

    for (const emp of activeEmployees) {
        const targetHours = emp.contract_hours || fullTimeMonthlyHours;

        employeeData.set(emp.id, {
            employee: emp,
            preferences: emp.preferences || DEFAULT_EMPLOYEE_PREFERENCES,
            targetHours,
            assignedHours: 0,
            assignedDays: new Set(),
            shiftsPerDay: new Map(),
            lastShiftEnd: null,
            consecutiveDays: 0,
            weeklyHours: new Map(),
        });

        result.statistics.targetHoursPerEmployee[emp.id] = targetHours;
        result.statistics.hoursPerEmployee[emp.id] = 0;

        console.log(
            `👤 ${emp.first_name} ${emp.last_name}: cel ${targetHours}h`
        );
    }

    // 7. Sortuj szablony wg godziny startu
    const sortedTemplates = [...shiftTemplates].sort((a, b) => {
        const [aH, aM] = a.start_time.split(":").map(Number);
        const [bH, bM] = b.start_time.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
    });

    // Inicjuj statystyki szablonów
    sortedTemplates.forEach((t) => {
        result.statistics.slotsFilledPerTemplate[t.id] = 0;
    });

    // ===========================================
    // 8. WIELOKROTNE PRZEJŚCIA - aż wszyscy mają pełny etat
    // ===========================================

    const MAX_PASSES = 5; // Max 5 osób na jedną zmianę
    let pass = 0;

    while (pass < MAX_PASSES) {
        pass++;
        console.log(`\n🔄 === PRZEJŚCIE ${pass} ===`);

        // Sprawdź czy ktoś jeszcze potrzebuje godzin
        const employeesStillNeedingHours = Array.from(
            employeeData.values()
        ).filter((data) => data.assignedHours < data.targetHours);

        if (employeesStillNeedingHours.length === 0) {
            console.log(`✅ Wszyscy pracownicy mają pełny etat!`);
            break;
        }

        console.log(
            `👥 ${employeesStillNeedingHours.length} pracowników potrzebuje więcej godzin`
        );

        let shiftsAddedThisPass = 0;

        // W przejściach 2+ losowo przetasuj dni i szablony
        const daysToProcess =
            pass === 1 ? workingDays : shuffleArray([...workingDays]);
        const templatesToProcess =
            pass === 1 ? sortedTemplates : shuffleArray([...sortedTemplates]);

        for (const day of daysToProcess) {
            const dateStr = format(day, "yyyy-MM-dd");

            // Dla każdego szablonu zmiany
            for (const template of templatesToProcess) {
                const templateHours = calculateTemplateHours(template);

                // Znajdź pracowników którzy:
                // 1. Potrzebują godzin
                // 2. Nie mają jeszcze zmiany na ten szablon tego dnia
                // 3. Mogą pracować (bez nieobecności, max 1 zmiana/dzień)

                const availableForThisSlot = Array.from(employeeData.values())
                    .filter((data) => {
                        const emp = data.employee;

                        // Potrzebuje godzin?
                        if (data.assignedHours >= data.targetHours)
                            return false;

                        // Sprawdź czy już ma TĘ zmianę tego dnia
                        const existingShift = result.shifts.find(
                            (s) =>
                                s.employee_id === emp.id &&
                                s.date === dateStr &&
                                s.start_time === template.start_time &&
                                s.end_time === template.end_time
                        );
                        if (existingShift) return false;

                        // Sprawdź nieobecności
                        const hasAbsence = absences.some((a) => {
                            if (a.employee_id !== emp.id) return false;
                            if (a.status !== "approved") return false;
                            return (
                                dateStr >= a.start_date && dateStr <= a.end_date
                            );
                        });
                        if (hasAbsence) return false;

                        // Sprawdź ile zmian ma już tego dnia (max 1 zmiana/dzień)
                        const shiftsThisDay =
                            data.shiftsPerDay.get(dateStr) || 0;
                        if (shiftsThisDay >= 1) return false;

                        // Sprawdź max dni z rzędu (tylko w pierwszym przejściu)
                        if (pass === 1) {
                            const maxConsecutive =
                                data.preferences?.max_consecutive_days || 6;
                            if (data.consecutiveDays >= maxConsecutive)
                                return false;
                        }

                        return true;
                    })
                    .sort((a, b) => {
                        // Priorytet: kto ma największy deficyt godzin
                        const needA = a.targetHours - a.assignedHours;
                        const needB = b.targetHours - b.assignedHours;
                        // W pass 2+ dodaj losowość ±20%
                        if (pass > 1) {
                            return (
                                needB * (0.8 + Math.random() * 0.4) -
                                needA * (0.8 + Math.random() * 0.4)
                            );
                        }
                        return needB - needA;
                    });

                // Dodaj 1 osobę na przejście
                for (const data of availableForThisSlot.slice(0, 1)) {
                    const emp = data.employee;

                    // Stwórz zmianę
                    const shift: GeneratedShift = {
                        employee_id: emp.id,
                        date: dateStr,
                        start_time: template.start_time,
                        end_time: template.end_time,
                        break_duration: template.break_duration,
                        type: "regular",
                    };

                    result.shifts.push(shift);
                    result.statistics.totalShifts++;
                    result.statistics.slotsFilledPerTemplate[template.id]++;

                    // Aktualizuj dane pracownika
                    data.assignedHours += templateHours;
                    data.assignedDays.add(dateStr);
                    data.shiftsPerDay.set(
                        dateStr,
                        (data.shiftsPerDay.get(dateStr) || 0) + 1
                    );
                    result.statistics.hoursPerEmployee[emp.id] =
                        data.assignedHours;

                    // Update last shift end
                    const [endH, endM] = template.end_time
                        .split(":")
                        .map(Number);
                    const shiftEnd = new Date(day);
                    shiftEnd.setHours(endH, endM, 0, 0);
                    data.lastShiftEnd = shiftEnd;

                    // Update consecutive days (tylko w 1 przejściu)
                    if (pass === 1) {
                        updateConsecutiveDays(data, day);
                    }

                    shiftsAddedThisPass++;
                }
            }
        }

        console.log(
            `   📝 Dodano ${shiftsAddedThisPass} zmian w tym przejściu`
        );

        // Jeśli nie dodano żadnych zmian, przerwij
        if (shiftsAddedThisPass === 0) {
            console.log(`⚠️ Nie można dodać więcej zmian`);
            break;
        }
    }

    // 9. Sprawdź minimalne obsadzenie szablonów
    for (const day of workingDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        for (const template of sortedTemplates) {
            const minRequired = template.capacity || 1;
            const shiftsForTemplate = result.shifts.filter(
                (s) =>
                    s.date === dateStr &&
                    s.start_time === template.start_time &&
                    s.end_time === template.end_time
            ).length;

            if (shiftsForTemplate < minRequired) {
                result.warnings.push(
                    `⚠️ ${dateStr} ${template.name}: ${shiftsForTemplate}/${minRequired} osób`
                );
            }
        }
    }

    // 10. Walidacja końcowa
    validateSchedule(result, employeeData);

    return result;
}

// ===========================================
// FUNKCJE POMOCNICZE
// ===========================================

function calculateTemplateHours(template: ShiftTemplate): number {
    const [startH, startM] = template.start_time.split(":").map(Number);
    const [endH, endM] = template.end_time.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes =
        endMinutes - startMinutes - (template.break_duration || 0);
    return totalMinutes / 60;
}

function isDayOpen(day: Date, settings: TeamSettings): boolean {
    const dayOfWeek = getDay(day);

    if (isPublicHoliday(day)) return false;

    if (dayOfWeek === 0 && settings.respect_polish_trading_sundays) {
        if (isNonTradingSunday(day)) return false;
    }

    const openingHours = settings.opening_hours || {};
    const hoursAny = openingHours as Record<
        string | number,
        { start: string; end: string } | null
    >;
    const dayHours = hoursAny[dayOfWeek] ?? hoursAny[String(dayOfWeek)];

    if (!dayHours) return false;

    if (settings.working_days && settings.working_days.length > 0) {
        if (!settings.working_days.includes(dayOfWeek)) return false;
    }

    return true;
}

function updateConsecutiveDays(data: EmployeeScheduleData, day: Date): void {
    const sortedDays = Array.from(data.assignedDays).sort();
    if (sortedDays.length <= 1) {
        data.consecutiveDays = 1;
        return;
    }

    let consecutive = 1;
    for (let i = sortedDays.length - 1; i > 0; i--) {
        const current = new Date(sortedDays[i]);
        const prev = new Date(sortedDays[i - 1]);
        const diffDays = Math.floor(
            (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
            consecutive++;
        } else {
            break;
        }
    }
    data.consecutiveDays = consecutive;
}

function calculateShiftHours(shift: GeneratedShift): number {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes =
        endMinutes - startMinutes - (shift.break_duration || 0);
    return totalMinutes / 60;
}

function validateSchedule(
    result: GeneratorResult,
    employeeData: Map<string, EmployeeScheduleData>
): void {
    console.log("\n📊 PODSUMOWANIE:");
    for (const [empId, data] of employeeData) {
        const emp = data.employee;
        const name = `${emp.first_name} ${emp.last_name}`;
        const assigned = data.assignedHours;
        const target = data.targetHours;
        const diff = target - assigned;
        const percentDiff = target > 0 ? (Math.abs(diff) / target) * 100 : 0;

        console.log(`   ${name}: ${assigned.toFixed(0)}h / ${target}h`);

        if (diff > 0 && percentDiff > 10) {
            result.warnings.push(
                `📉 ${name}: ${assigned.toFixed(
                    0
                )}h / ${target}h (brakuje ${diff.toFixed(0)}h)`
            );
        } else if (diff < 0 && percentDiff > 5) {
            result.warnings.push(
                `📈 ${name}: ${assigned.toFixed(
                    0
                )}h / ${target}h (nadgodziny: ${Math.abs(diff).toFixed(0)}h)`
            );
        }
    }
}

/**
 * Losowo tasuje tablicę (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ===========================================
// EKSPORT
// ===========================================

export { isDayOpen, calculateShiftHours };
