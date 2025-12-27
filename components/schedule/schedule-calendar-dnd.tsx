"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
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
    const [editingShift, setEditingShift] = useState<LocalShift | null>(null);
    const [mounted, setMounted] = useState(false);

    // Dla portal - potrzebne do renderowania overlay poza kontenerem
    useEffect(() => {
        setMounted(true);
    }, []);

    // Konfiguracja sensorów drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
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
        }
    }, []);

    // Zakończenie przeciągania
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveEmployee(null);

            if (!over || !active.data.current || !over.data.current) return;

            // Sprawdź czy to pracownik upuszczony na komórkę
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
        setIsSaving(true);

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

            // Wykonaj operacje
            const operations = [];

            if (newShifts.length > 0) {
                operations.push(supabase.from("shifts").insert(newShifts));
            }

            for (const shift of modifiedShifts) {
                operations.push(
                    supabase
                        .from("shifts")
                        .update({
                            start_time: shift.start_time,
                            end_time: shift.end_time,
                            break_minutes: shift.break_minutes,
                            notes: shift.notes,
                            color: shift.color,
                        })
                        .eq("id", shift.id)
                );
            }

            if (deletedShiftIds.length > 0) {
                operations.push(
                    supabase.from("shifts").delete().in("id", deletedShiftIds)
                );
            }

            await Promise.all(operations);

            // Odśwież dane
            const { data: refreshedShifts } = await supabase
                .from("shifts")
                .select("*")
                .eq("schedule_id", scheduleId);

            setLocalShifts(
                (refreshedShifts || []).map((s) => ({
                    ...s,
                    status: "unchanged" as const,
                }))
            );

            toast.success("Grafik został zapisany");
        } catch (error) {
            console.error("Błąd zapisu:", error);
            toast.error("Wystąpił błąd podczas zapisywania");
        } finally {
            setIsSaving(false);
        }
    }, [localShifts, scheduleId, supabase]);

    // Dni tygodnia po polsku
    const dayNames = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-4">
                {/* Przycisk zapisz - na samej górze z animacją */}
                <div
                    className={cn(
                        "overflow-hidden transition-all duration-300 ease-out",
                        hasUnsavedChanges
                            ? "max-h-20 opacity-100"
                            : "max-h-0 opacity-0"
                    )}
                >
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-sm font-medium">
                                Masz niezapisane zmiany
                            </span>
                        </div>
                        <Button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700"
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
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Pracownicy
                        </h3>
                        <span className="text-xs text-slate-500">
                            Przeciągnij pracownika na zmianę •{" "}
                            {employees.length} os.
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                        {/* Nagłówek z dniami */}
                        <div className="bg-white border border-slate-200 rounded-t-lg overflow-hidden">
                            {/* Wiersz z numerami dni */}
                            <div
                                className="grid"
                                style={{
                                    gridTemplateColumns: `120px repeat(${daysInMonth.length}, minmax(40px, 1fr))`,
                                }}
                            >
                                <div className="p-2 bg-slate-50 border-r border-b border-slate-200 flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                                    <span className="font-medium text-sm text-slate-700">
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
                                                "p-1 text-center border-r border-b border-slate-200",
                                                isWeekendDay &&
                                                    !isTradingSun &&
                                                    "bg-slate-100",
                                                holiday && "bg-red-50"
                                            )}
                                        >
                                            <div className="text-xs text-slate-500">
                                                {dayName}
                                            </div>
                                            <div
                                                className={cn(
                                                    "text-sm font-semibold",
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
                                                    className="text-[9px] text-red-500 truncate"
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
                                <div className="p-8 text-center text-slate-500">
                                    <p>Brak szablonów zmian.</p>
                                    <p className="text-sm">
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
                                            gridTemplateColumns: `120px repeat(${daysInMonth.length}, minmax(40px, 1fr))`,
                                        }}
                                    >
                                        {/* Nazwa zmiany */}
                                        <div
                                            className="p-2 border-r border-b border-slate-200 flex items-center gap-2"
                                            style={{
                                                backgroundColor: `${template.color}15`,
                                            }}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        template.color,
                                                }}
                                            />
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm text-slate-900 truncate">
                                                    {template.name}
                                                </div>
                                                <div className="text-xs text-slate-500">
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
                                    gridTemplateColumns: `120px repeat(${daysInMonth.length}, minmax(40px, 1fr))`,
                                }}
                            >
                                <div className="p-2 text-xs font-medium text-slate-600">
                                    Razem pracowników
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
                                                "p-2 text-center text-xs font-semibold",
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
                    <DragOverlay dropAnimation={null}>
                        {activeEmployee && (
                            <div
                                className="bg-white border-2 shadow-xl rounded-lg px-3 py-2 flex items-center gap-2 pointer-events-none"
                                style={{
                                    borderColor:
                                        (
                                            activeEmployee as Employee & {
                                                color?: string;
                                            }
                                        ).color || "#3b82f6",
                                }}
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
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
                                <span className="font-medium text-sm text-slate-900">
                                    {activeEmployee.first_name}{" "}
                                    {activeEmployee.last_name}
                                </span>
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
