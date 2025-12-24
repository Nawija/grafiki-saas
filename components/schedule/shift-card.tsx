"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    MoreHorizontal,
    Clock,
    Trash2,
    Edit,
    Copy,
    GripVertical,
} from "lucide-react";
import type { Shift, Employee } from "@/types";

interface ShiftCardProps {
    shift: Shift;
    employee?: Employee;
    isDragging?: boolean;
    isOverlay?: boolean;
    onEdit?: (shift: Shift) => void;
    onDelete?: (shiftId: string) => void;
    onDuplicate?: (shift: Shift) => void;
    compact?: boolean;
}

const shiftTypeColors: Record<string, string> = {
    regular: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    overtime:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    training:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    on_call:
        "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const shiftTypeLabels: Record<string, string> = {
    regular: "Standardowa",
    overtime: "Nadgodziny",
    training: "Szkolenie",
    on_call: "Dyżur",
};

function calculateDuration(
    startTime: string,
    endTime: string,
    breakMinutes: number
): string {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
}

export function ShiftCard({
    shift,
    employee,
    isDragging,
    isOverlay,
    onEdit,
    onDelete,
    onDuplicate,
    compact = false,
}: ShiftCardProps) {
    const duration = calculateDuration(
        shift.start_time,
        shift.end_time,
        shift.break_duration
    );

    const employeeName = employee
        ? `${employee.first_name} ${employee.last_name}`
        : "";
    const employeeInitials = employee
        ? `${employee.first_name[0]}${employee.last_name[0]}`
        : "?";

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "group relative rounded-lg border bg-card p-2 transition-all",
                    "hover:border-primary/50 hover:shadow-sm",
                    isDragging &&
                        "opacity-50 ring-2 ring-primary ring-offset-2",
                    isOverlay && "shadow-lg rotate-3 scale-105",
                    compact ? "p-1.5" : "p-2"
                )}
            >
                {/* Drag handle */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                <div
                    className={cn(
                        "flex items-start gap-2",
                        compact ? "pl-0" : "pl-4"
                    )}
                >
                    {/* Employee avatar/initials */}
                    {employee && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "flex shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
                                        compact ? "h-6 w-6" : "h-8 w-8"
                                    )}
                                    style={{
                                        backgroundColor:
                                            employee.color || "#3b82f6",
                                    }}
                                >
                                    {employeeInitials}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{employeeName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {employee.position}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Shift info */}
                    <div className="flex-1 min-w-0">
                        {!compact && employee && (
                            <p className="text-sm font-medium truncate">
                                {employeeName}
                            </p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                                {shift.start_time} - {shift.end_time}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{duration}</span>
                        </div>
                        {!compact && (
                            <div className="mt-1 flex items-center gap-1.5">
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-[10px] px-1.5 py-0",
                                        shiftTypeColors[shift.type]
                                    )}
                                >
                                    {shiftTypeLabels[shift.type]}
                                </Badge>
                                {shift.position && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0"
                                    >
                                        {shift.position}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {!isOverlay && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                                        compact && "h-5 w-5"
                                    )}
                                >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                    <span className="sr-only">Opcje</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={() => onEdit?.(shift)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edytuj
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onDuplicate?.(shift)}
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplikuj
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete?.(shift.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Usuń
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Overtime indicator */}
                {shift.is_overtime && (
                    <div className="absolute -right-1 -top-1">
                        <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0"
                        >
                            +
                        </Badge>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

// Sortable wrapper for drag & drop
export function SortableShiftCard(props: ShiftCardProps & { id: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ShiftCard {...props} isDragging={isDragging} />
        </div>
    );
}
