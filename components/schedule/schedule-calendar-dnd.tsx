"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    pointerWithin,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSunday,
    isSaturday,
    getDay,
} from "date-fns";
import { pl } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Users, Calendar } from "lucide-react";
import { getRequiredHours, calculateWorkedHours } from "@/lib/utils/work-hours";

import { DraggableEmployee } from "./draggable-employee";
import { DroppableShiftCell } from "./droppable-shift-cell";
import { ShiftEditDialog } from "./shift-edit-dialog";

import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
    EmployeePreferences,
} from "@/types";

// Typ lokalnej zmiany ze statusem
export interface LocalShift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
    status: "new" | "modified" | "deleted" | "unchanged";
}

interface ShiftFromDB {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
    employee?: {
        id: string;
        first_name: string;
        last_name: string;
        employment_type: string;
        custom_hours: number | null;
    };
}

interface ScheduleCalendarDnDProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    shifts: ShiftFromDB[];
    scheduleId: string;
    shiftTemplates: ShiftTemplate[];
    organizationSettings: OrganizationSettings | null;
    employeePreferences: EmployeePreferences[];
}

// Funkcja pomocnicza do sprawdzania niedziel handlowych
function isTradingSunday(
    date: Date,
    settings: OrganizationSettings | null
): boolean {
    if (!isSunday(date)) return false;

    if (!settings) return false;

    switch (settings.trading_sundays_mode) {
        case "all":
            return true;
        case "none":
            return false;
        case "custom":
            const dateStr = format(date, "yyyy-MM-dd");
            return settings.custom_trading_sundays?.includes(dateStr) || false;
        default:
            return false;
    }
}

export function ScheduleCalendarDnD({
    year,
    month,
    holidays,
    employees,
    shifts: initialShifts,
    scheduleId,
    shiftTemplates,
    organizationSettings,
    employeePreferences,
}: ScheduleCalendarDnDProps) {
    const supabase = createClient();

    // Stan lokalnych zmian
    const [localShifts, setLocalShifts] = useState<LocalShift[]>(() =>
        initialShifts.map((s) => ({
            id: s.id,
            schedule_id: s.schedule_id,
            employee_id: s.employee_id,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            break_minutes: s.break_minutes,
            notes: s.notes,
            color: s.color,
            status: "unchanged" as const,
        }))
    );

    const [isSaving, setIsSaving] = useState(false);
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [activeShift, setActiveShift] = useState<LocalShift | null>(null);
    const [editingShift, setEditingShift] = useState<LocalShift | null>(null);
    const [mounted, setMounted] = useState(false);

    // Dla portal - potrzebne do renderowania overlay poza kontenerem
    useEffect(() => {
        setMounted(true);
    }, []);

    // Konfiguracja sensorów drag & drop (z obsługą touch dla mobile)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        })
    );

    // Sortuj szablony po godzinie startu (poranne na górze, wieczorne na dole)
    const sortedShiftTemplates = useMemo(() => {
        return [...shiftTemplates].sort((a, b) => {
            return a.start_time.localeCompare(b.start_time);
        });
    }, [shiftTemplates]);

    // Generuj dni miesiąca
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        return eachDayOfInterval({ start, end });
    }, [year, month]);

    // Mapa świąt
    const holidaysMap = useMemo(() => {
        const map = new Map<string, PublicHoliday>();
        holidays.forEach((h) => map.set(h.date, h));
        return map;
    }, [holidays]);

    // Aktywne zmiany (nie usunięte)
    const activeShifts = useMemo(
        () => localShifts.filter((s) => s.status !== "deleted"),
        [localShifts]
    );

    // Sprawdź czy są niezapisane zmiany
    const hasUnsavedChanges = useMemo(
        () => localShifts.some((s) => s.status !== "unchanged"),
        [localShifts]
    );

    // Oblicz godziny dla każdego pracownika
    const employeeHoursMap = useMemo(() => {
        const map = new Map<string, { scheduled: number; required: number }>();

        employees.forEach((emp) => {
            // Wymagane godziny na podstawie typu etatu
            const required = getRequiredHours(
                year,
                month,
                holidays,
                emp.employment_type,
                emp.custom_hours || undefined
            );

            // Rozpisane godziny z aktywnych zmian
            const employeeShifts = activeShifts.filter(
                (s) => s.employee_id === emp.id
            );
            const scheduled = calculateWorkedHours(employeeShifts);

            map.set(emp.id, { scheduled, required });
        });

        return map;
    }, [employees, activeShifts, year, month, holidays]);

    // Rozpoczęcie przeciągania
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === "employee") {
            setActiveEmployee(active.data.current.employee);
            setActiveShift(null);
        } else if (active.data.current?.type === "shift") {
            setActiveEmployee(active.data.current.employee);
            setActiveShift(active.data.current.shift);
        }
    }, []);

    // Zakończenie przeciągania
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveEmployee(null);
            setActiveShift(null);

            if (!over || !active.data.current || !over.data.current) return;

            // PRZYPADEK 1: Pracownik z listy upuszczony na komórkę
            if (
                active.data.current.type === "employee" &&
                over.data.current.type === "cell"
            ) {
                const employee = active.data.current.employee as Employee;
                const { date, template } = over.data.current as {
                    date: string;
                    template: ShiftTemplate;
                };

                // Sprawdź czy pracownik ma już zmianę w tym dniu
                const existingShift = activeShifts.find(
                    (s) => s.employee_id === employee.id && s.date === date
                );

                if (existingShift) {
                    toast.error(
                        `${employee.first_name} ${employee.last_name} ma już zmianę tego dnia`
                    );
                    return;
                }

                // Utwórz nową zmianę
                const newShift: LocalShift = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    schedule_id: scheduleId,
                    employee_id: employee.id,
                    date,
                    start_time: template.start_time,
                    end_time: template.end_time,
                    break_minutes: template.break_minutes,
                    notes: null,
                    color: template.color,
                    status: "new",
                };

                setLocalShifts((prev) => [...prev, newShift]);
                toast.success(
                    `Przypisano ${employee.first_name} do zmiany "${template.name}"`
                );
            }

            // PRZYPADEK 2: Zmiana przeciągnięta na inną komórkę (przeniesienie)
            if (
                active.data.current.type === "shift" &&
                over.data.current.type === "cell"
            ) {
                const draggedShift = active.data.current.shift as LocalShift;
                const draggedEmployee = active.data.current
                    .employee as Employee;
                const { date: targetDate, template: targetTemplate } = over.data
                    .current as {
                    date: string;
                    template: ShiftTemplate;
                };

                // Sprawdź czy to ta sama komórka
                if (
                    draggedShift.date === targetDate &&
                    draggedShift.start_time === targetTemplate.start_time &&
                    draggedShift.end_time === targetTemplate.end_time
                ) {
                    return; // Nie rób nic jeśli upuszczono w tym samym miejscu
                }

                // Sprawdź czy pracownik ma już zmianę w docelowym dniu
                const existingShiftInTargetDay = activeShifts.find(
                    (s) =>
                        s.employee_id === draggedShift.employee_id &&
                        s.date === targetDate &&
                        s.id !== draggedShift.id
                );

                if (existingShiftInTargetDay) {
                    toast.error(
                        `${draggedEmployee.first_name} ${draggedEmployee.last_name} ma już zmianę tego dnia`
                    );
                    return;
                }

                // Przenieś zmianę
                setLocalShifts((prev) =>
                    prev.map((s) => {
                        if (s.id !== draggedShift.id) return s;
                        return {
                            ...s,
                            date: targetDate,
                            start_time: targetTemplate.start_time,
                            end_time: targetTemplate.end_time,
                            break_minutes: targetTemplate.break_minutes,
                            color: targetTemplate.color,
                            status: s.status === "new" ? "new" : "modified",
                        };
                    })
                );
                toast.success(`Przeniesiono zmianę na ${targetDate}`);
            }

            // PRZYPADEK 3: Zmiana przeciągnięta na inną zmianę (zamiana)
            if (
                active.data.current.type === "shift" &&
                over.data.current.type === "shift"
            ) {
                const draggedShift = active.data.current.shift as LocalShift;
                const targetShift = over.data.current.shift as LocalShift;
                const draggedEmployee = active.data.current
                    .employee as Employee;
                const targetEmployee = over.data.current.employee as Employee;

                if (draggedShift.id === targetShift.id) return;

                // Zamień pracowników między zmianami
                setLocalShifts((prev) =>
                    prev.map((s) => {
                        if (s.id === draggedShift.id) {
                            return {
                                ...s,
                                employee_id: targetShift.employee_id,
                                status: s.status === "new" ? "new" : "modified",
                            };
                        }
                        if (s.id === targetShift.id) {
                            return {
                                ...s,
                                employee_id: draggedShift.employee_id,
                                status: s.status === "new" ? "new" : "modified",
                            };
                        }
                        return s;
                    })
                );
                toast.success(
                    `Zamieniono zmiany między ${draggedEmployee.first_name} a ${targetEmployee.first_name}`
                );
            }
        },
        [activeShifts, scheduleId]
    );

    // Usuń zmianę
    const handleRemoveShift = useCallback((shiftId: string) => {
        setLocalShifts((prev) =>
            prev.map((s) => {
                if (s.id !== shiftId) return s;
                // Jeśli to nowa zmiana, po prostu ją usuń
                if (s.status === "new") {
                    return { ...s, status: "deleted" as const };
                }
                // Jeśli istniejąca, oznacz jako usuniętą
                return { ...s, status: "deleted" as const };
            })
        );
    }, []);

    // Edytuj zmianę
    const handleEditShift = useCallback((shift: LocalShift) => {
        setEditingShift(shift);
    }, []);

    // Zapisz edycję zmiany
    const handleSaveShiftEdit = useCallback(
        (updatedShift: Partial<LocalShift>) => {
            if (!editingShift) return;

            setLocalShifts((prev) =>
                prev.map((s) => {
                    if (s.id !== editingShift.id) return s;
                    return {
                        ...s,
                        ...updatedShift,
                        status: s.status === "new" ? "new" : "modified",
                    };
                })
            );
            setEditingShift(null);
            toast.success("Zapisano zmiany");
        },
        [editingShift]
    );

    // Zapisz wszystkie zmiany do bazy
    const handleSaveAll = useCallback(async () => {
        if (!scheduleId) {
            toast.error("Brak identyfikatora grafiku");
            console.error("scheduleId jest pusty!");
            return;
        }

        setIsSaving(true);

        console.log("=== ROZPOCZYNAM ZAPIS ===");
        console.log("scheduleId:", scheduleId);
        console.log("Wszystkie zmiany:", localShifts);

        try {
            // Nowe zmiany do dodania
            const newShifts = localShifts
                .filter((s) => s.status === "new")
                .map((s) => ({
                    schedule_id: s.schedule_id,
                    employee_id: s.employee_id,
                    date: s.date,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    break_minutes: s.break_minutes,
                    notes: s.notes,
                    color: s.color,
                }));

            // Zmiany do aktualizacji
            const modifiedShifts = localShifts.filter(
                (s) => s.status === "modified"
            );

            // Zmiany do usunięcia (tylko te które istnieją w bazie)
            const deletedShiftIds = localShifts
                .filter(
                    (s) => s.status === "deleted" && !s.id.startsWith("temp-")
                )
                .map((s) => s.id);

            console.log("Nowe zmiany do dodania:", newShifts);
            console.log("Zmiany do aktualizacji:", modifiedShifts);
            console.log("ID zmian do usunięcia:", deletedShiftIds);

            // Wykonaj operacje sekwencyjnie i sprawdź błędy
            if (newShifts.length > 0) {
                console.log("Wysyłam INSERT...");
                const { data, error } = await supabase
                    .from("shifts")
                    .insert(newShifts)
                    .select();
                console.log("INSERT wynik - data:", data, "error:", error);
                if (error) {
                    console.error("Błąd dodawania zmian:", error);
                    toast.error(
                        `Błąd INSERT: ${error.message} (${error.code})`
                    );
                    setIsSaving(false);
                    return;
                }
            }

            for (const shift of modifiedShifts) {
                const { error } = await supabase
                    .from("shifts")
                    .update({
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        break_minutes: shift.break_minutes,
                        notes: shift.notes,
                        color: shift.color,
                    })
                    .eq("id", shift.id);
                if (error) {
                    console.error("Błąd aktualizacji zmiany:", error);
                    toast.error(
                        `Błąd UPDATE: ${error.message} (${error.code})`
                    );
                    setIsSaving(false);
                    return;
                }
            }

            if (deletedShiftIds.length > 0) {
                console.log("Wysyłam DELETE...");
                const { error } = await supabase
                    .from("shifts")
                    .delete()
                    .in("id", deletedShiftIds);
                console.log("DELETE wynik - error:", error);
                if (error) {
                    console.error("Błąd usuwania zmian:", error);
                    toast.error(
                        `Błąd DELETE: ${error.message} (${error.code})`
                    );
                    setIsSaving(false);
                    return;
                }
            }

            // Odśwież dane
            console.log("Pobieram odświeżone dane...");
            const { data: refreshedShifts, error: fetchError } = await supabase
                .from("shifts")
                .select("*")
                .eq("schedule_id", scheduleId);

            console.log(
                "Pobrane zmiany:",
                refreshedShifts,
                "error:",
                fetchError
            );

            if (fetchError) {
                console.error("Błąd pobierania zmian:", fetchError);
                toast.error(`Błąd SELECT: ${fetchError.message}`);
                setIsSaving(false);
                return;
            }

            console.log("Ustawiam nowy stan localShifts...");
            setLocalShifts(
                (refreshedShifts || []).map((s) => ({
                    ...s,
                    status: "unchanged" as const,
                }))
            );

            console.log("=== ZAPIS ZAKOŃCZONY SUKCESEM ===");
            toast.success("Grafik został zapisany");
        } catch (error: unknown) {
            console.error("Błąd zapisu:", error);
            const errorMessage =
                error instanceof Error ? error.message : JSON.stringify(error);
            toast.error(`Błąd: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    }, [localShifts, scheduleId, supabase]);

    // Dni tygodnia po polsku
    const dayNames = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-3 sm:space-y-4">
                {/* Przycisk zapisz - na samej górze z animacją */}
                <div
                    className={cn(
                        "overflow-hidden transition-all duration-300 ease-out",
                        hasUnsavedChanges
                            ? "max-h-24 opacity-100"
                            : "max-h-0 opacity-0"
                    )}
                >
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-amber-700">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs sm:text-sm font-medium">
                                Masz niezapisane zmiany
                            </span>
                        </div>
                        <Button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Zapisz grafik
                        </Button>
                    </div>
                </div>

                {/* Sekcja pracowników - nad grafikiem */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                            <Users className="h-4 w-4" />
                            Pracownicy
                        </h3>
                        <span className="text-xs text-slate-500">
                            <span className="hidden sm:inline">
                                Przeciągnij pracownika na zmianę •{" "}
                            </span>
                            {employees.length} os.
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {employees.map((employee) => {
                            const hours = employeeHoursMap.get(employee.id) || {
                                scheduled: 0,
                                required: 0,
                            };
                            return (
                                <DraggableEmployee
                                    key={employee.id}
                                    employee={employee}
                                    scheduledHours={hours.scheduled}
                                    requiredHours={hours.required}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Główny kalendarz */}
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                    <div className="min-w-[800px] lg:min-w-0">
                        {/* Nagłówek z dniami */}
                        <div className="bg-white border border-slate-200 rounded-t-lg overflow-hidden">
                            {/* Wiersz z numerami dni */}
                            <div
                                className="grid"
                                style={{
                                    gridTemplateColumns: `80px repeat(${daysInMonth.length}, minmax(28px, 1fr))`,
                                }}
                            >
                                <div className="p-1 sm:p-2 bg-slate-50 border-r border-b border-slate-200 flex items-center">
                                    <span className="font-medium capitalize text-xs sm:text-sm text-slate-700 ">
                                        {format(
                                            new Date(year, month - 1),
                                            "LLLL yyyy",
                                            { locale: pl }
                                        )}
                                    </span>
                                </div>
                                {daysInMonth.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const holiday = holidaysMap.get(dateStr);
                                    const isWeekendDay =
                                        isSaturday(day) || isSunday(day);
                                    const isTradingSun = isTradingSunday(
                                        day,
                                        organizationSettings
                                    );
                                    const dayOfWeek = getDay(day);
                                    const dayName =
                                        dayNames[
                                            dayOfWeek === 0 ? 6 : dayOfWeek - 1
                                        ];

                                    return (
                                        <div
                                            key={dateStr}
                                            className={cn(
                                                "p-0.5 sm:p-1 text-center border-r border-b border-slate-200",
                                                isWeekendDay &&
                                                    !isTradingSun &&
                                                    "bg-slate-100",
                                                holiday && "bg-red-50"
                                            )}
                                        >
                                            <div className="text-[10px] sm:text-xs text-slate-500">
                                                {dayName}
                                            </div>
                                            <div
                                                className={cn(
                                                    "text-xs sm:text-sm font-semibold",
                                                    isWeekendDay &&
                                                        !isTradingSun
                                                        ? "text-slate-400"
                                                        : "text-slate-900",
                                                    holiday && "text-red-600"
                                                )}
                                            >
                                                {format(day, "d")}
                                            </div>
                                            {holiday && (
                                                <div
                                                    className="text-[8px] sm:text-[9px] text-red-500 truncate hidden sm:block"
                                                    title={holiday.localName}
                                                >
                                                    {holiday.localName}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Wiersze ze zmianami */}
                            {sortedShiftTemplates.length === 0 ? (
                                <div className="p-4 sm:p-8 text-center text-slate-500">
                                    <p className="text-sm sm:text-base">
                                        Brak szablonów zmian.
                                    </p>
                                    <p className="text-xs sm:text-sm">
                                        Dodaj szablony zmian w ustawieniach, aby
                                        móc planować grafik.
                                    </p>
                                </div>
                            ) : (
                                sortedShiftTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="grid"
                                        style={{
                                            gridTemplateColumns: `80px repeat(${daysInMonth.length}, minmax(28px, 1fr))`,
                                        }}
                                    >
                                        {/* Nazwa zmiany */}
                                        <div
                                            className="p-1 sm:p-2 border-r border-b border-slate-200 flex items-center gap-1 sm:gap-2"
                                            style={{
                                                backgroundColor: `${template.color}15`,
                                            }}
                                        >
                                            <div className="min-w-0">
                                                <div className="font-medium text-[10px] sm:text-sm text-slate-900 truncate">
                                                    {template.name}
                                                </div>
                                                <div className="text-[9px] sm:text-[11px] text-slate-900">
                                                    {template.start_time.slice(
                                                        0,
                                                        5
                                                    )}{" "}
                                                    -{" "}
                                                    {template.end_time.slice(
                                                        0,
                                                        5
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Komórki dni */}
                                        {daysInMonth.map((day) => {
                                            const dateStr = format(
                                                day,
                                                "yyyy-MM-dd"
                                            );
                                            const holiday =
                                                holidaysMap.get(dateStr);
                                            const isWeekendDay =
                                                isSaturday(day) ||
                                                isSunday(day);
                                            const isTradingSun =
                                                isTradingSunday(
                                                    day,
                                                    organizationSettings
                                                );

                                            return (
                                                <DroppableShiftCell
                                                    key={`${dateStr}-${template.id}`}
                                                    date={dateStr}
                                                    template={template}
                                                    shifts={activeShifts}
                                                    employees={employees}
                                                    isWeekend={isWeekendDay}
                                                    isHoliday={!!holiday}
                                                    isTradingSunday={
                                                        isTradingSun
                                                    }
                                                    onRemoveShift={
                                                        handleRemoveShift
                                                    }
                                                    onEditShift={
                                                        handleEditShift
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Podsumowanie - liczba pracowników na dzień */}
                        <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-lg">
                            <div
                                className="grid"
                                style={{
                                    gridTemplateColumns: `80px repeat(${daysInMonth.length}, minmax(28px, 1fr))`,
                                }}
                            >
                                <div className="p-1 sm:p-2 text-[9px] sm:text-xs font-medium text-slate-600">
                                    <span className="hidden sm:inline">
                                        Razem pracowników
                                    </span>
                                    <span className="sm:hidden">Suma</span>
                                </div>
                                {daysInMonth.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const count = activeShifts.filter(
                                        (s) => s.date === dateStr
                                    ).length;
                                    return (
                                        <div
                                            key={dateStr}
                                            className={cn(
                                                "p-1 sm:p-2 text-center text-[10px] sm:text-xs font-semibold",
                                                count === 0
                                                    ? "text-slate-300"
                                                    : count < 2
                                                    ? "text-orange-500"
                                                    : "text-green-600"
                                            )}
                                        >
                                            {count || "-"}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlay podczas przeciągania - renderowany przez portal na body */}
            {mounted &&
                createPortal(
                    <DragOverlay
                        dropAnimation={null}
                        modifiers={[snapCenterToCursor]}
                    >
                        {activeEmployee && (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xl pointer-events-none"
                                style={{
                                    backgroundColor:
                                        (
                                            activeEmployee as Employee & {
                                                color?: string;
                                            }
                                        ).color || "#3b82f6",
                                }}
                            >
                                {activeEmployee.first_name[0]}
                                {activeEmployee.last_name[0]}
                            </div>
                        )}
                    </DragOverlay>,
                    document.body
                )}

            {/* Dialog edycji zmiany */}
            {editingShift && (
                <ShiftEditDialog
                    shift={editingShift}
                    employee={
                        employees.find(
                            (e) => e.id === editingShift.employee_id
                        )!
                    }
                    shiftTemplates={shiftTemplates}
                    onSave={handleSaveShiftEdit}
                    onClose={() => setEditingShift(null)}
                    onDelete={() => {
                        handleRemoveShift(editingShift.id);
                        setEditingShift(null);
                    }}
                />
            )}
        </DndContext>
    );
}
