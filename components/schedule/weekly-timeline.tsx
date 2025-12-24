"use client";

import { useState, useMemo, useCallback } from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    isSameDay,
    isToday,
    isSunday,
    addDays,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Plus,
    GripVertical,
    Clock,
    Coffee,
    User,
    Edit2,
    Trash2,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Employee, ShiftWithEmployee } from "@/types";
import { getEmployeeFullName } from "@/types";
import { isTradingSunday } from "@/lib/polish-holidays";

interface WeeklyTimelineProps {
    shifts: ShiftWithEmployee[];
    employees: Employee[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onShiftClick: (shift: ShiftWithEmployee) => void;
    onEditShift: (shift: ShiftWithEmployee) => void;
    onDeleteShift: (shift: ShiftWithEmployee) => void;
    onAddShift: (date: Date, employeeId?: string) => void;
    onShiftDrop?: (
        shiftId: string,
        newDate: string,
        newEmployeeId?: string
    ) => void;
}

// Time grid hours (6:00 - 22:00)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const HOUR_HEIGHT = 48; // pixels per hour

function timeToPosition(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours - 6) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
}

function getShiftHeight(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes = 22 * 60; // Cap at 22:00 for display
    }

    const durationMinutes = endMinutes - startMinutes;
    return (durationMinutes / 60) * HOUR_HEIGHT;
}

function getShiftDuration(startTime: string, endTime: string): string {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function WeeklyTimeline({
    shifts,
    employees,
    currentDate,
    onDateChange,
    onShiftClick,
    onEditShift,
    onDeleteShift,
    onAddShift,
    onShiftDrop,
}: WeeklyTimelineProps) {
    const [draggedShift, setDraggedShift] = useState<ShiftWithEmployee | null>(
        null
    );

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Group shifts by day and employee
    const shiftsByDayEmployee = useMemo(() => {
        const map = new Map<string, ShiftWithEmployee[]>();
        for (const shift of shifts) {
            const key = `${shift.date}-${shift.employee_id}`;
            const existing = map.get(key) || [];
            existing.push(shift);
            map.set(key, existing);
        }
        return map;
    }, [shifts]);

    const goToPrevWeek = () => onDateChange(subWeeks(currentDate, 1));
    const goToNextWeek = () => onDateChange(addWeeks(currentDate, 1));
    const goToToday = () => onDateChange(new Date());

    const handleDragStart = (e: React.DragEvent, shift: ShiftWithEmployee) => {
        setDraggedShift(shift);
        e.dataTransfer.setData("text/plain", shift.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, date: Date, employeeId: string) => {
        e.preventDefault();
        if (draggedShift && onShiftDrop) {
            const newDate = format(date, "yyyy-MM-dd");
            onShiftDrop(draggedShift.id, newDate, employeeId);
        }
        setDraggedShift(null);
    };

    // Calculate week stats
    const weekStats = useMemo(() => {
        let totalShifts = 0;
        let totalHours = 0;

        for (const shift of shifts) {
            const shiftDate = new Date(shift.date);
            if (shiftDate >= weekStart && shiftDate <= weekEnd) {
                totalShifts++;
                const [startH, startM] = shift.start_time
                    .split(":")
                    .map(Number);
                const [endH, endM] = shift.end_time.split(":").map(Number);
                let minutes = endH * 60 + endM - (startH * 60 + startM);
                if (minutes < 0) minutes += 24 * 60;
                totalHours += (minutes - (shift.break_duration || 0)) / 60;
            }
        }

        return { totalShifts, totalHours: Math.round(totalHours * 10) / 10 };
    }, [shifts, weekStart, weekEnd]);

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-xl font-bold">
                            {format(weekStart, "d MMM", { locale: pl })} —{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: pl })}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="font-normal">
                                {weekStats.totalShifts} zmian
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {weekStats.totalHours}h
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Ten tydzień
                        </Button>
                        <div className="flex items-center border rounded-lg">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToPrevWeek}
                                className="rounded-r-none"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToNextWeek}
                                className="rounded-l-none"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="w-full">
                    <div className="min-w-[900px]">
                        {/* Day headers */}
                        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b sticky top-0 bg-white dark:bg-slate-950 z-10">
                            <div className="p-3 border-r font-medium text-sm text-muted-foreground">
                                Pracownik
                            </div>
                            {days.map((day) => {
                                const isTodayDate = isToday(day);
                                const isSundayDate = isSunday(day);
                                const isTradingSundayDate =
                                    isSundayDate && isTradingSunday(day);
                                const isNonTradingSunday =
                                    isSundayDate && !isTradingSundayDate;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            "p-3 text-center border-r last:border-r-0",
                                            isTodayDate &&
                                                "bg-blue-50 dark:bg-blue-950/20",
                                            isNonTradingSunday &&
                                                "bg-red-50/50 dark:bg-red-950/10"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "text-xs uppercase tracking-wide",
                                                isSundayDate
                                                    ? "text-red-500"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {format(day, "EEE", { locale: pl })}
                                        </div>
                                        <div
                                            className={cn(
                                                "text-lg font-semibold mt-1",
                                                isTodayDate &&
                                                    "text-blue-600 dark:text-blue-400"
                                            )}
                                        >
                                            {format(day, "d")}
                                        </div>
                                        {isTradingSundayDate && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[9px] px-1 py-0 mt-1 bg-green-100 text-green-700"
                                            >
                                                Handlowa
                                            </Badge>
                                        )}
                                        {isNonTradingSunday && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[9px] px-1 py-0 mt-1 bg-red-100 text-red-700"
                                            >
                                                Niehandlowa
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Employee rows */}
                        {employees.map((employee) => (
                            <div
                                key={employee.id}
                                className="grid grid-cols-[200px_repeat(7,1fr)] border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                                {/* Employee info */}
                                <div className="p-3 border-r flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{
                                            backgroundColor:
                                                employee.color || "#94a3b8",
                                        }}
                                    />
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {employee.first_name}{" "}
                                            {employee.last_name}
                                        </div>
                                        {employee.position && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {employee.position}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Day cells */}
                                {days.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const cellShifts =
                                        shiftsByDayEmployee.get(
                                            `${dateStr}-${employee.id}`
                                        ) || [];
                                    const isTodayDate = isToday(day);

                                    return (
                                        <div
                                            key={dateStr}
                                            className={cn(
                                                "p-1 border-r last:border-r-0 min-h-[60px] relative group",
                                                isTodayDate &&
                                                    "bg-blue-50/30 dark:bg-blue-950/10"
                                            )}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) =>
                                                handleDrop(e, day, employee.id)
                                            }
                                        >
                                            {/* Shifts for this employee on this day */}
                                            <div className="space-y-1">
                                                {cellShifts.map((shift) => (
                                                    <div
                                                        key={shift.id}
                                                        draggable
                                                        onDragStart={(e) =>
                                                            handleDragStart(
                                                                e,
                                                                shift
                                                            )
                                                        }
                                                        onClick={() =>
                                                            onShiftClick(shift)
                                                        }
                                                        className={cn(
                                                            "px-2 py-1.5 rounded-lg text-xs cursor-move transition-all",
                                                            "hover:ring-2 hover:ring-offset-1 hover:ring-blue-500 hover:shadow-md",
                                                            draggedShift?.id ===
                                                                shift.id &&
                                                                "opacity-50"
                                                        )}
                                                        style={{
                                                            backgroundColor:
                                                                employee.color
                                                                    ? `${employee.color}20`
                                                                    : "#e2e8f0",
                                                            borderLeft: `3px solid ${
                                                                employee.color ||
                                                                "#94a3b8"
                                                            }`,
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-slate-500" />
                                                                <span className="font-medium">
                                                                    {shift.start_time.slice(
                                                                        0,
                                                                        5
                                                                    )}{" "}
                                                                    -{" "}
                                                                    {shift.end_time.slice(
                                                                        0,
                                                                        5
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    asChild
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="w-5 h-5 opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <MoreHorizontal className="w-3 h-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            onEditShift(
                                                                                shift
                                                                            )
                                                                        }
                                                                    >
                                                                        <Edit2 className="w-4 h-4 mr-2" />
                                                                        Edytuj
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            onDeleteShift(
                                                                                shift
                                                                            )
                                                                        }
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                        Usuń
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                                            {getShiftDuration(
                                                                shift.start_time,
                                                                shift.end_time
                                                            )}
                                                            {shift.break_duration
                                                                ? ` (${shift.break_duration}m przerwy)`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                                                onClick={() =>
                                                    onAddShift(day, employee.id)
                                                }
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Empty state */}
                        {employees.length === 0 && (
                            <div className="p-12 text-center">
                                <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="font-medium mb-1">
                                    Brak pracowników
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Dodaj pracowników, aby móc tworzyć grafik
                                </p>
                            </div>
                        )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
