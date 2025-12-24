"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
} from "date-fns";
import { pl } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ChevronLeft,
    ChevronRight,
    User,
    Users,
    Clock,
    X,
    AlertTriangle,
    GripVertical,
    Wand2,
    FileDown,
    Filter,
    Calendar,
    ChevronDown,
    Trash2,
} from "lucide-react";

import type { Shift, Employee, ShiftTemplate } from "@/types";
import {
    isPublicHoliday,
    isTradingSunday,
    isNonTradingSunday,
    getHolidayName,
} from "@/lib/polish-holidays";

interface MonthlyScheduleViewProps {
    shifts: Shift[];
    employees: Employee[];
    templates: ShiftTemplate[];
    onCreateShift: (data: {
        employee_id: string;
        date: string;
        start_time: string;
        end_time: string;
        break_duration: number;
    }) => Promise<void>;
    onDeleteShift: (shiftId: string) => Promise<void>;
    onDeleteAllShifts?: () => Promise<void>;
    onDateRangeChange?: (start: Date, end: Date) => void;
    onGenerateSchedule?: () => void;
    onExportPdf?: () => void;
    onExportExcel?: () => void;
}

// Draggable Employee Component
function DraggableEmployee({
    employee,
    hoursThisMonth,
    isCompact = false,
}: {
    employee: Employee;
    hoursThisMonth: number;
    isCompact?: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging, transform } =
        useDraggable({
            id: `employee-${employee.id}`,
            data: { type: "employee", employee },
        });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 1000,
          }
        : undefined;

    const monthlyTarget = (employee.hours_per_week || 40) * 4;
    const hoursPercent = Math.round((hoursThisMonth / monthlyTarget) * 100);

    if (isCompact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            ref={setNodeRef}
                            style={style}
                            {...listeners}
                            {...attributes}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border bg-card cursor-grab transition-all hover:shadow-md hover:border-primary/50",
                                isDragging &&
                                    "opacity-50 cursor-grabbing shadow-lg"
                            )}
                        >
                            <Avatar className="h-7 w-7 border border-white shadow-sm">
                                <AvatarFallback
                                    style={{ backgroundColor: employee.color }}
                                    className="text-white text-[10px] font-bold"
                                >
                                    {employee.first_name[0]}
                                    {employee.last_name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate max-w-[80px]">
                                {employee.first_name}
                            </span>
                            <Badge
                                variant={
                                    hoursPercent >= 100
                                        ? "default"
                                        : "secondary"
                                }
                                className="text-[10px] ml-auto"
                            >
                                {hoursThisMonth}h
                            </Badge>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="font-medium">
                            {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {hoursThisMonth}h / {monthlyTarget}h ({hoursPercent}
                            %)
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        ref={setNodeRef}
                        style={style}
                        {...listeners}
                        {...attributes}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-xl border-2 bg-card cursor-grab transition-all hover:shadow-md hover:border-primary/50 min-w-[75px]",
                            isDragging &&
                                "opacity-50 cursor-grabbing shadow-lg scale-105",
                            hoursPercent >= 100 &&
                                "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                        )}
                    >
                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                            <AvatarFallback
                                style={{ backgroundColor: employee.color }}
                                className="text-white text-xs font-bold"
                            >
                                {employee.first_name[0]}
                                {employee.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-center truncate max-w-[65px]">
                            {employee.first_name}
                        </span>
                        <div
                            className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                hoursPercent >= 100
                                    ? "bg-green-500 text-white"
                                    : hoursPercent >= 75
                                    ? "bg-yellow-500 text-white"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {hoursThisMonth}h
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {hoursThisMonth}h / {monthlyTarget}h ({hoursPercent}%)
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Multi-Employee Slot Component (droppable with capacity)
function MultiSlot({
    template,
    date,
    shiftsInSlot,
    employeeMap,
    isNonWorkingDay,
    onRemove,
}: {
    template: ShiftTemplate;
    date: string;
    shiftsInSlot: Shift[];
    employeeMap: Map<string, Employee>;
    isNonWorkingDay: boolean;
    onRemove: (shiftId: string) => void;
}) {
    const minRequired = template.capacity || 1;
    const filledCount = shiftsInSlot.length;
    const needsMore = filledCount < minRequired;

    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${template.id}-${date}`,
        data: { type: "slot", template, date },
        disabled: isNonWorkingDay, // Zawsze można dodać więcej osób
    });

    if (isNonWorkingDay) {
        return (
            <div className="min-h-[40px] rounded bg-muted/30 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">—</span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[40px] rounded border transition-all p-1",
                isOver && "border-primary bg-primary/10 scale-[1.02] shadow-sm",
                !needsMore &&
                    "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                needsMore &&
                    !isOver &&
                    "border-dashed border-orange-400/50 hover:border-orange-500/70 bg-orange-50/30 dark:bg-orange-950/10"
            )}
        >
            {/* Filled slots */}
            <div className="flex flex-wrap gap-0.5">
                {shiftsInSlot.map((shift) => {
                    const employee = employeeMap.get(shift.employee_id);
                    if (!employee) return null;
                    return (
                        <TooltipProvider key={shift.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] group relative cursor-default"
                                        style={{
                                            backgroundColor: `${employee.color}20`,
                                            borderLeft: `2px solid ${employee.color}`,
                                        }}
                                    >
                                        <span className="font-medium truncate max-w-[50px]">
                                            {employee.first_name[0]}.
                                            {employee.last_name[0]}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(shift.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 h-3 w-3 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition-opacity"
                                        >
                                            <X className="h-2 w-2" />
                                        </button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-medium">
                                        {employee.first_name}{" "}
                                        {employee.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {shift.start_time} - {shift.end_time}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
                {/* Slots indicator */}
                <div
                    className={cn(
                        "flex items-center justify-center px-1 py-0.5 text-[9px]",
                        needsMore
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-muted-foreground"
                    )}
                >
                    <Users className="h-2.5 w-2.5 mr-0.5" />
                    {filledCount}/{minRequired}
                    {needsMore ? "!" : "+"}
                </div>
            </div>
        </div>
    );
}

// Day Cell Component
function DayCell({
    day,
    templates,
    shifts,
    employeeMap,
    filteredTemplateIds,
    onRemoveShift,
}: {
    day: {
        date: string;
        dayObj: Date;
        dayNumber: string;
        isToday: boolean;
        isCurrentMonth: boolean;
        isWeekend: boolean;
        isHoliday: boolean;
        holidayName: string | null;
        isNonTradingSunday: boolean;
        isTradingSunday: boolean;
    };
    templates: ShiftTemplate[];
    shifts: Shift[];
    employeeMap: Map<string, Employee>;
    filteredTemplateIds: Set<string> | null;
    onRemoveShift: (shiftId: string) => void;
}) {
    const isNonWorkingDay = day.isHoliday || day.isNonTradingSunday;

    // Filter templates
    const visibleTemplates = filteredTemplateIds
        ? templates.filter((t) => filteredTemplateIds.has(t.id))
        : templates;

    // Get shifts for this day grouped by template
    const getShiftsForTemplate = (template: ShiftTemplate) => {
        return shifts.filter(
            (s) =>
                s.date === day.date &&
                s.start_time === template.start_time &&
                s.end_time === template.end_time
        );
    };

    return (
        <div
            className={cn(
                "border rounded-lg p-1.5 min-h-[120px] transition-colors",
                !day.isCurrentMonth && "opacity-40 bg-muted/20",
                day.isToday && "ring-2 ring-primary ring-offset-1",
                day.isHoliday &&
                    day.isCurrentMonth &&
                    "bg-red-50 dark:bg-red-950/20",
                day.isNonTradingSunday &&
                    !day.isHoliday &&
                    day.isCurrentMonth &&
                    "bg-muted/50",
                day.isWeekend &&
                    !day.isHoliday &&
                    !day.isNonTradingSunday &&
                    day.isCurrentMonth &&
                    "bg-slate-50 dark:bg-slate-900/30"
            )}
        >
            {/* Day header */}
            <div className="flex items-start justify-between mb-1">
                <div
                    className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                        day.isToday && "bg-primary text-primary-foreground",
                        !day.isToday && day.isWeekend && "text-muted-foreground"
                    )}
                >
                    {day.dayNumber}
                </div>
                {day.isHoliday && (
                    <Badge
                        variant="destructive"
                        className="text-[8px] px-1 py-0"
                    >
                        {day.holidayName?.slice(0, 6) || "Święto"}
                    </Badge>
                )}
                {day.isTradingSunday && (
                    <Badge className="text-[8px] px-1 py-0 bg-green-500">
                        Hand.
                    </Badge>
                )}
            </div>

            {/* Template slots */}
            <div className="space-y-1">
                {visibleTemplates.map((template) => {
                    const shiftsInSlot = getShiftsForTemplate(template);
                    return (
                        <div key={template.id}>
                            <div
                                className="text-[8px] font-medium text-muted-foreground mb-0.5 flex items-center gap-1"
                                style={{ color: template.color }}
                            >
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: template.color }}
                                />
                                {template.name}
                            </div>
                            <MultiSlot
                                template={template}
                                date={day.date}
                                shiftsInSlot={shiftsInSlot}
                                employeeMap={employeeMap}
                                isNonWorkingDay={isNonWorkingDay}
                                onRemove={onRemoveShift}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function MonthlyScheduleView({
    shifts,
    employees,
    templates,
    onCreateShift,
    onDeleteShift,
    onDeleteAllShifts,
    onDateRangeChange,
    onGenerateSchedule,
    onExportPdf,
    onExportExcel,
}: MonthlyScheduleViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedTemplateIds, setSelectedTemplateIds] =
        useState<Set<string> | null>(null);
    const [selectedEmployeeIds, setSelectedEmployeeIds] =
        useState<Set<string> | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Calculate month range (6 weeks grid)
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({
            start: calendarStart,
            end: calendarEnd,
        }).map((dayObj) => {
            const dateStr = format(dayObj, "yyyy-MM-dd");
            const dayOfWeek = dayObj.getDay();
            return {
                date: dateStr,
                dayObj,
                dayNumber: format(dayObj, "d"),
                dayOfWeek,
                isToday: isSameDay(dayObj, new Date()),
                isCurrentMonth: isSameMonth(dayObj, currentDate),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isHoliday: isPublicHoliday(dayObj),
                holidayName: getHolidayName(dayObj),
                isTradingSunday: isTradingSunday(dayObj),
                isNonTradingSunday: isNonTradingSunday(dayObj),
            };
        });
    }, [currentDate]);

    // Date range for parent notification
    const dateRange = useMemo(() => {
        if (calendarDays.length === 0)
            return { start: new Date(), end: new Date() };
        return {
            start: calendarDays[0].dayObj,
            end: calendarDays[calendarDays.length - 1].dayObj,
        };
    }, [calendarDays]);

    // Notify parent when date range changes
    useEffect(() => {
        if (onDateRangeChange) {
            onDateRangeChange(dateRange.start, dateRange.end);
        }
    }, [dateRange.start, dateRange.end, onDateRangeChange]);

    // Create employee map
    const employeeMap = useMemo(() => {
        const map = new Map<string, Employee>();
        employees.forEach((emp) => map.set(emp.id, emp));
        return map;
    }, [employees]);

    // Calculate hours per employee for this month
    const hoursPerEmployee = useMemo(() => {
        const hours = new Map<string, number>();
        employees.forEach((emp) => hours.set(emp.id, 0));

        shifts.forEach((shift) => {
            const [startH, startM] = shift.start_time.split(":").map(Number);
            const [endH, endM] = shift.end_time.split(":").map(Number);
            let mins =
                endH * 60 +
                endM -
                (startH * 60 + startM) -
                (shift.break_duration || 0);
            if (mins < 0) mins += 24 * 60;
            const shiftHours = mins / 60;

            const current = hours.get(shift.employee_id) || 0;
            hours.set(shift.employee_id, current + shiftHours);
        });

        return hours;
    }, [shifts, employees]);

    // Check for time conflicts
    const hasTimeConflict = useCallback(
        (
            employeeId: string,
            date: string,
            startTime: string,
            endTime: string
        ): boolean => {
            const [newStartH, newStartM] = startTime.split(":").map(Number);
            const [newEndH, newEndM] = endTime.split(":").map(Number);
            const newStart = newStartH * 60 + newStartM;
            const newEnd = newEndH * 60 + newEndM;

            return shifts.some((shift) => {
                if (shift.employee_id !== employeeId || shift.date !== date)
                    return false;
                const [startH, startM] = shift.start_time
                    .split(":")
                    .map(Number);
                const [endH, endM] = shift.end_time.split(":").map(Number);
                const start = startH * 60 + startM;
                const end = endH * 60 + endM;
                return newStart < end && newEnd > start;
            });
        },
        [shifts]
    );

    // Check if employee already assigned to this specific slot
    const isAlreadyAssigned = useCallback(
        (
            employeeId: string,
            date: string,
            template: ShiftTemplate
        ): boolean => {
            return shifts.some(
                (s) =>
                    s.employee_id === employeeId &&
                    s.date === date &&
                    s.start_time === template.start_time &&
                    s.end_time === template.end_time
            );
        },
        [shifts]
    );

    // Navigation
    const navigatePrevious = () => setCurrentDate(subMonths(currentDate, 1));
    const navigateNext = () => setCurrentDate(addMonths(currentDate, 1));
    const navigateToday = () => setCurrentDate(new Date());

    // Month title
    const monthTitle = useMemo(() => {
        return format(currentDate, "LLLL yyyy", { locale: pl });
    }, [currentDate]);

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === "employee") {
            setActiveEmployee(active.data.current.employee);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveEmployee(null);
        setError(null);

        if (!over) return;

        if (
            active.data.current?.type === "employee" &&
            over.data.current?.type === "slot"
        ) {
            const employee = active.data.current.employee as Employee;
            const template = over.data.current.template as ShiftTemplate;
            const date = over.data.current.date as string;

            // Check if employee already assigned to this slot
            if (isAlreadyAssigned(employee.id, date, template)) {
                setError(
                    `${employee.first_name} jest już przypisany/a do tej zmiany`
                );
                return;
            }

            // Capacity to minimum - nie blokujemy dodawania więcej osób
            // (walidacja duplikatów jest wyżej w isAlreadyAssigned)

            // Check for time conflicts
            if (
                hasTimeConflict(
                    employee.id,
                    date,
                    template.start_time,
                    template.end_time
                )
            ) {
                setError(`${employee.first_name} ma już zmianę w tym czasie`);
                return;
            }

            // Create new shift
            try {
                await onCreateShift({
                    employee_id: employee.id,
                    date,
                    start_time: template.start_time,
                    end_time: template.end_time,
                    break_duration: template.break_duration,
                });
            } catch (err) {
                setError("Nie udało się utworzyć zmiany");
            }
        }
    };

    // Sort templates by start time
    const sortedTemplates = useMemo(() => {
        return [...templates].sort((a, b) => {
            const [aH, aM] = a.start_time.split(":").map(Number);
            const [bH, bM] = b.start_time.split(":").map(Number);
            return aH * 60 + aM - (bH * 60 + bM);
        });
    }, [templates]);

    // Active employees only (filtered)
    const activeEmployees = useMemo(() => {
        let filtered = employees.filter((e) => e.is_active);
        if (selectedEmployeeIds) {
            filtered = filtered.filter((e) => selectedEmployeeIds.has(e.id));
        }
        return filtered;
    }, [employees, selectedEmployeeIds]);

    // Toggle template filter
    const toggleTemplateFilter = (templateId: string) => {
        setSelectedTemplateIds((prev) => {
            if (prev === null) {
                // First selection - select only this one
                return new Set([templateId]);
            }
            const next = new Set(prev);
            if (next.has(templateId)) {
                next.delete(templateId);
                if (next.size === 0) return null; // Show all
            } else {
                next.add(templateId);
            }
            return next;
        });
    };

    // Toggle employee filter
    const toggleEmployeeFilter = (employeeId: string) => {
        setSelectedEmployeeIds((prev) => {
            if (prev === null) {
                return new Set([employeeId]);
            }
            const next = new Set(prev);
            if (next.has(employeeId)) {
                next.delete(employeeId);
                if (next.size === 0) return null;
            } else {
                next.add(employeeId);
            }
            return next;
        });
    };

    // Week day headers
    const weekDays = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                    Brak szablonów zmian
                </h3>
                <p className="text-muted-foreground max-w-md mb-4">
                    Dodaj szablony zmian w zakładce "Szablony" (np. Rano
                    6:00-14:00, Popołudnie 14:00-22:00), aby móc przypisywać
                    pracowników metodą przeciągnij i upuść.
                </p>
                <Button variant="outline" asChild>
                    <a href="/dashboard/templates">Przejdź do szablonów</a>
                </Button>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full">
                {/* Error message */}
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Navigation & Toolbar */}
                <div className="flex items-center justify-between py-4 border-b flex-wrap gap-2">
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
                            <Calendar className="h-4 w-4 inline mr-2" />
                            {monthTitle}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Filters */}
                        <Popover
                            open={showFilters}
                            onOpenChange={setShowFilters}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filtry
                                    {(selectedTemplateIds ||
                                        selectedEmployeeIds) && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-2 text-xs"
                                        >
                                            {(selectedTemplateIds?.size || 0) +
                                                (selectedEmployeeIds?.size ||
                                                    0)}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <div className="space-y-4">
                                    {/* Template filters */}
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">
                                            Szablony zmian
                                        </Label>
                                        <div className="space-y-2">
                                            {sortedTemplates.map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Checkbox
                                                        id={`template-${t.id}`}
                                                        checked={
                                                            selectedTemplateIds ===
                                                                null ||
                                                            selectedTemplateIds.has(
                                                                t.id
                                                            )
                                                        }
                                                        onCheckedChange={() =>
                                                            toggleTemplateFilter(
                                                                t.id
                                                            )
                                                        }
                                                    />
                                                    <div
                                                        className="w-3 h-3 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                t.color,
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`template-${t.id}`}
                                                        className="text-sm cursor-pointer"
                                                    >
                                                        {t.name} ({t.start_time}
                                                        -{t.end_time})
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Employee filters */}
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">
                                            Pracownicy
                                        </Label>
                                        <ScrollArea className="h-[150px]">
                                            <div className="space-y-2 pr-2">
                                                {employees
                                                    .filter((e) => e.is_active)
                                                    .map((emp) => (
                                                        <div
                                                            key={emp.id}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Checkbox
                                                                id={`employee-${emp.id}`}
                                                                checked={
                                                                    selectedEmployeeIds ===
                                                                        null ||
                                                                    selectedEmployeeIds.has(
                                                                        emp.id
                                                                    )
                                                                }
                                                                onCheckedChange={() =>
                                                                    toggleEmployeeFilter(
                                                                        emp.id
                                                                    )
                                                                }
                                                            />
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarFallback
                                                                    style={{
                                                                        backgroundColor:
                                                                            emp.color,
                                                                    }}
                                                                    className="text-white text-[8px]"
                                                                >
                                                                    {
                                                                        emp
                                                                            .first_name[0]
                                                                    }
                                                                    {
                                                                        emp
                                                                            .last_name[0]
                                                                    }
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <label
                                                                htmlFor={`employee-${emp.id}`}
                                                                className="text-sm cursor-pointer"
                                                            >
                                                                {emp.first_name}{" "}
                                                                {emp.last_name}
                                                            </label>
                                                        </div>
                                                    ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    {/* Clear filters */}
                                    {(selectedTemplateIds ||
                                        selectedEmployeeIds) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => {
                                                setSelectedTemplateIds(null);
                                                setSelectedEmployeeIds(null);
                                            }}
                                        >
                                            Wyczyść filtry
                                        </Button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <span className="text-sm text-muted-foreground">
                            <GripVertical className="h-4 w-4 inline mr-1" />
                            Przeciągnij
                        </span>

                        {onGenerateSchedule && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onGenerateSchedule}
                            >
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generuj
                            </Button>
                        )}
                        {onExportPdf && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExportPdf}
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                        )}
                        {onExportExcel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExportExcel}
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                Excel
                            </Button>
                        )}
                        {onDeleteAllShifts && shifts.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                    if (
                                        confirm(
                                            `Czy na pewno chcesz usunąć wszystkie ${shifts.length} zmian z tego miesiąca?`
                                        )
                                    ) {
                                        onDeleteAllShifts();
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Usuń grafik
                            </Button>
                        )}
                    </div>
                </div>

                {/* Employee Pool */}
                <div className="py-3 border-b bg-muted/30 rounded-lg my-3 px-3">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pracownicy</span>
                        <Badge variant="secondary" className="text-xs">
                            {activeEmployees.length}
                        </Badge>
                    </div>
                    <ScrollArea className="w-full">
                        <div className="flex gap-2 pb-2">
                            {activeEmployees.map((employee) => (
                                <DraggableEmployee
                                    key={employee.id}
                                    employee={employee}
                                    hoursThisMonth={
                                        hoursPerEmployee.get(employee.id) || 0
                                    }
                                />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto bg-white p-2 rounded-lg border">
                    {/* Week day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {weekDays.map((day, idx) => (
                            <div
                                key={day}
                                className={cn(
                                    "text-center py-2 text-xs font-semibold uppercase tracking-wider",
                                    idx >= 5 && "text-muted-foreground"
                                )}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day) => (
                            <DayCell
                                key={day.date}
                                day={day}
                                templates={sortedTemplates}
                                shifts={shifts}
                                employeeMap={employeeMap}
                                filteredTemplateIds={selectedTemplateIds}
                                onRemoveShift={onDeleteShift}
                            />
                        ))}
                    </div>
                </div>

                {/* Stats footer */}
                <div className="border-t py-3 mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                                {shifts.length}
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            zmian
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-green-600">
                                {new Set(shifts.map((s) => s.employee_id)).size}
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            pracowników
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">
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
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            łącznie
                        </span>
                    </div>
                    {/* Template legend */}
                    <div className="flex items-center gap-3 ml-auto">
                        {sortedTemplates.slice(0, 4).map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center gap-1 text-xs"
                            >
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: t.color }}
                                />
                                <span className="text-muted-foreground">
                                    {t.name}
                                </span>
                                <span className="text-muted-foreground/60">
                                    ({t.capacity || 1} os.)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
                {activeEmployee && (
                    <div className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-primary bg-card shadow-2xl cursor-grabbing scale-110">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                            <AvatarFallback
                                style={{
                                    backgroundColor: activeEmployee.color,
                                }}
                                className="text-white text-sm font-bold"
                            >
                                {activeEmployee.first_name[0]}
                                {activeEmployee.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold">
                            {activeEmployee.first_name}{" "}
                            {activeEmployee.last_name}
                        </span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
