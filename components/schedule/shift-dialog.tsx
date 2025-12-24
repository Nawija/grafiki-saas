"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
    X,
    Clock,
    User,
    Calendar,
    Coffee,
    Briefcase,
    FileText,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Employee, ShiftWithEmployee } from "@/types";

interface ShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift?: ShiftWithEmployee | null;
    date?: Date;
    employees: Employee[];
    defaultEmployeeId?: string;
    onSave: (shift: ShiftFormData) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export interface ShiftFormData {
    id?: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    position?: string;
    notes?: string;
}

const QUICK_SHIFTS = [
    { label: "Rano", start: "06:00", end: "14:00" },
    { label: "Dzień", start: "08:00", end: "16:00" },
    { label: "Popołudnie", start: "14:00", end: "22:00" },
    { label: "Cały dzień", start: "08:00", end: "20:00" },
];

const BREAK_OPTIONS = [
    { value: 0, label: "Bez przerwy" },
    { value: 15, label: "15 minut" },
    { value: 30, label: "30 minut" },
    { value: 45, label: "45 minut" },
    { value: 60, label: "1 godzina" },
];

export function ShiftDialog({
    open,
    onOpenChange,
    shift,
    date,
    employees,
    defaultEmployeeId,
    onSave,
    onDelete,
}: ShiftDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState<ShiftFormData>({
        employee_id: "",
        date: "",
        start_time: "08:00",
        end_time: "16:00",
        break_duration: 30,
        position: "",
        notes: "",
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            if (shift) {
                // Editing existing shift
                setFormData({
                    id: shift.id,
                    employee_id: shift.employee_id,
                    date: shift.date,
                    start_time: shift.start_time.slice(0, 5),
                    end_time: shift.end_time.slice(0, 5),
                    break_duration: shift.break_duration || 30,
                    position: shift.position || "",
                    notes: shift.notes || "",
                });
            } else {
                // Creating new shift
                setFormData({
                    employee_id: defaultEmployeeId || "",
                    date: date
                        ? format(date, "yyyy-MM-dd")
                        : format(new Date(), "yyyy-MM-dd"),
                    start_time: "08:00",
                    end_time: "16:00",
                    break_duration: 30,
                    position: "",
                    notes: "",
                });
            }
        }
    }, [open, shift, date, defaultEmployeeId]);

    const handleQuickShift = (start: string, end: string) => {
        setFormData((prev) => ({ ...prev, start_time: start, end_time: end }));
    };

    const calculateDuration = () => {
        const [startH, startM] = formData.start_time.split(":").map(Number);
        const [endH, endM] = formData.end_time.split(":").map(Number);

        let startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const totalMinutes =
            endMinutes - startMinutes - formData.break_duration;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    };

    const handleSave = async () => {
        if (!formData.employee_id || !formData.date) return;

        setIsLoading(true);
        try {
            await onSave(formData);
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving shift:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;

        setIsDeleting(true);
        try {
            await onDelete();
            onOpenChange(false);
        } catch (error) {
            console.error("Error deleting shift:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const selectedEmployee = employees.find(
        (e) => e.id === formData.employee_id
    );
    const isEditing = !!shift;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {isEditing ? "Edytuj zmianę" : "Dodaj zmianę"}
                    </DialogTitle>
                    <DialogDescription>
                        {date &&
                            format(
                                new Date(formData.date),
                                "EEEE, d MMMM yyyy",
                                { locale: pl }
                            )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Employee selection */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="employee"
                            className="flex items-center gap-2"
                        >
                            <User className="w-4 h-4" />
                            Pracownik
                        </Label>
                        <Select
                            value={formData.employee_id}
                            onValueChange={(value) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    employee_id: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Wybierz pracownika" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((employee) => (
                                    <SelectItem
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        employee.color ||
                                                        "#94a3b8",
                                                }}
                                            />
                                            {employee.first_name}{" "}
                                            {employee.last_name}
                                            {employee.position && (
                                                <span className="text-muted-foreground">
                                                    — {employee.position}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quick shift buttons */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Szybki wybór
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {QUICK_SHIFTS.map((qs) => (
                                <Button
                                    key={qs.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        handleQuickShift(qs.start, qs.end)
                                    }
                                    className={cn(
                                        "text-xs",
                                        formData.start_time === qs.start &&
                                            formData.end_time === qs.end &&
                                            "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                    )}
                                >
                                    {qs.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="start_time"
                                className="flex items-center gap-2"
                            >
                                <Clock className="w-4 h-4" />
                                Od
                            </Label>
                            <Input
                                id="start_time"
                                type="time"
                                value={formData.start_time}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        start_time: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_time">Do</Label>
                            <Input
                                id="end_time"
                                type="time"
                                value={formData.end_time}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        end_time: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    {/* Duration display */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-sm text-muted-foreground">
                            Czas pracy
                        </span>
                        <span className="font-semibold">
                            {calculateDuration()}
                        </span>
                    </div>

                    {/* Break duration */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Coffee className="w-4 h-4" />
                            Przerwa
                        </Label>
                        <div className="flex gap-2">
                            {BREAK_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            break_duration: option.value,
                                        }))
                                    }
                                    className={cn(
                                        "flex-1 text-xs",
                                        formData.break_duration ===
                                            option.value &&
                                            "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                    )}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="position"
                            className="flex items-center gap-2"
                        >
                            <Briefcase className="w-4 h-4" />
                            Stanowisko (opcjonalnie)
                        </Label>
                        <Input
                            id="position"
                            placeholder="np. Kasa, Obsługa, Magazyn"
                            value={formData.position}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    position: e.target.value,
                                }))
                            }
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="notes"
                            className="flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Notatka (opcjonalnie)
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Dodatkowe informacje..."
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    {isEditing && onDelete && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting || isLoading}
                            className="sm:mr-auto"
                        >
                            {isDeleting && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Usuń zmianę
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Anuluj
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!formData.employee_id || isLoading}
                    >
                        {isLoading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {isEditing ? "Zapisz zmiany" : "Dodaj zmianę"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
