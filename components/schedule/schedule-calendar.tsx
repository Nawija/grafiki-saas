"use client";

import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ShiftEditor } from "./shift-editor";
import {
    Users,
    ArrowLeftRight,
    GripVertical,
    Loader2,
    ShoppingBag,
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

export function ScheduleCalendar({
    year,
    month,
    holidays,
    employees,
    shifts,
    scheduleId,
    shiftTemplates = [],
    organizationSettings,
    employeePreferences = [],
}: ScheduleCalendarProps) {
    const router = useRouter();
    const [selectedCell, setSelectedCell] = useState<{
        employeeId: string;
        date: string;
    } | null>(null);

    // Drag & Drop state
    const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{
        employeeId: string;
        date: string;
    } | null>(null);
    const [isMoving, setIsMoving] = useState(false);

    // Swap dialog state
    const [swapDialog, setSwapDialog] = useState<{
        shift: Shift;
        open: boolean;
    } | null>(null);
    const [swapTargetEmployee, setSwapTargetEmployee] = useState<string>("");
    const [isSwapping, setIsSwapping] = useState(false);

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Sprawdź czy dana niedziela jest handlowa
    const isTradingSunday = (date: Date): boolean => {
        if (getDay(date) !== 0) return false; // Nie niedziela

        const mode = organizationSettings?.trading_sundays_mode || "none";

        if (mode === "all") return true;
        if (mode === "none") return false;

        // Custom mode
        const dateStr = format(date, "yyyy-MM-dd");
        return (
            organizationSettings?.custom_trading_sundays?.includes(dateStr) ||
            false
        );
    };

    // Oblicz przepracowane godziny dla każdego pracownika
    const employeeHours = employees.map((employee) => {
        const employeeShifts = shifts.filter(
            (s) => s.employee_id === employee.id
        );
        const workedHours = calculateWorkedHours(employeeShifts);
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

    // Oblicz liczbę osób na zmianie dla każdego dnia - grupuj wg typu zmiany (czas start-end)
    const staffCountByDay = days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dateStr);

        // Grupuj zmiany wg kombinacji start_time + end_time (czyli typu zmiany)
        const shiftsByType = dayShifts.reduce((acc, shift) => {
            const startTime = shift.start_time.substring(0, 5);
            const endTime = shift.end_time.substring(0, 5);
            const key = `${startTime}-${endTime}`;

            if (!acc[key]) {
                // Znajdź szablon pasujący do tego czasu
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
    ): Shift | undefined {
        const dateStr = format(date, "yyyy-MM-dd");
        return shifts.find(
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

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, shift: Shift) => {
        setDraggedShift(shift);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", shift.id);

        // Custom drag image
        const dragImage = document.createElement("div");
        dragImage.className =
            "bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium";
        dragImage.textContent = `${shift.start_time.substring(
            0,
            5
        )}-${shift.end_time.substring(0, 5)}`;
        dragImage.style.position = "absolute";
        dragImage.style.top = "-1000px";
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 50, 20);
        setTimeout(() => document.body.removeChild(dragImage), 0);
    }, []);

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
        async (
            e: React.DragEvent,
            targetEmployeeId: string,
            targetDate: string
        ) => {
            e.preventDefault();
            setDragOverCell(null);

            if (!draggedShift) return;

            // Jeśli upuszczono na tę samą komórkę - nic nie rób
            if (
                draggedShift.employee_id === targetEmployeeId &&
                draggedShift.date === targetDate
            ) {
                setDraggedShift(null);
                return;
            }

            setIsMoving(true);

            // Zapisz wartości przed wykonaniem operacji
            const sourceEmployeeId = draggedShift.employee_id;
            const sourceDate = draggedShift.date;
            const sourceShiftId = draggedShift.id;

            try {
                const supabase = createClient();

                // Sprawdź czy w docelowej komórce jest już zmiana
                const existingShift = shifts.find(
                    (s) =>
                        s.employee_id === targetEmployeeId &&
                        s.date === targetDate
                );

                if (existingShift) {
                    // Zamień zmiany miejscami - użyj Promise.all dla atomowości
                    const [result1, result2] = await Promise.all([
                        supabase
                            .from("shifts")
                            .update({
                                employee_id: targetEmployeeId,
                                date: targetDate,
                            })
                            .eq("id", sourceShiftId),
                        supabase
                            .from("shifts")
                            .update({
                                employee_id: sourceEmployeeId,
                                date: sourceDate,
                            })
                            .eq("id", existingShift.id),
                    ]);

                    if (result1.error) throw result1.error;
                    if (result2.error) throw result2.error;
                } else {
                    // Przenieś zmianę
                    const { error } = await supabase
                        .from("shifts")
                        .update({
                            employee_id: targetEmployeeId,
                            date: targetDate,
                        })
                        .eq("id", sourceShiftId);

                    if (error) throw error;
                }

                router.refresh();
            } catch (error) {
                console.error("Error moving shift:", error);
            } finally {
                setIsMoving(false);
                setDraggedShift(null);
            }
        },
        [draggedShift, shifts, router]
    );

    const handleDragEnd = useCallback(() => {
        setDraggedShift(null);
        setDragOverCell(null);
    }, []);

    // Swap shift with another employee
    const handleSwapShift = async () => {
        if (!swapDialog?.shift || !swapTargetEmployee) return;

        setIsSwapping(true);

        // Zapisz wartości przed wykonaniem operacji
        const sourceShift = swapDialog.shift;
        const sourceEmployeeId = sourceShift.employee_id;
        const sourceShiftId = sourceShift.id;

        try {
            const supabase = createClient();

            // Znajdź zmianę docelowego pracownika w tym samym dniu
            const targetShift = shifts.find(
                (s) =>
                    s.employee_id === swapTargetEmployee &&
                    s.date === sourceShift.date
            );

            if (targetShift) {
                // Zamień zmiany - użyj Promise.all dla atomowości
                const [result1, result2] = await Promise.all([
                    supabase
                        .from("shifts")
                        .update({ employee_id: swapTargetEmployee })
                        .eq("id", sourceShiftId),
                    supabase
                        .from("shifts")
                        .update({ employee_id: sourceEmployeeId })
                        .eq("id", targetShift.id),
                ]);

                if (result1.error) throw result1.error;
                if (result2.error) throw result2.error;
            } else {
                // Tylko przenieś zmianę (swap z pustym)
                const { error } = await supabase
                    .from("shifts")
                    .update({ employee_id: swapTargetEmployee })
                    .eq("id", sourceShiftId);

                if (error) throw error;
            }

            router.refresh();
            setSwapDialog(null);
            setSwapTargetEmployee("");
        } catch (error) {
            console.error("Error swapping shift:", error);
        } finally {
            setIsSwapping(false);
        }
    };

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
            <Card className="overflow-hidden">
                <CardHeader className="px-6">
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
                    <div className="min-w-[600px] sm:min-w-[800px]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800">
                                    <th className="border p-1 sm:p-2 text-left sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[120px] sm:min-w-[180px]">
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
                                                    "border p-0.5 sm:p-1 text-center min-w-11.25 sm:min-w-20",
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

                                                {/* Licznik osób na zmianie */}
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
                                    <th className="border p-1 sm:p-2 text-center min-w-20">
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

                                            // Pobierz status preferencji dla tego dnia
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
                                                        // Kolorowanie na podstawie preferencji (najwyższy priorytet dla pustych komórek)
                                                        !shift &&
                                                            prefStatus ===
                                                                "unavailable" &&
                                                            "bg-red-100 dark:bg-red-900/40",
                                                        !shift &&
                                                            prefStatus ===
                                                                "preferred" &&
                                                            "bg-green-100 dark:bg-green-900/40",
                                                        // Standardowe kolorowanie dni (niższy priorytet)
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
                                                            "ring-2 ring-primary ring-inset",
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
                                                                                "ring-2 ring-white shadow-lg scale-105"
                                                                        )}
                                                                        style={{
                                                                            background: `linear-gradient(135deg, ${shiftColor} 0%, ${shiftColor}dd 100%)`,
                                                                        }}
                                                                    >
                                                                        {/* Godziny - główny tekst */}
                                                                        <div className="text-[10px] sm:text-xs font-bold text-white leading-tight">
                                                                            {shift.start_time.substring(
                                                                                0,
                                                                                5
                                                                            )}
                                                                            <span className="opacity-80">
                                                                                -
                                                                            </span>
                                                                            {shift.end_time.substring(
                                                                                0,
                                                                                5
                                                                            )}
                                                                        </div>

                                                                        {/* Nazwa szablonu - dolny badge */}
                                                                        {templateName && (
                                                                            <div className="text-[7px] sm:text-[8px] font-medium text-white/80 bg-black/20 px-1 rounded leading-tight">
                                                                                {
                                                                                    templateName
                                                                                }
                                                                            </div>
                                                                        )}

                                                                        {/* Action button - górny prawy róg */}
                                                                        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    setSwapDialog(
                                                                                        {
                                                                                            shift,
                                                                                            open: true,
                                                                                        }
                                                                                    );
                                                                                }}
                                                                                className="p-0.5 bg-white/30 hover:bg-white/50 rounded transition-colors"
                                                                                title="Zamień z kimś"
                                                                            >
                                                                                <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="h-full min-h-[40px] sm:min-h-[48px] flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded m-0.5 sm:m-1 relative">
                                                            {/* Wskaźnik preferencji */}
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
                            {/* Footer z podsumowaniem dziennym */}
                            <tfoot>
                                <tr className="bg-slate-100 dark:bg-slate-800 font-medium">
                                    <td className="border p-1 sm:p-2 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="hidden sm:inline">
                                                Obsada
                                            </span>
                                        </div>
                                    </td>
                                    {staffCountByDay.map((day) => (
                                        <td
                                            key={day.date}
                                            className={cn(
                                                "border p-0.5 sm:p-1 text-center ",
                                                day.count === 0 &&
                                                    "bg-gray-50 dark:bg-gray-950/30",
                                                day.count > 0 &&
                                                    day.count < 3 &&
                                                    "bg-orange-50 dark:bg-orange-950/30",
                                                day.count >= 3 &&
                                                    "bg-green-50 dark:bg-green-950/30"
                                            )}
                                        >
                                            {day.count === 0 ? (
                                                <span className="text-slate-400 text-sm">
                                                    0
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-start gap-0.5">
                                                    {Object.entries(
                                                        day.byType
                                                    ).map(([key, data]) => (
                                                        <div
                                                            key={key}
                                                            className="flex items-center gap-0.5"
                                                            title={data.name}
                                                        >
                                                            <div
                                                                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
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
                        </div>
                    </div>
                )}
            </Card>

            {/* Loading overlay for drag operations */}
            {isMoving && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-xl flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Przenoszenie zmiany...</span>
                    </div>
                </div>
            )}

            {/* Shift Editor Dialog */}
            {selectedCell && (
                <ShiftEditor
                    open={!!selectedCell}
                    onOpenChange={(open) => !open && setSelectedCell(null)}
                    scheduleId={scheduleId}
                    employeeId={selectedCell.employeeId}
                    date={selectedCell.date}
                    existingShift={shifts.find(
                        (s) =>
                            s.employee_id === selectedCell.employeeId &&
                            s.date === selectedCell.date
                    )}
                    employee={
                        employees.find((e) => e.id === selectedCell.employeeId)!
                    }
                    templates={shiftTemplates}
                />
            )}
        </>
    );
}
