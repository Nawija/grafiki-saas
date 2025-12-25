"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isWeekend,
    getDay,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
    Employee,
    ShiftTemplate,
    OrganizationSettings,
    EmployeePreferences,
} from "@/types/database";
import { PublicHoliday } from "@/types";
import { isHoliday } from "@/lib/api/holidays";
import {
    getRequiredHours,
    calculateWorkedHours,
    formatHours,
} from "@/lib/utils/work-hours";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocalShiftEditor, LocalShift } from "./local-shift-editor";
import { toast } from "sonner";
import {
    Users,
    GripVertical,
    Loader2,
    Save,
    Undo2,
} from "lucide-react";

interface Shift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
        employment_type: "full" | "half" | "custom";
        custom_hours: number | null;
    };
}

interface ScheduleCalendarProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    shifts: Shift[];
    scheduleId: string;
    shiftTemplates?: ShiftTemplate[];
    organizationSettings?: OrganizationSettings | null;
    employeePreferences?: EmployeePreferences[];
}

const DAYS_PL = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

// Generuj unikalne ID dla nowych zmian
let tempIdCounter = 0;
const generateTempId = () => `temp_${Date.now()}_${++tempIdCounter}`;

export function ScheduleCalendar({
    year,
    month,
    holidays,
    employees,
    shifts: initialShifts,
    scheduleId,
    shiftTemplates = [],
    organizationSettings,
    employeePreferences = [],
}: ScheduleCalendarProps) {
    const router = useRouter();

    // LOKALNY STAN ZMIAN
    const [localShifts, setLocalShifts] = useState<LocalShift[]>(() =>
        initialShifts.map((s) => ({
            ...s,
            _status: "unchanged" as const,
            _originalId: s.id,
        }))
    );

    const [selectedCell, setSelectedCell] = useState<{
        employeeId: string;
        date: string;
    } | null>(null);

    // Drag & Drop state
    const [draggedShift, setDraggedShift] = useState<LocalShift | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{
        employeeId: string;
        date: string;
    } | null>(null);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Oblicz czy są niezapisane zmiany
    const hasUnsavedChanges = useMemo(() => {
        return localShifts.some((s) => s._status !== "unchanged");
    }, [localShifts]);

    const pendingChangesCount = useMemo(() => {
        return localShifts.filter((s) => s._status !== "unchanged").length;
    }, [localShifts]);

    // Filtruj tylko widoczne zmiany (nie usunięte)
    const visibleShifts = useMemo(() => {
        return localShifts.filter((s) => s._status !== "deleted");
    }, [localShifts]);

    // Sprawdź czy dana niedziela jest handlowa
    const isTradingSunday = (date: Date): boolean => {
        if (getDay(date) !== 0) return false;
        const mode = organizationSettings?.trading_sundays_mode || "none";
        if (mode === "all") return true;
        if (mode === "none") return false;
        const dateStr = format(date, "yyyy-MM-dd");
        return (
            organizationSettings?.custom_trading_sundays?.includes(dateStr) ||
            false
        );
    };

    // Oblicz przepracowane godziny dla każdego pracownika (używając lokalnych zmian)
    const employeeHours = employees.map((employee) => {
        const employeeShifts = visibleShifts.filter(
            (s) => s.employee_id === employee.id
        );
        const workedHours = calculateWorkedHours(employeeShifts as any);
        const requiredHours = getRequiredHours(
            year,
            month,
            holidays,
            employee.employment_type,
            employee.custom_hours ?? undefined
        );

        return {
            ...employee,
            workedHours,
            requiredHours,
            remainingHours: requiredHours - workedHours,
        };
    });

    // Oblicz liczbę osób na zmianie dla każdego dnia
    const staffCountByDay = days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = visibleShifts.filter((s) => s.date === dateStr);

        const shiftsByType = dayShifts.reduce((acc, shift) => {
            const startTime = shift.start_time.substring(0, 5);
            const endTime = shift.end_time.substring(0, 5);
            const key = `${startTime}-${endTime}`;

            if (!acc[key]) {
                const template = shiftTemplates.find(
                    (t) =>
                        t.start_time.substring(0, 5) === startTime &&
                        t.end_time.substring(0, 5) === endTime
                );
                acc[key] = {
                    count: 0,
                    name: template?.name || `${startTime}-${endTime}`,
                    color: shift.color || template?.color || "#3b82f6",
                };
            }
            acc[key].count++;
            return acc;
        }, {} as Record<string, { count: number; name: string; color: string }>);

        return {
            date: dateStr,
            count: dayShifts.length,
            byType: shiftsByType,
        };
    });

    function getShiftForCell(
        employeeId: string,
        date: Date
    ): LocalShift | undefined {
        const dateStr = format(date, "yyyy-MM-dd");
        return visibleShifts.find(
            (s) => s.employee_id === employeeId && s.date === dateStr
        );
    }

    // Pobierz preferencje dla pracownika
    function getEmployeePreference(
        employeeId: string
    ): EmployeePreferences | undefined {
        return employeePreferences.find((p) => p.employee_id === employeeId);
    }

    // Sprawdź status dnia dla pracownika na podstawie preferencji
    function getDayPreferenceStatus(
        employeeId: string,
        dayOfWeek: number
    ): "preferred" | "unavailable" | "neutral" {
        const pref = getEmployeePreference(employeeId);
        if (!pref) return "neutral";

        if (pref.unavailable_days?.includes(dayOfWeek)) return "unavailable";
        if (pref.preferred_days?.includes(dayOfWeek)) return "preferred";
        return "neutral";
    }

    // LOKALNY ZAPIS ZMIANY
    const handleLocalSave = useCallback(
        (
            shiftData: Omit<LocalShift, "id" | "_status"> & {
                _status?: "new" | "modified";
                _originalId?: string;
            }
        ) => {
            setLocalShifts((prev) => {
                // Sprawdź czy edytujemy istniejącą zmianę
                const existingIndex = prev.findIndex(
                    (s) =>
                        s.employee_id === shiftData.employee_id &&
                        s.date === shiftData.date &&
                        s._status !== "deleted"
                );

                if (existingIndex >= 0) {
                    // Aktualizuj istniejącą
                    const existing = prev[existingIndex];
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...shiftData,
                        id: existing.id,
                        _status:
                            existing._status === "new" ? "new" : "modified",
                        _originalId: existing._originalId,
                    } as LocalShift;
                    return updated;
                } else {
                    // Dodaj nową
                    return [
                        ...prev,
                        {
                            ...shiftData,
                            id: generateTempId(),
                            _status: "new",
                        } as LocalShift,
                    ];
                }
            });
        },
        []
    );

    // LOKALNE USUWANIE ZMIANY
    const handleLocalDelete = useCallback((shiftId: string) => {
        setLocalShifts((prev) => {
            const shift = prev.find((s) => s.id === shiftId);
            if (!shift) return prev;

            // Jeśli to nowa zmiana, po prostu ją usuń
            if (shift._status === "new") {
                return prev.filter((s) => s.id !== shiftId);
            }

            // W przeciwnym razie oznacz jako usuniętą
            return prev.map((s) =>
                s.id === shiftId ? { ...s, _status: "deleted" as const } : s
            );
        });
    }, []);

    // Drag handlers (lokalnie)
    const handleDragStart = useCallback(
        (e: React.DragEvent, shift: LocalShift) => {
            setDraggedShift(shift);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", shift.id);
        },
        []
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent, employeeId: string, dateStr: string) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverCell({ employeeId, date: dateStr });
        },
        []
    );

    const handleDragLeave = useCallback(() => {
        setDragOverCell(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, targetEmployeeId: string, targetDate: string) => {
            e.preventDefault();
            setDragOverCell(null);

            if (!draggedShift) return;

            if (
                draggedShift.employee_id === targetEmployeeId &&
                draggedShift.date === targetDate
            ) {
                setDraggedShift(null);
                return;
            }

            // Lokalnie przenieś/zamień zmiany
            setLocalShifts((prev) => {
                const sourceShift = prev.find((s) => s.id === draggedShift.id);
                if (!sourceShift) return prev;

                const targetShift = prev.find(
                    (s) =>
                        s.employee_id === targetEmployeeId &&
                        s.date === targetDate &&
                        s._status !== "deleted"
                );

                return prev.map((s) => {
                    if (s.id === sourceShift.id) {
                        return {
                            ...s,
                            employee_id: targetEmployeeId,
                            date: targetDate,
                            _status: s._status === "new" ? "new" : "modified",
                        } as LocalShift;
                    }
                    if (targetShift && s.id === targetShift.id) {
                        return {
                            ...s,
                            employee_id: sourceShift.employee_id,
                            date: sourceShift.date,
                            _status: s._status === "new" ? "new" : "modified",
                        } as LocalShift;
                    }
                    return s;
                });
            });

            setDraggedShift(null);
        },
        [draggedShift]
    );

    const handleDragEnd = useCallback(() => {
        setDraggedShift(null);
        setDragOverCell(null);
    }, []);

    // ZAPISZ WSZYSTKIE ZMIANY DO BAZY
    const handleSaveAllChanges = async () => {
        setIsSaving(true);

        try {
            const supabase = createClient();

            const toInsert = localShifts.filter((s) => s._status === "new");
            const toUpdate = localShifts.filter(
                (s) => s._status === "modified"
            );
            const toDelete = localShifts.filter((s) => s._status === "deleted");

            // Usuń zmiany
            if (toDelete.length > 0) {
                const deleteIds = toDelete
                    .map((s) => s._originalId)
                    .filter(Boolean) as string[];

                if (deleteIds.length > 0) {
                    const { error } = await supabase
                        .from("shifts")
                        .delete()
                        .in("id", deleteIds);
                    if (error) throw error;
                }
            }

            // Aktualizuj istniejące
            for (const shift of toUpdate) {
                if (!shift._originalId) continue;
                const { error } = await supabase
                    .from("shifts")
                    .update({
                        employee_id: shift.employee_id,
                        date: shift.date,
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        break_minutes: shift.break_minutes,
                        notes: shift.notes,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", shift._originalId);
                if (error) throw error;
            }

            // Dodaj nowe i pobierz ich ID
            let insertedShifts: {
                id: string;
                employee_id: string;
                date: string;
            }[] = [];
            if (toInsert.length > 0) {
                const insertData = toInsert.map((s) => ({
                    schedule_id: scheduleId,
                    employee_id: s.employee_id,
                    date: s.date,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    break_minutes: s.break_minutes,
                    notes: s.notes,
                }));

                const { data, error } = await supabase
                    .from("shifts")
                    .insert(insertData)
                    .select("id, employee_id, date");
                if (error) throw error;
                insertedShifts = data || [];
            }

            // Po zapisaniu zaktualizuj lokalny stan
            setLocalShifts((prev) =>
                prev
                    .filter((s) => s._status !== "deleted")
                    .map((s) => {
                        // Dla nowych zmian, znajdź prawdziwe ID z bazy
                        if (s._status === "new") {
                            const inserted = insertedShifts.find(
                                (ins) =>
                                    ins.employee_id === s.employee_id &&
                                    ins.date === s.date
                            );
                            return {
                                ...s,
                                id: inserted?.id || s.id,
                                _status: "unchanged" as const,
                                _originalId: inserted?.id || s.id,
                            };
                        }
                        return {
                            ...s,
                            _status: "unchanged" as const,
                        };
                    })
            );

            toast.success(
                `Zapisano ${
                    toInsert.length + toUpdate.length + toDelete.length
                } zmian`
            );
        } catch (error: any) {
            console.error("Error saving changes:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            const errorMessage =
                error?.message ||
                error?.code ||
                error?.details ||
                (typeof error === "object"
                    ? JSON.stringify(error)
                    : String(error)) ||
                "Nieznany błąd";
            toast.error(`Błąd podczas zapisywania: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ODRZUĆ ZMIANY
    const handleDiscardChanges = useCallback(() => {
        setLocalShifts(
            initialShifts.map((s) => ({
                ...s,
                _status: "unchanged" as const,
                _originalId: s.id,
            }))
        );
        toast.info("Zmiany zostały odrzucone");
    }, [initialShifts]);

    if (employees.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                        Dodaj pracowników, aby tworzyć grafik pracy
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Pasek z przyciskiem zapisu - fixed w prawym górnym rogu z animacją */}
            <div
                className={cn(
                    "fixed top-4 right-4 z-50 bg-amber-50 dark:bg-amber-950/95 border border-amber-200 dark:border-amber-800 p-3 rounded-xl shadow-lg flex items-center gap-3",
                    "transition-all duration-300 ease-out",
                    hasUnsavedChanges
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
                )}
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {pendingChangesCount} zmian
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDiscardChanges}
                        disabled={isSaving}
                        className="h-8 px-2"
                    >
                        <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSaveAllChanges}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 h-8"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Zapisz
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">
                            Harmonogram pracy
                        </CardTitle>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span>Przeciągnij zmianę aby przenieść</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto -mx-px">
                    <div className="min-w-[800px] sm:min-w-[1200px]">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800">
                                    <th className="border p-1 sm:p-2 text-left sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 w-[140px] sm:w-[180px]">
                                        <span className="text-xs sm:text-sm">
                                            Pracownik
                                        </span>
                                    </th>
                                    {days.map((day, idx) => {
                                        const dayOfWeek = getDay(day);
                                        const holiday = isHoliday(
                                            day,
                                            holidays
                                        );
                                        const isSunday = dayOfWeek === 0;
                                        const isTradingSun =
                                            isTradingSunday(day);
                                        const staffCount =
                                            staffCountByDay[idx].count;

                                        return (
                                            <th
                                                key={day.toISOString()}
                                                className={cn(
                                                    "border p-0.5 sm:p-1 text-center w-[55px] sm:w-[75px]",
                                                    dayOfWeek === 6 &&
                                                        "bg-slate-200 dark:bg-slate-600",
                                                    isSunday &&
                                                        !isTradingSun &&
                                                        "bg-red-100 dark:bg-red-900/70",
                                                    isSunday &&
                                                        isTradingSun &&
                                                        "bg-green-100 dark:bg-green-900/70",
                                                    holiday &&
                                                        !isSunday &&
                                                        "bg-red-100 dark:bg-red-900"
                                                )}
                                            >
                                                <div className="text-xs text-muted-foreground">
                                                    {DAYS_PL[dayOfWeek]}
                                                </div>
                                                <div className="font-semibold">
                                                    {format(day, "d")}
                                                </div>
                                                {holiday && !isSunday && (
                                                    <div
                                                        className="text-[8px] sm:text-[10px] text-red-600 dark:text-red-400 truncate hidden sm:block"
                                                        title={
                                                            holiday.localName
                                                        }
                                                    >
                                                        {holiday.localName.substring(
                                                            0,
                                                            8
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-center gap-0.5 mt-0.5 sm:mt-1 text-[10px] sm:text-xs",
                                                        staffCount === 0 &&
                                                            "text-slate-400",
                                                        staffCount > 0 &&
                                                            staffCount < 3 &&
                                                            "text-orange-500",
                                                        staffCount >= 3 &&
                                                            "text-green-600"
                                                    )}
                                                >
                                                    <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                    <span className="font-medium">
                                                        {staffCount}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th className="border p-1 sm:p-2 text-center w-[70px] sm:w-[90px]">
                                        <span className="text-xs sm:text-sm">
                                            Suma
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeHours.map((employee) => (
                                    <tr
                                        key={employee.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="border p-1 sm:p-2 sticky left-0 bg-white dark:bg-slate-900 z-10">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-xs sm:text-sm truncate">
                                                        <span className="sm:hidden">
                                                            {
                                                                employee
                                                                    .first_name[0]
                                                            }
                                                            .{" "}
                                                            {employee.last_name}
                                                        </span>
                                                        <span className="hidden sm:inline">
                                                            {
                                                                employee.first_name
                                                            }{" "}
                                                            {employee.last_name}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatHours(
                                                            employee.workedHours
                                                        )}{" "}
                                                        /{" "}
                                                        {formatHours(
                                                            employee.requiredHours
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {days.map((day) => {
                                            const shift = getShiftForCell(
                                                employee.id,
                                                day
                                            );
                                            const dayOfWeek = getDay(day);
                                            const isSaturday = dayOfWeek === 6;
                                            const isSunday = dayOfWeek === 0;
                                            const isTradingSun =
                                                isTradingSunday(day);
                                            const holiday = isHoliday(
                                                day,
                                                holidays
                                            );
                                            const dateStr = format(
                                                day,
                                                "yyyy-MM-dd"
                                            );
                                            const isDragOver =
                                                dragOverCell?.employeeId ===
                                                    employee.id &&
                                                dragOverCell?.date === dateStr;
                                            const isDragging =
                                                draggedShift?.id === shift?.id;
                                            const prefStatus =
                                                getDayPreferenceStatus(
                                                    employee.id,
                                                    dayOfWeek
                                                );

                                            return (
                                                <td
                                                    key={day.toISOString()}
                                                    className={cn(
                                                        "border p-0 text-center transition-all duration-200 relative",
                                                        !shift &&
                                                            prefStatus ===
                                                                "unavailable" &&
                                                            "bg-red-100 dark:bg-red-900/40",
                                                        !shift &&
                                                            prefStatus ===
                                                                "preferred" &&
                                                            "bg-green-100 dark:bg-green-900/40",
                                                        !shift &&
                                                            prefStatus ===
                                                                "neutral" &&
                                                            isSaturday &&
                                                            "bg-slate-100 dark:bg-slate-700",
                                                        !shift &&
                                                            prefStatus ===
                                                                "neutral" &&
                                                            isSunday &&
                                                            !isTradingSun &&
                                                            "bg-red-50 dark:bg-red-900/30",
                                                        !shift &&
                                                            prefStatus ===
                                                                "neutral" &&
                                                            isSunday &&
                                                            isTradingSun &&
                                                            "bg-green-50 dark:bg-green-900/30",
                                                        !shift &&
                                                            prefStatus ===
                                                                "neutral" &&
                                                            holiday &&
                                                            !isSunday &&
                                                            "bg-red-50/50 dark:bg-red-950/50",
                                                        !shift &&
                                                            "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700",
                                                        isDragOver &&
                                                            "ring-2 ring-blue-500 ring-inset rounded-md bg-blue-50 dark:bg-blue-950/30",
                                                        isDragging &&
                                                            "opacity-50"
                                                    )}
                                                    onClick={() =>
                                                        !shift &&
                                                        setSelectedCell({
                                                            employeeId:
                                                                employee.id,
                                                            date: dateStr,
                                                        })
                                                    }
                                                    onDragOver={(e) =>
                                                        handleDragOver(
                                                            e,
                                                            employee.id,
                                                            dateStr
                                                        )
                                                    }
                                                    onDragLeave={
                                                        handleDragLeave
                                                    }
                                                    onDrop={(e) =>
                                                        handleDrop(
                                                            e,
                                                            employee.id,
                                                            dateStr
                                                        )
                                                    }
                                                >
                                                    {shift ? (
                                                        (() => {
                                                            const matchingTemplate =
                                                                shiftTemplates.find(
                                                                    (t) =>
                                                                        t.start_time.substring(
                                                                            0,
                                                                            5
                                                                        ) ===
                                                                            shift.start_time.substring(
                                                                                0,
                                                                                5
                                                                            ) &&
                                                                        t.end_time.substring(
                                                                            0,
                                                                            5
                                                                        ) ===
                                                                            shift.end_time.substring(
                                                                                0,
                                                                                5
                                                                            )
                                                                );
                                                            const shiftColor =
                                                                shift.color ||
                                                                matchingTemplate?.color ||
                                                                "#3b82f6";
                                                            const templateName =
                                                                matchingTemplate?.name ||
                                                                "";
                                                            const isModified =
                                                                shift._status !==
                                                                "unchanged";

                                                            return (
                                                                <div className="p-0.5 sm:p-1 h-full">
                                                                    <div
                                                                        draggable
                                                                        onDragStart={(
                                                                            e
                                                                        ) =>
                                                                            handleDragStart(
                                                                                e,
                                                                                shift
                                                                            )
                                                                        }
                                                                        onDragEnd={
                                                                            handleDragEnd
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedCell(
                                                                                {
                                                                                    employeeId:
                                                                                        employee.id,
                                                                                    date: dateStr,
                                                                                }
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            "group relative cursor-grab active:cursor-grabbing h-full min-h-[36px] sm:min-h-[42px]",
                                                                            "flex flex-col items-start justify-between p-1 sm:p-1.5 transition-all hover:scale-[1.03] hover:shadow-md rounded-md",
                                                                            isDragging &&
                                                                                "ring-2 ring-white shadow-lg scale-105",
                                                                            isModified &&
                                                                                "ring-2 ring-amber-400"
                                                                        )}
                                                                        style={{
                                                                            background: `linear-gradient(135deg, ${shiftColor} 0%, ${shiftColor}dd 100%)`,
                                                                        }}
                                                                    >
                                                                        {/* Wskaźnik niezapisanej zmiany */}
                                                                        {isModified && (
                                                                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                                                                        )}

                                                                        <div className="text-[10px] sm:text-xs font-bold text-white leading-tight text-center w-full">
                                                                            <div>
                                                                                {shift.start_time.substring(
                                                                                    0,
                                                                                    5
                                                                                )}
                                                                            </div>
                                                                            <div className="opacity-80">
                                                                                {shift.end_time.substring(
                                                                                    0,
                                                                                    5
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {templateName && (
                                                                            <div className="text-[7px] sm:text-[8px] font-medium text-white/80 bg-black/20 px-1 rounded leading-tight">
                                                                                {
                                                                                    templateName
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="h-full min-h-[40px] sm:min-h-[48px] flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded m-0.5 sm:m-1 relative">
                                                            {prefStatus ===
                                                                "preferred" && (
                                                                <div
                                                                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500"
                                                                    title="Preferowany dzień"
                                                                />
                                                            )}
                                                            {prefStatus ===
                                                                "unavailable" && (
                                                                <div
                                                                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500"
                                                                    title="Niedostępny"
                                                                />
                                                            )}
                                                            <span className="text-slate-300 dark:text-slate-600 text-lg sm:text-xl font-light">
                                                                +
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="border p-1 sm:p-2 text-center">
                                            <div
                                                className={cn(
                                                    "font-semibold text-xs sm:text-sm",
                                                    employee.remainingHours >
                                                        0 && "text-orange-600",
                                                    employee.remainingHours <
                                                        0 && "text-red-600",
                                                    employee.remainingHours ===
                                                        0 && "text-green-600"
                                                )}
                                            >
                                                {formatHours(
                                                    employee.workedHours
                                                )}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                                                {employee.remainingHours > 0
                                                    ? `Brakuje: ${formatHours(
                                                          employee.remainingHours
                                                      )}`
                                                    : employee.remainingHours <
                                                      0
                                                    ? `Nadgodziny: ${formatHours(
                                                          Math.abs(
                                                              employee.remainingHours
                                                          )
                                                      )}`
                                                    : "OK"}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-100 dark:bg-slate-800 font-medium">
                                    <td className="border p-1 sm:p-2 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                                        <span className="text-xs sm:text-sm">
                                            Obsada
                                        </span>
                                    </td>
                                    {days.map((day, idx) => (
                                        <td
                                            key={day.toISOString()}
                                            className="border p-0.5 sm:p-1 text-center"
                                        >
                                            {staffCountByDay[idx].count > 0 && (
                                                <div className="flex flex-col gap-0.5 items-start">
                                                    {Object.entries(
                                                        staffCountByDay[idx]
                                                            .byType
                                                    ).map(([key, data]) => (
                                                        <div
                                                            key={key}
                                                            className="flex items-center gap-0.5"
                                                            title={data.name}
                                                        >
                                                            <div
                                                                className="w-2 h-2 rounded-full shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        data.color,
                                                                }}
                                                            />
                                                            <span className="text-[10px] sm:text-xs font-medium">
                                                                {data.count}
                                                            </span>
                                                            <span className="text-[8px] text-muted-foreground hidden sm:inline truncate max-w-[40px]">
                                                                {data.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td className="border p-1 sm:p-2 text-center">
                                        <div className="text-[10px] sm:text-sm">
                                            <span className="hidden sm:inline">
                                                Śr:{" "}
                                            </span>
                                            {(
                                                staffCountByDay.reduce(
                                                    (acc, d) => acc + d.count,
                                                    0
                                                ) / days.length
                                            ).toFixed(1)}
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>

                {/* Legenda preferencji */}
                {employeePreferences.length > 0 && (
                    <div className="px-3 pb-3 sm:px-6 sm:pb-4 border-t pt-3">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                            <span className="text-muted-foreground font-medium">
                                Preferencje:
                            </span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span>Preferowany dzień</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span>Niedostępny</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <span>Niezapisana zmiana</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Local Shift Editor Dialog */}
            {selectedCell && (
                <LocalShiftEditor
                    open={!!selectedCell}
                    onOpenChange={(open) => !open && setSelectedCell(null)}
                    scheduleId={scheduleId}
                    employeeId={selectedCell.employeeId}
                    date={selectedCell.date}
                    existingShift={visibleShifts.find(
                        (s) =>
                            s.employee_id === selectedCell.employeeId &&
                            s.date === selectedCell.date
                    )}
                    employee={
                        employees.find((e) => e.id === selectedCell.employeeId)!
                    }
                    templates={shiftTemplates}
                    onSave={handleLocalSave}
                    onDelete={handleLocalDelete}
                />
            )}
        </>
    );
}
