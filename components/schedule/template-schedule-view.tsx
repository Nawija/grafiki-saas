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
    useDroppable,
    useDraggable,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
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
    ChevronLeft,
    ChevronRight,
    User,
    Clock,
    X,
    AlertTriangle,
    GripVertical,
    Wand2,
    FileDown,
} from "lucide-react";

import type { Shift, Employee, ShiftTemplate } from "@/types";
import {
    isPublicHoliday,
    isTradingSunday,
    isNonTradingSunday,
    getHolidayName,
} from "@/lib/polish-holidays";

interface TemplateScheduleViewProps {
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
    onDateRangeChange?: (start: Date, end: Date) => void;
    onGenerateSchedule?: () => void;
    onExportPdf?: () => void;
    onExportExcel?: () => void;
}

// Draggable Employee Component
function DraggableEmployee({
    employee,
    hoursThisWeek,
}: {
    employee: Employee;
    hoursThisWeek: number;
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

    const weeklyTarget = employee.hours_per_week || 40;
    const hoursPercent = Math.round((hoursThisWeek / weeklyTarget) * 100);

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
                            "flex flex-col items-center gap-1 p-2 rounded-xl border-2 bg-card cursor-grab transition-all hover:shadow-md hover:border-primary/50 min-w-[80px]",
                            isDragging &&
                                "opacity-50 cursor-grabbing shadow-lg scale-105",
                            hoursPercent >= 100 &&
                                "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                        )}
                    >
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarFallback
                                style={{ backgroundColor: employee.color }}
                                className="text-white text-sm font-bold"
                            >
                                {employee.first_name[0]}
                                {employee.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center truncate max-w-[70px]">
                            {employee.first_name}
                        </span>
                        <div className="flex items-center gap-1">
                            <div
                                className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    hoursPercent >= 100
                                        ? "bg-green-500 text-white"
                                        : hoursPercent >= 75
                                        ? "bg-yellow-500 text-white"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {hoursThisWeek}h
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {hoursThisWeek}h / {weeklyTarget}h ({hoursPercent}%)
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Template Slot Component (droppable)
function TemplateSlot({
    template,
    date,
    shift,
    employee,
    isNonWorkingDay,
    hasConflict,
    onRemove,
}: {
    template: ShiftTemplate;
    date: string;
    shift?: Shift;
    employee?: Employee;
    isNonWorkingDay: boolean;
    hasConflict?: boolean;
    onRemove?: () => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${template.id}-${date}`,
        data: { type: "slot", template, date },
        disabled: isNonWorkingDay || !!shift,
    });

    if (isNonWorkingDay) {
        return (
            <div className="h-14 rounded-lg bg-muted/50 flex items-center justify-center border border-dashed border-muted-foreground/20">
                <span className="text-xs text-muted-foreground">—</span>
            </div>
        );
    }

    // If shift exists in this slot
    if (shift && employee) {
        return (
            <div
                className={cn(
                    "h-14 rounded-lg flex items-center gap-2 px-2 border-2 transition-all group relative",
                    hasConflict && "border-red-500 bg-red-50 dark:bg-red-950/20"
                )}
                style={{
                    backgroundColor: `${employee.color}15`,
                    borderColor: employee.color,
                }}
            >
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                    <AvatarFallback
                        style={{ backgroundColor: employee.color }}
                        className="text-white text-[10px] font-bold"
                    >
                        {employee.first_name[0]}
                        {employee.last_name[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                        {employee.first_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {shift.start_time}-{shift.end_time}
                    </p>
                </div>
                {onRemove && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute -top-2 -right-2 bg-white dark:bg-slate-800 border shadow-sm opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    }

    // Empty slot
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "h-14 rounded-lg border-2 border-dashed flex items-center justify-center transition-all",
                isOver
                    ? "border-primary bg-primary/10 scale-105 shadow-md"
                    : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
            )}
        >
            <div className="flex flex-col items-center gap-0.5">
                <User className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-[9px] text-muted-foreground/50">
                    Przeciągnij
                </span>
            </div>
        </div>
    );
}

export function TemplateScheduleView({
    shifts,
    employees,
    templates,
    onCreateShift,
    onDeleteShift,
    onDateRangeChange,
    onGenerateSchedule,
    onExportPdf,
    onExportExcel,
}: TemplateScheduleViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Calculate week range
    const dateRange = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return { start, end };
    }, [currentDate]);

    // Notify parent when date range changes
    useEffect(() => {
        if (onDateRangeChange) {
            onDateRangeChange(dateRange.start, dateRange.end);
        }
    }, [dateRange.start, dateRange.end, onDateRangeChange]);

    // Generate days array
    const days = useMemo(() => {
        return eachDayOfInterval(dateRange).map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayOfWeek = day.getDay();
            return {
                date: dateStr,
                day,
                dayOfWeek,
                dayName: format(day, "EEE", { locale: pl }),
                fullDayName: format(day, "EEEE", { locale: pl }),
                dayNumber: format(day, "d"),
                monthName: format(day, "MMM", { locale: pl }),
                isToday: format(new Date(), "yyyy-MM-dd") === dateStr,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isHoliday: isPublicHoliday(day),
                holidayName: getHolidayName(day),
                isTradingSunday: isTradingSunday(day),
                isNonTradingSunday: isNonTradingSunday(day),
            };
        });
    }, [dateRange]);

    // Create employee map
    const employeeMap = useMemo(() => {
        const map = new Map<string, Employee>();
        employees.forEach((emp) => map.set(emp.id, emp));
        return map;
    }, [employees]);

    // Calculate hours per employee for this week
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

    // Find shift for specific template slot
    const getShiftForSlot = (
        templateId: string,
        date: string
    ): Shift | undefined => {
        const template = templates.find((t) => t.id === templateId);
        if (!template) return undefined;

        return shifts.find(
            (s) =>
                s.date === date &&
                s.start_time === template.start_time &&
                s.end_time === template.end_time
        );
    };

    // Check for time conflicts
    const hasTimeConflict = (
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

            const [startH, startM] = shift.start_time.split(":").map(Number);
            const [endH, endM] = shift.end_time.split(":").map(Number);
            const start = startH * 60 + startM;
            const end = endH * 60 + endM;

            // Check overlap
            return newStart < end && newEnd > start;
        });
    };

    // Navigation
    const navigatePrevious = () => setCurrentDate(subWeeks(currentDate, 1));
    const navigateNext = () => setCurrentDate(addWeeks(currentDate, 1));
    const navigateToday = () => setCurrentDate(new Date());

    // Date range title
    const dateRangeTitle = useMemo(() => {
        const start = format(dateRange.start, "d MMM", { locale: pl });
        const end = format(dateRange.end, "d MMM yyyy", { locale: pl });
        return `${start} - ${end}`;
    }, [dateRange]);

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

        // Check if dropped on a slot
        if (
            active.data.current?.type === "employee" &&
            over.data.current?.type === "slot"
        ) {
            const employee = active.data.current.employee as Employee;
            const template = over.data.current.template as ShiftTemplate;
            const date = over.data.current.date as string;

            // Check if slot is already occupied
            const existingShift = getShiftForSlot(template.id, date);
            if (existingShift) {
                setError("Ten slot jest już zajęty");
                return;
            }

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

    // Active employees only
    const activeEmployees = useMemo(() => {
        return employees.filter((e) => e.is_active);
    }, [employees]);

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

                {/* Navigation */}
                <div className="flex items-center justify-between py-4 border-b">
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
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-2">
                            <GripVertical className="h-4 w-4 inline mr-1" />
                            Przeciągnij pracownika
                        </span>
                        {onGenerateSchedule && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onGenerateSchedule}
                            >
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generuj grafik
                            </Button>
                        )}
                        {(onExportPdf || onExportExcel) && (
                            <div className="flex items-center gap-1">
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
                            </div>
                        )}
                    </div>
                </div>

                {/* Employee Pool */}
                <div className="py-4 border-b bg-muted/30 rounded-lg my-4 px-4">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pracownicy</span>
                        <Badge variant="secondary" className="text-xs">
                            {activeEmployees.length}
                        </Badge>
                    </div>
                    <ScrollArea className="w-full">
                        <div className="flex gap-3 pb-2">
                            {activeEmployees.map((employee) => (
                                <DraggableEmployee
                                    key={employee.id}
                                    employee={employee}
                                    hoursThisWeek={
                                        hoursPerEmployee.get(employee.id) || 0
                                    }
                                />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* Schedule Grid */}
                <div className="flex-1 overflow-auto">
                    <div className="min-w-[900px]">
                        {/* Header row with days */}
                        <div
                            className="grid gap-2 mb-3"
                            style={{
                                gridTemplateColumns: "140px repeat(7, 1fr)",
                            }}
                        >
                            <div className="p-2 flex items-end">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Zmiana
                                </span>
                            </div>
                            {days.map((day) => (
                                <div
                                    key={day.date}
                                    className={cn(
                                        "p-3 text-center rounded-xl transition-colors",
                                        day.isToday &&
                                            "bg-primary text-primary-foreground shadow-md",
                                        day.isHoliday &&
                                            !day.isToday &&
                                            "bg-red-100 dark:bg-red-950/30",
                                        day.isNonTradingSunday &&
                                            !day.isToday &&
                                            !day.isHoliday &&
                                            "bg-muted",
                                        !day.isToday &&
                                            !day.isHoliday &&
                                            !day.isNonTradingSunday &&
                                            "bg-card border"
                                    )}
                                >
                                    <p
                                        className={cn(
                                            "text-xs font-medium uppercase tracking-wider",
                                            !day.isToday &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        {day.dayName}
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {day.dayNumber}
                                    </p>
                                    <p
                                        className={cn(
                                            "text-[10px]",
                                            !day.isToday &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        {day.monthName}
                                    </p>
                                    {day.isHoliday && (
                                        <Badge
                                            variant="destructive"
                                            className="text-[9px] mt-1 px-1"
                                        >
                                            {day.holidayName || "Święto"}
                                        </Badge>
                                    )}
                                    {day.isTradingSunday && (
                                        <Badge className="text-[9px] mt-1 px-1 bg-green-500">
                                            Handlowa
                                        </Badge>
                                    )}
                                    {day.isNonTradingSunday &&
                                        !day.isHoliday && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[9px] mt-1 px-1"
                                            >
                                                Zamknięte
                                            </Badge>
                                        )}
                                </div>
                            ))}
                        </div>

                        {/* Template rows */}
                        {sortedTemplates.map((template) => (
                            <div
                                key={template.id}
                                className="grid gap-2 mb-2"
                                style={{
                                    gridTemplateColumns: "140px repeat(7, 1fr)",
                                }}
                            >
                                {/* Template info */}
                                <div
                                    className="p-3 rounded-xl border-l-4 bg-card border flex flex-col justify-center"
                                    style={{ borderLeftColor: template.color }}
                                >
                                    <p className="text-sm font-semibold">
                                        {template.name}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">
                                            {template.start_time} -{" "}
                                            {template.end_time}
                                        </p>
                                    </div>
                                </div>

                                {/* Slots for each day */}
                                {days.map((day) => {
                                    const isNonWorkingDay =
                                        day.isHoliday || day.isNonTradingSunday;
                                    const shift = getShiftForSlot(
                                        template.id,
                                        day.date
                                    );
                                    const employee = shift
                                        ? employeeMap.get(shift.employee_id)
                                        : undefined;

                                    return (
                                        <TemplateSlot
                                            key={`${template.id}-${day.date}`}
                                            template={template}
                                            date={day.date}
                                            shift={shift}
                                            employee={employee}
                                            isNonWorkingDay={isNonWorkingDay}
                                            onRemove={
                                                shift
                                                    ? () =>
                                                          onDeleteShift(
                                                              shift.id
                                                          )
                                                    : undefined
                                            }
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats footer */}
                <div className="border-t py-4 mt-4 flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                                {shifts.length}
                            </span>
                        </div>
                        <span className="text-muted-foreground">
                            zmian w tym tygodniu
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-green-600">
                                {new Set(shifts.map((s) => s.employee_id)).size}
                            </span>
                        </div>
                        <span className="text-muted-foreground">
                            pracowników przypisanych
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">
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
                        <span className="text-muted-foreground">
                            łącznie godzin
                        </span>
                    </div>
                </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
                {activeEmployee && (
                    <div className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-primary bg-card shadow-2xl cursor-grabbing scale-110">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md">
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
