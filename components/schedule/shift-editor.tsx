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
import { Employee } from "@/types/database";
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
import { Loader2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

interface ExistingShift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
}

interface ShiftEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string;
    employeeId: string;
    date: string;
    existingShift?: ExistingShift;
    employee: Employee;
}

export function ShiftEditor({
    open,
    onOpenChange,
    scheduleId,
    employeeId,
    date,
    existingShift,
    employee,
}: ShiftEditorProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const formattedDate = format(parseISO(date), "d MMMM yyyy (EEEE)", {
        locale: pl,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
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

    async function onSubmit(data: ShiftInput) {
        // Walidacja czasów
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
                // Aktualizuj istniejącą zmianę
                const { error } = await supabase
                    .from("shifts")
                    .update({
                        start_time: data.startTime,
                        end_time: data.endTime,
                        break_minutes: data.breakMinutes,
                        notes: data.notes || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingShift.id);

                if (error) throw error;
            } else {
                // Utwórz nową zmianę
                const { error } = await supabase.from("shifts").insert({
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    break_minutes: data.breakMinutes,
                    notes: data.notes || null,
                });

                if (error) throw error;
            }

            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error saving shift:", error);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>
                        {existingShift ? "Edytuj zmianę" : "Dodaj zmianę"}
                    </DialogTitle>
                    <DialogDescription>
                        {employee.first_name} {employee.last_name} -{" "}
                        {formattedDate}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...register("employeeId")} />
                    <input type="hidden" {...register("date")} />

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
                        <Label htmlFor="breakMinutes">Przerwa (minuty)</Label>
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
            </DialogContent>
        </Dialog>
    );
}
