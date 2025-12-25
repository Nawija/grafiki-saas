"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    shiftSchema,
    type ShiftInput,
    validateShiftTimes,
} from "@/lib/validations/schedule";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, Trash2, Clock, Settings2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ExistingShift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
}

interface ShiftEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string;
    employeeId: string;
    date: string;
    existingShift?: ExistingShift;
    employee: Employee;
    templates?: ShiftTemplate[];
}

export function ShiftEditor({
    open,
    onOpenChange,
    scheduleId,
    employeeId,
    date,
    existingShift,
    employee,
    templates = [],
}: ShiftEditorProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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

    async function onSubmit(data: ShiftInput) {
        if (!validateShiftTimes(data.startTime, data.endTime)) {
            setError("endTime", {
                message:
                    "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
            });
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();

            if (existingShift) {
                // Najpierw spróbuj z kolorem
                let result = await supabase
                    .from("shifts")
                    .update({
                        start_time: data.startTime,
                        end_time: data.endTime,
                        break_minutes: data.breakMinutes,
                        notes: data.notes || null,
                        color: selectedColor,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingShift.id);

                // Jeśli błąd dotyczy kolumny color, spróbuj bez niej
                if (
                    result.error?.code === "PGRST204" &&
                    result.error?.message?.includes("color")
                ) {
                    result = await supabase
                        .from("shifts")
                        .update({
                            start_time: data.startTime,
                            end_time: data.endTime,
                            break_minutes: data.breakMinutes,
                            notes: data.notes || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", existingShift.id);
                }

                if (result.error) throw result.error;
            } else {
                // Najpierw spróbuj z kolorem
                let result = await supabase.from("shifts").insert({
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    break_minutes: data.breakMinutes,
                    notes: data.notes || null,
                    color: selectedColor,
                });

                // Jeśli błąd dotyczy kolumny color, spróbuj bez niej
                if (
                    result.error?.code === "PGRST204" &&
                    result.error?.message?.includes("color")
                ) {
                    result = await supabase.from("shifts").insert({
                        schedule_id: scheduleId,
                        employee_id: employeeId,
                        date,
                        start_time: data.startTime,
                        end_time: data.endTime,
                        break_minutes: data.breakMinutes,
                        notes: data.notes || null,
                    });
                }

                if (result.error) throw result.error;
            }

            onOpenChange(false);
            router.refresh();
        } catch (error: unknown) {
            const err = error as {
                message?: string;
                code?: string;
                details?: string;
            };
            console.error("Error saving shift:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                full: error,
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!existingShift) return;

        setIsDeleting(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("shifts")
                .delete()
                .eq("id", existingShift.id);

            if (error) throw error;

            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error deleting shift:", error);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleQuickAdd(template: ShiftTemplate) {
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Najpierw spróbuj z kolorem
            let result = await supabase.from("shifts").insert({
                schedule_id: scheduleId,
                employee_id: employeeId,
                date,
                start_time: template.start_time.substring(0, 5),
                end_time: template.end_time.substring(0, 5),
                break_minutes: template.break_minutes,
                color: template.color,
                notes: null,
            });

            // Jeśli błąd dotyczy kolumny color, spróbuj bez niej
            if (
                result.error?.code === "PGRST204" &&
                result.error?.message?.includes("color")
            ) {
                console.warn(
                    "Column 'color' not found, inserting without color"
                );
                result = await supabase.from("shifts").insert({
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: template.start_time.substring(0, 5),
                    end_time: template.end_time.substring(0, 5),
                    break_minutes: template.break_minutes,
                    notes: null,
                });
            }

            if (result.error) {
                console.error("Supabase error:", result.error);
                throw result.error;
            }

            onOpenChange(false);
            router.refresh();
        } catch (error: unknown) {
            const err = error as {
                message?: string;
                code?: string;
                details?: string;
            };
            console.error("Error saving shift:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                full: error,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
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
                                        disabled={isLoading}
                                        onClick={() => handleQuickAdd(template)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:border-primary/50 hover:bg-accent text-left",
                                            "border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full shrink-0"
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
                                    disabled={isLoading}
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
                                    disabled={isLoading}
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
                                disabled={isLoading}
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
                                disabled={isLoading}
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
                            {existingShift ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isLoading || isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
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
                                    disabled={isLoading || isDeleting}
                                >
                                    Anuluj
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading || isDeleting}
                                >
                                    {isLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
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
