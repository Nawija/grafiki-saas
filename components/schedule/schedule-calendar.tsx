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

    // Oblicz liczbę osób na zmianie dla każdego dnia
    const staffCountByDay = days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dateStr);
        return {
            date: dateStr,
            count: dayShifts.length,
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

            try {
                const supabase = createClient();

                // Sprawdź czy w docelowej komórce jest już zmiana
                const existingShift = shifts.find(
                    (s) =>
                        s.employee_id === targetEmployeeId &&
                        s.date === targetDate
                );

                if (existingShift) {
                    // Zamień zmiany miejscami
                    await supabase
                        .from("shifts")
                        .update({
                            employee_id: targetEmployeeId,
                            date: targetDate,
                        })
                        .eq("id", draggedShift.id);

                    await supabase
                        .from("shifts")
                        .update({
                            employee_id: draggedShift.employee_id,
                            date: draggedShift.date,
                        })
                        .eq("id", existingShift.id);
                } else {
                    // Przenieś zmianę
                    await supabase
                        .from("shifts")
                        .update({
                            employee_id: targetEmployeeId,
                            date: targetDate,
                        })
                        .eq("id", draggedShift.id);
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

        try {
            const supabase = createClient();
            const sourceShift = swapDialog.shift;

            // Znajdź zmianę docelowego pracownika w tym samym dniu
            const targetShift = shifts.find(
                (s) =>
                    s.employee_id === swapTargetEmployee &&
                    s.date === sourceShift.date
            );

            if (targetShift) {
                // Zamień zmiany
                await supabase
                    .from("shifts")
                    .update({ employee_id: swapTargetEmployee })
                    .eq("id", sourceShift.id);

                await supabase
                    .from("shifts")
                    .update({ employee_id: sourceShift.employee_id })
                    .eq("id", targetShift.id);
            } else {
                // Tylko przenieś zmianę (swap z pustym)
                await supabase
                    .from("shifts")
                    .update({ employee_id: swapTargetEmployee })
                    .eq("id", sourceShift.id);
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
                                        const isWeekendDay = isWeekend(day);
                                        const isSunday = dayOfWeek === 0;
                                        const isTradingSun =
                                            isTradingSunday(day);
                                        const staffCount =
                                            staffCountByDay[idx].count;

                                        return (
                                            <th
                                                key={day.toISOString()}
                                                className={cn(
                                                    "border p-0.5 sm:p-1 text-center min-w-[45px] sm:min-w-[60px]",
                                                    isWeekendDay &&
                                                        "bg-slate-100 dark:bg-slate-700",
                                                    isSunday &&
                                                        !isTradingSun &&
                                                        "bg-red-50 dark:bg-red-950/50",
                                                    isSunday &&
                                                        isTradingSun &&
                                                        "bg-green-50 dark:bg-green-950/50",
                                                    holiday &&
                                                        "bg-red-50 dark:bg-red-950"
                                                )}
                                            >
                                                <div className="text-xs text-muted-foreground">
                                                    {DAYS_PL[dayOfWeek]}
                                                </div>
                                                <div className="font-semibold">
                                                    {format(day, "d")}
                                                </div>
                                                {isSunday && (
                                                    <div
                                                        className={cn(
                                                            "text-[10px] flex items-center justify-center gap-0.5",
                                                            isTradingSun
                                                                ? "text-green-600 dark:text-green-400"
                                                                : "text-red-600 dark:text-red-400"
                                                        )}
                                                        title={
                                                            isTradingSun
                                                                ? "Niedziela handlowa"
                                                                : "Niedziela niehandlowa"
                                                        }
                                                    >
                                                        <ShoppingBag className="h-3 w-3" />
                                                        <span>
                                                            {isTradingSun
                                                                ? "H"
                                                                : "NH"}
                                                        </span>
                                                    </div>
                                                )}
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
                                    <th className="border p-1 sm:p-2 text-center min-w-[60px] sm:min-w-[80px]">
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
                                                <div
                                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            employee.color ||
                                                            "#3b82f6",
                                                    }}
                                                />
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
                                            const isWeekendDay = isWeekend(day);
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

                                            return (
                                                <td
                                                    key={day.toISOString()}
                                                    className={cn(
                                                        "border p-1 text-center transition-all duration-200",
                                                        isWeekendDay &&
                                                            "bg-slate-50 dark:bg-slate-800",
                                                        holiday &&
                                                            "bg-red-50/50 dark:bg-red-950/50",
                                                        !shift &&
                                                            "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700",
                                                        isDragOver &&
                                                            "bg-primary/20 ring-2 ring-primary ring-inset",
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
                                                        <div
                                                            draggable
                                                            onDragStart={(e) =>
                                                                handleDragStart(
                                                                    e,
                                                                    shift
                                                                )
                                                            }
                                                            onDragEnd={
                                                                handleDragEnd
                                                            }
                                                            className={cn(
                                                                "group relative cursor-grab active:cursor-grabbing",
                                                                "rounded p-0.5 sm:p-1 transition-all hover:scale-105",
                                                                isDragging &&
                                                                    "ring-2 ring-primary"
                                                            )}
                                                            style={{
                                                                backgroundColor: `${
                                                                    employee.color ||
                                                                    "#3b82f6"
                                                                }20`,
                                                                borderLeft: `2px solid ${
                                                                    employee.color ||
                                                                    "#3b82f6"
                                                                }`,
                                                            }}
                                                        >
                                                            <div className="text-[10px] sm:text-xs font-medium leading-tight">
                                                                <span className="sm:hidden">
                                                                    {shift.start_time.substring(
                                                                        0,
                                                                        5
                                                                    )}
                                                                </span>
                                                                <span className="hidden sm:inline">
                                                                    {shift.start_time.substring(
                                                                        0,
                                                                        5
                                                                    )}
                                                                    -
                                                                    {shift.end_time.substring(
                                                                        0,
                                                                        5
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {/* Action buttons on hover - tylko na większych ekranach */}
                                                            <div className="hidden sm:flex absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                                                <button
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setSelectedCell(
                                                                            {
                                                                                employeeId:
                                                                                    employee.id,
                                                                                date: dateStr,
                                                                            }
                                                                        );
                                                                    }}
                                                                    className="p-1 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                    title="Edytuj"
                                                                >
                                                                    <svg
                                                                        className="w-3 h-3"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                                        />
                                                                    </svg>
                                                                </button>
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
                                                                    className="p-1 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                    title="Zamień z kimś"
                                                                >
                                                                    <ArrowLeftRight className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-sm sm:text-lg">
                                                            +
                                                        </span>
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
                                                "border p-0.5 sm:p-2 text-center",
                                                day.count === 0 &&
                                                    "text-slate-400 bg-red-50 dark:bg-red-950/30",
                                                day.count > 0 &&
                                                    day.count < 3 &&
                                                    "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
                                                day.count >= 3 &&
                                                    "text-green-600 bg-green-50 dark:bg-green-950/30"
                                            )}
                                        >
                                            <span className="text-sm sm:text-lg font-bold">
                                                {day.count}
                                            </span>
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

            {/* Swap Shift Dialog */}
            <Dialog
                open={swapDialog?.open || false}
                onOpenChange={(open) => !open && setSwapDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zamień zmianę</DialogTitle>
                        <DialogDescription>
                            {swapDialog?.shift && (
                                <>
                                    Zamień zmianę{" "}
                                    {swapDialog.shift.start_time.substring(
                                        0,
                                        5
                                    )}
                                    -{swapDialog.shift.end_time.substring(0, 5)}{" "}
                                    z dnia{" "}
                                    {format(
                                        new Date(swapDialog.shift.date),
                                        "d MMMM",
                                        { locale: pl }
                                    )}{" "}
                                    z innym pracownikiem
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Wybierz pracownika
                            </label>
                            <Select
                                value={swapTargetEmployee}
                                onValueChange={setSwapTargetEmployee}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz pracownika..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees
                                        .filter(
                                            (e) =>
                                                e.id !==
                                                swapDialog?.shift.employee_id
                                        )
                                        .map((emp) => {
                                            const hasShift =
                                                swapDialog?.shift &&
                                                shifts.some(
                                                    (s) =>
                                                        s.employee_id ===
                                                            emp.id &&
                                                        s.date ===
                                                            swapDialog.shift
                                                                .date
                                                );
                                            return (
                                                <SelectItem
                                                    key={emp.id}
                                                    value={emp.id}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    emp.color ||
                                                                    "#3b82f6",
                                                            }}
                                                        />
                                                        <span>
                                                            {emp.first_name}{" "}
                                                            {emp.last_name}
                                                        </span>
                                                        {hasShift && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="ml-2 text-xs"
                                                            >
                                                                ma zmianę
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>

                        {swapTargetEmployee && swapDialog?.shift && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                {shifts.some(
                                    (s) =>
                                        s.employee_id === swapTargetEmployee &&
                                        s.date === swapDialog.shift.date
                                ) ? (
                                    <p>
                                        <ArrowLeftRight className="h-4 w-4 inline mr-2" />
                                        Zmiany zostaną zamienione miejscami
                                    </p>
                                ) : (
                                    <p>
                                        Zmiana zostanie przeniesiona do
                                        wybranego pracownika
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setSwapDialog(null)}
                            >
                                Anuluj
                            </Button>
                            <Button
                                onClick={handleSwapShift}
                                disabled={!swapTargetEmployee || isSwapping}
                            >
                                {isSwapping && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Zamień
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
