"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock } from "lucide-react";
import type { Shift, Employee, ShiftType, ShiftTemplate } from "@/types";

interface ShiftFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift?: Shift | null;
    employees: Employee[];
    templates: ShiftTemplate[];
    defaultDate?: string;
    onSave: (shift: Partial<Shift>) => void;
}

interface ShiftFormData {
    employee_id: string;
    date: Date;
    start_time: string;
    end_time: string;
    break_minutes: number;
    type: ShiftType;
    position?: string;
    notes?: string;
    is_overtime: boolean;
}

const shiftTypes: { value: ShiftType; label: string }[] = [
    { value: "regular", label: "Standardowa" },
    { value: "overtime", label: "Nadgodziny" },
    { value: "training", label: "Szkolenie" },
    { value: "on_call", label: "Dyżur" },
];

export function ShiftFormDialog({
    open,
    onOpenChange,
    shift,
    employees,
    templates,
    defaultDate,
    onSave,
}: ShiftFormDialogProps) {
    const isEditing = !!shift;

    const form = useForm<ShiftFormData>({
        defaultValues: {
            employee_id: "",
            date: new Date(),
            start_time: "09:00",
            end_time: "17:00",
            break_minutes: 30,
            type: "regular",
            position: "",
            notes: "",
            is_overtime: false,
        },
    });

    // Reset form when dialog opens/closes or shift changes
    useEffect(() => {
        if (open) {
            if (shift) {
                form.reset({
                    employee_id: shift.employee_id,
                    date: new Date(shift.date),
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    break_minutes: shift.break_duration,
                    type: shift.type,
                    position: shift.position || "",
                    notes: shift.notes || "",
                    is_overtime: shift.is_overtime,
                });
            } else {
                form.reset({
                    employee_id: "",
                    date: defaultDate ? new Date(defaultDate) : new Date(),
                    start_time: "09:00",
                    end_time: "17:00",
                    break_minutes: 30,
                    type: "regular",
                    position: "",
                    notes: "",
                    is_overtime: false,
                });
            }
        }
    }, [open, shift, defaultDate, form]);

    // Apply template
    const applyTemplate = (templateId: string) => {
        const template = templates.find((t) => t.id === templateId);
        if (template) {
            form.setValue("start_time", template.start_time);
            form.setValue("end_time", template.end_time);
            form.setValue("break_minutes", template.break_duration);
        }
    };

    const onSubmit = (data: ShiftFormData) => {
        onSave({
            ...data,
            date: format(data.date, "yyyy-MM-dd"),
            id: shift?.id,
        });
        onOpenChange(false);
    };

    // Calculate shift duration
    const watchStartTime = form.watch("start_time");
    const watchEndTime = form.watch("end_time");
    const watchBreakMinutes = form.watch("break_minutes");

    const calculateDuration = () => {
        if (!watchStartTime || !watchEndTime) return null;

        const [startH, startM] = watchStartTime.split(":").map(Number);
        const [endH, endM] = watchEndTime.split(":").map(Number);

        let startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const totalMinutes =
            endMinutes - startMinutes - (watchBreakMinutes || 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return { hours, minutes, total: totalMinutes };
    };

    const duration = calculateDuration();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edytuj zmianę" : "Nowa zmiana"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Zmień szczegóły zmiany pracownika."
                            : "Dodaj nową zmianę do grafiku."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {/* Template selector */}
                        {templates.length > 0 && !isEditing && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Użyj szablonu
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {templates.map((template) => (
                                        <Button
                                            key={template.id}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                applyTemplate(template.id)
                                            }
                                        >
                                            {template.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Employee selector */}
                        <FormField
                            control={form.control}
                            name="employee_id"
                            rules={{ required: "Wybierz pracownika" }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pracownik</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz pracownika" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map((emp) => (
                                                <SelectItem
                                                    key={emp.id}
                                                    value={emp.id}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    emp.color ||
                                                                    "#3b82f6",
                                                            }}
                                                        >
                                                            {emp.first_name[0]}
                                                            {emp.last_name[0]}
                                                        </div>
                                                        {emp.first_name}{" "}
                                                        {emp.last_name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Date picker */}
                        <FormField
                            control={form.control}
                            name="date"
                            rules={{ required: "Wybierz datę" }}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value &&
                                                            "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(
                                                            field.value,
                                                            "PPP",
                                                            { locale: pl }
                                                        )
                                                    ) : (
                                                        <span>
                                                            Wybierz datę
                                                        </span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                locale={pl}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Time inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_time"
                                rules={{ required: "Wymagane" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Godzina rozpoczęcia
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="end_time"
                                rules={{ required: "Wymagane" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Godzina zakończenia
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Break and duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="break_minutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Przerwa (minuty)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={120}
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex flex-col justify-end">
                                <label className="text-sm font-medium mb-2">
                                    Czas pracy
                                </label>
                                {duration && (
                                    <Badge
                                        variant="secondary"
                                        className="h-10 justify-center text-base"
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        {duration.hours}h{" "}
                                        {duration.minutes > 0 &&
                                            `${duration.minutes}m`}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Shift type */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Typ zmiany</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz typ" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {shiftTypes.map((type) => (
                                                <SelectItem
                                                    key={type.value}
                                                    value={type.value}
                                                >
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Position (optional) */}
                        <FormField
                            control={form.control}
                            name="position"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Stanowisko (opcjonalne)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="np. Kasa 1, Magazyn"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Określ stanowisko lub miejsce pracy
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Overtime switch */}
                        <FormField
                            control={form.control}
                            name="is_overtime"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Nadgodziny</FormLabel>
                                        <FormDescription>
                                            Oznacz jako zmianę nadgodzinową
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Anuluj
                            </Button>
                            <Button type="submit">
                                {isEditing ? "Zapisz zmiany" : "Dodaj zmianę"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
