"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    shiftSchema,
    type ShiftInput,
    validateShiftTimes,
} from "@/lib/validations/schedule";
import { Employee, ShiftTemplate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Clock, Settings2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Typ lokalnej zmiany (może nie mieć jeszcze ID z bazy)
export interface LocalShift {
    id: string; // tymczasowe ID dla nowych zmian
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
    // Status lokalny
    _status: "new" | "modified" | "deleted" | "unchanged";
    _originalId?: string; // ID z bazy dla istniejących zmian
}

interface LocalShiftEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string;
    employeeId: string;
    date: string;
    existingShift?: LocalShift;
    employee: Employee;
    templates?: ShiftTemplate[];
    onSave: (
        shift: Omit<LocalShift, "id" | "_status"> & {
            _status?: "new" | "modified";
        }
    ) => void;
    onDelete: (shiftId: string) => void;
}

export function LocalShiftEditor({
    open,
    onOpenChange,
    scheduleId,
    employeeId,
    date,
    existingShift,
    employee,
    templates = [],
    onSave,
    onDelete,
}: LocalShiftEditorProps) {
    const [selectedColor, setSelectedColor] = useState<string>(
        existingShift?.color || "#3b82f6"
    );
    const [mode, setMode] = useState<"template" | "custom">(
        templates.length === 0 || !!existingShift ? "custom" : "template"
    );

    const shiftColors = [
        { name: "Niebieski", value: "#3b82f6" },
        { name: "Zielony", value: "#22c55e" },
        { name: "Żółty", value: "#eab308" },
        { name: "Pomarańczowy", value: "#f97316" },
        { name: "Czerwony", value: "#ef4444" },
        { name: "Fioletowy", value: "#a855f7" },
        { name: "Różowy", value: "#ec4899" },
        { name: "Cyan", value: "#06b6d4" },
    ];

    const formattedDate = format(parseISO(date), "d MMMM yyyy (EEEE)", {
        locale: pl,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        watch,
    } = useForm<ShiftInput>({
        resolver: zodResolver(shiftSchema),
        defaultValues: {
            employeeId,
            date,
            startTime: existingShift?.start_time?.substring(0, 5) || "08:00",
            endTime: existingShift?.end_time?.substring(0, 5) || "16:00",
            breakMinutes: existingShift?.break_minutes || 0,
            notes: existingShift?.notes || "",
        },
    });

    const startTime = watch("startTime");
    const endTime = watch("endTime");
    const breakMinutes = watch("breakMinutes");

    function calculateWorkHours(
        start?: string,
        end?: string,
        breakMins?: number
    ): string {
        const s = start || startTime;
        const e = end || endTime;
        const b = breakMins ?? breakMinutes ?? 0;

        if (!s || !e) return "0h";

        const [startH, startM] = s.split(":").map(Number);
        const [endH, endM] = e.split(":").map(Number);

        let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        totalMinutes -= b;

        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }

    function onSubmit(data: ShiftInput) {
        if (!validateShiftTimes(data.startTime, data.endTime)) {
            setError("endTime", {
                message:
                    "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
            });
            return;
        }

        onSave({
            schedule_id: scheduleId,
            employee_id: employeeId,
            date,
            start_time: data.startTime,
            end_time: data.endTime,
            break_minutes: data.breakMinutes,
            notes: data.notes || null,
            color: selectedColor,
            _status: existingShift ? "modified" : "new",
            _originalId: existingShift?._originalId || existingShift?.id,
        });

        onOpenChange(false);
    }

    function handleDelete() {
        if (!existingShift) return;
        onDelete(existingShift.id);
        onOpenChange(false);
    }

    function handleQuickAdd(template: ShiftTemplate) {
        onSave({
            schedule_id: scheduleId,
            employee_id: employeeId,
            date,
            start_time: template.start_time.substring(0, 5),
            end_time: template.end_time.substring(0, 5),
            break_minutes: template.break_minutes,
            notes: null,
            color: template.color,
            _status: "new",
        });

        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>
                        {existingShift ? "Edytuj zmianę" : "Dodaj zmianę"}
                    </DialogTitle>
                    <DialogDescription>
                        {employee.first_name} {employee.last_name} —{" "}
                        {formattedDate}
                    </DialogDescription>
                </DialogHeader>

                {/* Szablony - tylko przy dodawaniu nowej zmiany i gdy są szablony */}
                {!existingShift &&
                    templates.length > 0 &&
                    mode === "template" && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                Wybierz zmianę
                            </Label>
                            <div className="grid gap-2">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => handleQuickAdd(template)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:border-primary/50 hover:bg-accent text-left",
                                            "border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        template.color,
                                                }}
                                            />
                                            <div>
                                                <div className="font-medium">
                                                    {template.name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {template.start_time.substring(
                                                        0,
                                                        5
                                                    )}{" "}
                                                    —{" "}
                                                    {template.end_time.substring(
                                                        0,
                                                        5
                                                    )}
                                                    {template.break_minutes >
                                                        0 && (
                                                        <span className="ml-2">
                                                            (przerwa{" "}
                                                            {
                                                                template.break_minutes
                                                            }{" "}
                                                            min)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {calculateWorkHours(
                                                template.start_time,
                                                template.end_time,
                                                template.break_minutes
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        lub
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setMode("custom")}
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                Niestandardowe godziny
                            </Button>
                        </div>
                    )}

                {/* Formularz niestandardowy */}
                {(existingShift ||
                    templates.length === 0 ||
                    mode === "custom") && (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <input type="hidden" {...register("employeeId")} />
                        <input type="hidden" {...register("date")} />

                        {/* Przycisk powrotu do szablonów */}
                        {!existingShift &&
                            templates.length > 0 &&
                            mode === "custom" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMode("template")}
                                    className="mb-2"
                                >
                                    ← Powrót do szablonów
                                </Button>
                            )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Od</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    {...register("startTime")}
                                />
                                {errors.startTime && (
                                    <p className="text-sm text-red-500">
                                        {errors.startTime.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endTime">Do</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    {...register("endTime")}
                                />
                                {errors.endTime && (
                                    <p className="text-sm text-red-500">
                                        {errors.endTime.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="breakMinutes">
                                Przerwa (minuty)
                            </Label>
                            <Input
                                id="breakMinutes"
                                type="number"
                                min="0"
                                max="120"
                                {...register("breakMinutes", {
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.breakMinutes && (
                                <p className="text-sm text-red-500">
                                    {errors.breakMinutes.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
                            <Input
                                id="notes"
                                placeholder="np. Zmiana nocna"
                                {...register("notes")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Kolor zmiany</Label>
                            <div className="flex flex-wrap gap-2">
                                {shiftColors.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() =>
                                            setSelectedColor(color.value)
                                        }
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-all",
                                            selectedColor === color.value
                                                ? "border-foreground scale-110"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Czas pracy:{" "}
                                <span className="font-medium text-foreground">
                                    {calculateWorkHours()}
                                </span>
                            </span>
                        </div>

                        <div className="flex justify-between pt-4">
                            {existingShift &&
                            existingShift._status !== "new" ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Usuń
                                </Button>
                            ) : existingShift &&
                              existingShift._status === "new" ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Usuń
                                </Button>
                            ) : (
                                <div />
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Anuluj
                                </Button>
                                <Button type="submit">
                                    {existingShift ? "Zapisz" : "Dodaj"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
