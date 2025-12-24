"use client";

import { useState, useMemo, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DayColumn } from "./day-column";
import { ShiftCard } from "./shift-card";
import { ScheduleToolbar } from "./schedule-toolbar";

import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutGrid,
    List,
} from "lucide-react";

import type { Shift, Employee, ScheduleDay, ScheduleViewType } from "@/types";
import {
    isPublicHoliday,
    isTradingSunday,
    isNonTradingSunday,
    getHolidayName,
} from "@/lib/polish-holidays";

interface ScheduleGridProps {
    shifts: Shift[];
    employees: Employee[];
    onShiftsChange: (shifts: Shift[]) => void;
    onAddShift: (date: string, employeeId?: string) => void;
    onEditShift: (shift: Shift) => void;
    onDeleteShift: (shiftId: string) => void;
    onGenerateSchedule: () => void;
    onExport: (format: "pdf" | "excel") => void;
    onDateRangeChange?: (start: Date, end: Date) => void;
}

export function ScheduleGrid({
    shifts,
    employees,
    onShiftsChange,
    onAddShift,
    onEditShift,
    onDeleteShift,
    onGenerateSchedule,
    onExport,
    onDateRangeChange,
}: ScheduleGridProps) {
    const [viewType, setViewType] = useState<ScheduleViewType>("monthly");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeId, setActiveId] = useState<string | null>(null);
    const [filterEmployee, setFilterEmployee] = useState<string>("all");

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Create employee map for quick lookup
    const employeeMap = useMemo(() => {
        const map = new Map<string, Employee>();
        employees.forEach((emp) => map.set(emp.id, emp));
        return map;
    }, [employees]);

    // Calculate date range based on view type
    const dateRange = useMemo(() => {
        if (viewType === "weekly") {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return { start, end };
        } else {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            return { start, end };
        }
    }, [currentDate, viewType]);

    // Notify parent when date range changes
    useEffect(() => {
        if (onDateRangeChange) {
            onDateRangeChange(dateRange.start, dateRange.end);
        }
    }, [dateRange.start, dateRange.end, onDateRangeChange]);

    // Generate schedule days with all information
    const scheduleDays: ScheduleDay[] = useMemo(() => {
        const days = eachDayOfInterval(dateRange);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayOfWeek = day.getDay();
            const dayShifts = shifts.filter((s) => s.date === dateStr);

            // Apply employee filter
            const filteredShifts =
                filterEmployee === "all"
                    ? dayShifts
                    : dayShifts.filter((s) => s.employee_id === filterEmployee);

            return {
                date: dateStr,
                dayOfWeek,
                isToday: day.getTime() === today.getTime(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isTradingSunday: isTradingSunday(day),
                isNonTradingSunday: isNonTradingSunday(day),
                isHoliday: isPublicHoliday(day),
                holidayName: getHolidayName(day) || undefined,
                shifts: filteredShifts.map((s) => ({
                    ...s,
                    employee: employeeMap.get(s.employee_id)!,
                })),
                absences: [], // Will be populated when we add absences
            };
        });
    }, [dateRange, shifts, employeeMap, filterEmployee]);

    // Navigation functions
    const navigatePrevious = () => {
        if (viewType === "weekly") {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const navigateNext = () => {
        if (viewType === "weekly") {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const navigateToday = () => {
        setCurrentDate(new Date());
    };

    // Format the date range title
    const dateRangeTitle = useMemo(() => {
        if (viewType === "weekly") {
            const start = format(dateRange.start, "d MMM", { locale: pl });
            const end = format(dateRange.end, "d MMM yyyy", { locale: pl });
            return `${start} - ${end}`;
        } else {
            return format(currentDate, "LLLL yyyy", { locale: pl });
        }
    }, [currentDate, dateRange, viewType]);

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeShift = shifts.find((s) => s.id === active.id);
        if (!activeShift) return;

        // If dropped on a day column
        if (over.id.toString().startsWith("day-")) {
            const newDate = over.id.toString().replace("day-", "");

            // Check if the target day allows scheduling
            const targetDay = scheduleDays.find((d) => d.date === newDate);
            if (targetDay?.isHoliday || targetDay?.isNonTradingSunday) {
                // Don't allow dropping on non-working days
                return;
            }

            if (activeShift.date !== newDate) {
                const updatedShifts = shifts.map((s) =>
                    s.id === activeShift.id ? { ...s, date: newDate } : s
                );
                onShiftsChange(updatedShifts);
            }
        }

        // If dropped on another shift (reordering)
        if (active.id !== over.id && !over.id.toString().startsWith("day-")) {
            const oldIndex = shifts.findIndex((s) => s.id === active.id);
            const newIndex = shifts.findIndex((s) => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newShifts = arrayMove(shifts, oldIndex, newIndex);
                onShiftsChange(newShifts);
            }
        }
    };

    const handleDuplicateShift = (shift: Shift) => {
        const newShift: Shift = {
            ...shift,
            id: `shift-${Date.now()}`, // Temporary ID, will be replaced by Supabase
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        onShiftsChange([...shifts, newShift]);
    };

    // Get active shift for drag overlay
    const activeShift = activeId ? shifts.find((s) => s.id === activeId) : null;

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <ScheduleToolbar
                onGenerate={onGenerateSchedule}
                onExportPdf={() => onExport("pdf")}
                onExportExcel={() => onExport("excel")}
            />

            {/* Navigation and filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-b">
                {/* Date navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={navigatePrevious}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={navigateToday}>
                        Dziś
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={navigateNext}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold capitalize ml-2">
                        {dateRangeTitle}
                    </h2>
                </div>

                {/* View and filter controls */}
                <div className="flex items-center gap-3">
                    {/* Employee filter */}
                    <Select
                        value={filterEmployee}
                        onValueChange={setFilterEmployee}
                    >
                        <SelectTrigger className="w-45">
                            <SelectValue placeholder="Wszyscy pracownicy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Wszyscy pracownicy
                            </SelectItem>
                            {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View switcher */}
                    <Tabs
                        value={viewType}
                        onValueChange={(v) =>
                            setViewType(v as ScheduleViewType)
                        }
                    >
                        <TabsList>
                            <TabsTrigger value="weekly" className="gap-1.5">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Tydzień
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="gap-1.5">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Miesiąc
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Schedule grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div
                    className={cn(
                        "grid gap-2 py-4 flex-1 overflow-auto",
                        viewType === "weekly"
                            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
                            : "grid-cols-7"
                    )}
                >
                    {/* Day column headers for monthly view */}
                    {viewType === "monthly" && (
                        <>
                            {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map(
                                (day, idx) => (
                                    <div
                                        key={day}
                                        className={cn(
                                            "text-center text-sm font-medium py-2 border-b",
                                            idx >= 5 && "text-muted-foreground"
                                        )}
                                    >
                                        {day}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* Day columns */}
                    {scheduleDays.map((day) => (
                        <DayColumn
                            key={day.date}
                            day={day}
                            shifts={day.shifts}
                            employees={employeeMap}
                            onAddShift={onAddShift}
                            onEditShift={onEditShift}
                            onDeleteShift={onDeleteShift}
                            onDuplicateShift={handleDuplicateShift}
                            compact={viewType === "monthly"}
                        />
                    ))}
                </div>

                {/* Drag overlay */}
                <DragOverlay>
                    {activeShift && (
                        <ShiftCard
                            shift={activeShift}
                            employee={employeeMap.get(activeShift.employee_id)}
                            isOverlay
                        />
                    )}
                </DragOverlay>
            </DndContext>

            {/* Stats footer */}
            <div className="border-t py-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{shifts.length}</Badge>
                    <span>zmian w tym okresie</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">
                        {new Set(shifts.map((s) => s.employee_id)).size}
                    </Badge>
                    <span>pracowników przypisanych</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">
                        {shifts
                            .reduce((acc, s) => {
                                const [startH, startM] = s.start_time
                                    .split(":")
                                    .map(Number);
                                const [endH, endM] = s.end_time
                                    .split(":")
                                    .map(Number);
                                let mins =
                                    endH * 60 +
                                    endM -
                                    (startH * 60 + startM) -
                                    (s.break_duration || 0);
                                if (mins < 0) mins += 24 * 60;
                                return acc + mins / 60;
                            }, 0)
                            .toFixed(0)}
                        h
                    </Badge>
                    <span>łącznie godzin</span>
                </div>
            </div>
        </div>
    );
}
