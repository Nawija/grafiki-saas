// ===========================================
// ALGORYTM GENEROWANIA GRAFIKU
// Wersja 3.0 - Oparty na szablonach zmian z capacity
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

    // 8. Dla każdego dnia roboczego, wypełnij sloty szablonów
    for (const day of workingDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayOfWeek = getDay(day);

        console.log(`\n📆 ${dateStr} (dzień ${dayOfWeek}):`);

        // Dla każdego szablonu - capacity to MINIMUM wymagane
        for (const template of sortedTemplates) {
            const minRequired = template.capacity || 1;
            const templateHours = calculateTemplateHours(template);

            console.log(
                `   📋 ${template.name} (${template.start_time}-${template.end_time}): min ${minRequired} os.`
            );

            // Zbierz dostępnych pracowników dla tego szablonu
            const availableEmployees = getAvailableEmployeesForSlot(
                template,
                day,
                dateStr,
                activeEmployees,
                employeeData,
                absences
            );

            console.log(
                `      Dostępni: ${availableEmployees.length} pracowników`
            );

            // Sortuj wg potrzeby godzin (ci którzy mają najwięcej do dobicia - pierwsi)
            availableEmployees.sort((a, b) => {
                const dataA = employeeData.get(a.id)!;
                const dataB = employeeData.get(b.id)!;
                const needA = dataA.targetHours - dataA.assignedHours;
                const needB = dataB.targetHours - dataB.assignedHours;
                return needB - needA; // Malejąco
            });

            // Przypisz minimum wymaganych pracowników
            let assigned = 0;
            for (const emp of availableEmployees) {
                if (assigned >= minRequired) break;

                const data = employeeData.get(emp.id)!;

                // Sprawdź czy pracownik nie ma już za dużo godzin
                if (data.assignedHours >= data.targetHours) {
                    continue;
                }

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
                result.statistics.hoursPerEmployee[emp.id] = data.assignedHours;

                // Update last shift end for rest calculation
                const [endH, endM] = template.end_time.split(":").map(Number);
                const shiftEnd = new Date(day);
                shiftEnd.setHours(endH, endM, 0, 0);
                data.lastShiftEnd = shiftEnd;

                // Update consecutive days
                updateConsecutiveDays(data, day);

                assigned++;
                console.log(
                    `      ✅ ${emp.first_name} ${emp.last_name} (${data.assignedHours}h / ${data.targetHours}h)`
                );
            }

            if (assigned < minRequired) {
                const missing = minRequired - assigned;
                result.warnings.push(
                    `⚠️ ${dateStr} ${template.name}: brak pracowników (${assigned}/${minRequired} min.)`
                );
                console.log(`      ⚠️ Brakuje ${missing} osób do minimum`);
            }
        }
    }

    // 9. Walidacja końcowa
    validateSchedule(result, employeeData);

    return result;
}

// ===========================================
// FUNKCJE POMOCNICZE
// ===========================================

/**
 * Oblicza godziny netto szablonu
 */
function calculateTemplateHours(template: ShiftTemplate): number {
    const [startH, startM] = template.start_time.split(":").map(Number);
    const [endH, endM] = template.end_time.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Nocna zmiana
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes =
        endMinutes - startMinutes - (template.break_duration || 0);
    return totalMinutes / 60;
}

/**
 * Sprawdza czy sklep jest otwarty danego dnia
 */
function isDayOpen(day: Date, settings: TeamSettings): boolean {
    const dayOfWeek = getDay(day);

    // Święta państwowe - zamknięte
    if (isPublicHoliday(day)) {
        return false;
    }

    // Niedziela niehandlowa - zamknięte
    if (dayOfWeek === 0 && settings.respect_polish_trading_sundays) {
        if (isNonTradingSunday(day)) {
            return false;
        }
    }

    // Sprawdź godziny otwarcia
    const openingHours = settings.opening_hours || {};
    const hoursAny = openingHours as Record<
        string | number,
        { start: string; end: string } | null
    >;
    const dayHours = hoursAny[dayOfWeek] ?? hoursAny[String(dayOfWeek)];

    // Jeśli null lub undefined - zamknięte
    if (!dayHours) {
        return false;
    }

    // Sprawdź working_days (jeśli ustawione)
    if (settings.working_days && settings.working_days.length > 0) {
        if (!settings.working_days.includes(dayOfWeek)) {
            return false;
        }
    }

    return true;
}

/**
 * Pobiera dostępnych pracowników dla danego slotu
 */
function getAvailableEmployeesForSlot(
    template: ShiftTemplate,
    day: Date,
    dateStr: string,
    employees: Employee[],
    employeeData: Map<string, EmployeeScheduleData>,
    absences: Absence[]
): Employee[] {
    const available: Employee[] = [];

    const [templateStartH] = template.start_time.split(":").map(Number);
    const templatePeriod = getShiftPeriod(templateStartH);

    for (const emp of employees) {
        const data = employeeData.get(emp.id);
        if (!data) continue;

        // 1. Sprawdź nieobecności
        const hasAbsence = absences.some((a) => {
            if (a.employee_id !== emp.id) return false;
            if (a.status !== "approved") return false;
            return dateStr >= a.start_date && dateStr <= a.end_date;
        });
        if (hasAbsence) continue;

        // 2. Sprawdź czy nie przypisany już na ten dzień (do innego szablonu)
        if (data.assignedDays.has(dateStr)) continue;

        // 3. Sprawdź odpoczynek 11h między zmianami
        if (data.lastShiftEnd) {
            const minRest = data.preferences?.min_hours_between_shifts || 11;
            const [startH, startM] = template.start_time.split(":").map(Number);
            const shiftStart = new Date(day);
            shiftStart.setHours(startH, startM, 0, 0);

            const restHours = differenceInHours(shiftStart, data.lastShiftEnd);
            if (restHours < minRest) continue;
        }

        // 4. Sprawdź max dni z rzędu
        const maxConsecutive = data.preferences?.max_consecutive_days || 6;
        if (data.consecutiveDays >= maxConsecutive) continue;

        // 5. Sprawdź preferencje zmianowe (jeśli nie "flexible")
        const shiftPref = data.preferences?.shift_preference || "flexible";
        if (shiftPref !== "flexible") {
            const prefPeriod = getShiftPeriod(
                shiftPref === "morning"
                    ? 6
                    : shiftPref === "afternoon"
                    ? 14
                    : 18
            );
            // Odrzuć tylko jeśli preferencja całkowicie nie pasuje
            if (prefPeriod !== templatePeriod && Math.random() > 0.3) {
                // 30% szans na przypisanie mimo preferencji
                continue;
            }
        }

        // 6. Sprawdź unikane dni
        const dayOfWeek = getDay(day);
        const avoidedDays = data.preferences?.avoided_days || [];
        if (avoidedDays.includes(dayOfWeek)) {
            // Pomiń unikany dzień tylko jeśli pracownik ma mniej niż 80% godzin
            const needsHours =
                (data.targetHours - data.assignedHours) / data.targetHours >
                0.2;
            if (!needsHours) continue;
        }

        available.push(emp);
    }

    return available;
}

/**
 * Określa porę dnia zmiany
 */
function getShiftPeriod(
    startHour: number
): "morning" | "afternoon" | "evening" {
    if (startHour < 12) return "morning";
    if (startHour < 18) return "afternoon";
    return "evening";
}

/**
 * Aktualizuje licznik dni z rzędu
 */
function updateConsecutiveDays(data: EmployeeScheduleData, day: Date): void {
    const sortedDays = Array.from(data.assignedDays).sort();
    if (sortedDays.length <= 1) {
        data.consecutiveDays = 1;
        return;
    }

    // Policz dni z rzędu od końca
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

/**
 * Oblicza godziny zmiany (netto - po odjęciu przerwy)
 */
function calculateShiftHours(shift: GeneratedShift): number {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Nocna zmiana
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes =
        endMinutes - startMinutes - (shift.break_duration || 0);
    return totalMinutes / 60;
}

/**
 * Walidacja końcowa - generuje ostrzeżenia
 */
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

        console.log(
            `   ${name}: ${assigned.toFixed(0)}h / ${target}h (${
                diff > 0 ? "brak" : "nadwyżka"
            } ${Math.abs(diff).toFixed(0)}h)`
        );

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

// ===========================================
// EKSPORT
// ===========================================

export { isDayOpen, calculateShiftHours };
