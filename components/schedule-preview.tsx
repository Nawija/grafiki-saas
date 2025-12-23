"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_EMPLOYEES, DEMO_SCHEDULE, WEEK_DAYS } from "@/lib/constants";
import { Calendar, GripVertical } from "lucide-react";
import { useState } from "react";

export function SchedulePreview() {
    const [activeView, setActiveView] = useState<"week" | "month">("week");
    const [draggedEmployee, setDraggedEmployee] = useState<number | null>(null);

    return (
        <Card className="overflow-hidden border-border/50 shadow-2xl shadow-primary/5">
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">
                            Grafik zespołu
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Grudzień 2024
                        </p>
                    </div>
                </div>
                <Tabs
                    value={activeView}
                    onValueChange={(v) => setActiveView(v as "week" | "month")}
                >
                    <TabsList className="h-8">
                        <TabsTrigger value="week" className="text-xs px-3">
                            Tydzień
                        </TabsTrigger>
                        <TabsTrigger value="month" className="text-xs px-3">
                            Miesiąc
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Schedule Grid */}
            <div className="p-4 sm:p-6">
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                    {WEEK_DAYS.map((day, i) => (
                        <div key={day} className="text-center">
                            <span className="text-xs font-medium text-muted-foreground">
                                {day}
                            </span>
                            <p className="text-sm font-semibold mt-0.5">
                                {16 + i}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Schedule Cells */}
                <div className="grid grid-cols-7 gap-2">
                    {DEMO_SCHEDULE.map(({ day, shifts }) => (
                        <ScheduleCell
                            key={day}
                            employeeIds={shifts}
                            draggedEmployee={draggedEmployee}
                            setDraggedEmployee={setDraggedEmployee}
                        />
                    ))}
                </div>

                {/* Stats Bar */}
                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 p-3">
                    <StatIndicator
                        label="Obsadzonych zmian"
                        value="14/14"
                        status="success"
                    />
                    <StatIndicator
                        label="Godzin zaplanowanych"
                        value="168h"
                        status="info"
                    />
                    <StatIndicator
                        label="Optymalizacja"
                        value="96%"
                        status="success"
                    />
                </div>
            </div>

            {/* Drag Hint */}
            <div className="border-t bg-muted/20 px-4 py-2.5 sm:px-6">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVertical className="h-3.5 w-3.5" />
                    <span>
                        Przeciągnij pracownika, aby zmienić przypisanie zmiany
                    </span>
                </p>
            </div>
        </Card>
    );
}

// Sub-components for DRY code
interface ScheduleCellProps {
    employeeIds: readonly number[];
    draggedEmployee: number | null;
    setDraggedEmployee: (id: number | null) => void;
}

function ScheduleCell({
    employeeIds,
    draggedEmployee,
    setDraggedEmployee,
}: ScheduleCellProps) {
    return (
        <div className="min-h-20 rounded-lg border border-border/50 bg-card p-1.5 transition-colors hover:border-primary/30 hover:bg-accent/50">
            <div className="flex flex-col gap-1">
                {employeeIds.map((empId) => {
                    const employee = DEMO_EMPLOYEES.find((e) => e.id === empId);
                    if (!employee) return null;
                    return (
                        <div
                            key={empId}
                            draggable
                            onDragStart={() => setDraggedEmployee(empId)}
                            onDragEnd={() => setDraggedEmployee(null)}
                            className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-all cursor-grab active:cursor-grabbing hover:bg-muted ${
                                draggedEmployee === empId
                                    ? "opacity-50 scale-95"
                                    : ""
                            }`}
                        >
                            <Avatar className="h-5 w-5">
                                <AvatarFallback
                                    className={`text-[10px] font-medium ${employee.color}`}
                                >
                                    {employee.initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-medium truncate hidden sm:block">
                                {employee.name}
                            </span>
                            <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface StatIndicatorProps {
    label: string;
    value: string;
    status: "success" | "warning" | "info";
}

function StatIndicator({ label, value, status }: StatIndicatorProps) {
    const statusColors = {
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        info: "bg-primary",
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
            <span className="text-xs text-muted-foreground">{label}:</span>
            <Badge variant="secondary" className="text-xs font-semibold">
                {value}
            </Badge>
        </div>
    );
}
