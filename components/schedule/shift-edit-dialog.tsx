"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Trash2, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import type { Employee, ShiftTemplate } from "@/types";
import type { LocalShift } from "./schedule-calendar-dnd";

interface ShiftEditDialogProps {
    shift: LocalShift;
    employee: Employee;
    shiftTemplates: ShiftTemplate[];
    onSave: (updatedShift: Partial<LocalShift>) => void;
    onClose: () => void;
    onDelete: () => void;
}

export function ShiftEditDialog({
    shift,
    employee,
    shiftTemplates,
    onSave,
    onClose,
    onDelete,
}: ShiftEditDialogProps) {
    const [startTime, setStartTime] = useState(shift.start_time.slice(0, 5));
    const [endTime, setEndTime] = useState(shift.end_time.slice(0, 5));
    const [breakMinutes, setBreakMinutes] = useState(shift.break_minutes);
    const [notes, setNotes] = useState(shift.notes || "");

    // Oblicz czas pracy
    const calculateWorkHours = () => {
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Zmiana przez północ
        const workMinutes = totalMinutes - breakMinutes;
        const hours = Math.floor(workMinutes / 60);
        const minutes = workMinutes % 60;
        return `${hours}h ${minutes > 0 ? `${minutes}min` : ""}`.trim();
    };

    // Zastosuj szablon
    const applyTemplate = (templateId: string) => {
        const template = shiftTemplates.find((t) => t.id === templateId);
        if (template) {
            setStartTime(template.start_time.slice(0, 5));
            setEndTime(template.end_time.slice(0, 5));
            setBreakMinutes(template.break_minutes);
        }
    };

    const handleSave = () => {
        onSave({
            start_time: startTime + ":00",
            end_time: endTime + ":00",
            break_minutes: breakMinutes,
            notes: notes || null,
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-500" />
                        Edytuj zmianę
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Info o pracowniku i dacie */}
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                                {employee.first_name[0]}
                                {employee.last_name[0]}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">
                                    {employee.first_name} {employee.last_name}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {format(
                                        parseISO(shift.date),
                                        "EEEE, d MMMM yyyy",
                                        {
                                            locale: pl,
                                        }
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Wybór szablonu */}
                    {shiftTemplates.length > 0 && (
                        <div className="space-y-2">
                            <Label>Zastosuj szablon</Label>
                            <Select onValueChange={applyTemplate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz szablon..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {shiftTemplates.map((template) => (
                                        <SelectItem
                                            key={template.id}
                                            value={template.id}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            template.color,
                                                    }}
                                                />
                                                <span>{template.name}</span>
                                                <span className="text-slate-400 text-xs">
                                                    (
                                                    {template.start_time.slice(
                                                        0,
                                                        5
                                                    )}{" "}
                                                    -{" "}
                                                    {template.end_time.slice(
                                                        0,
                                                        5
                                                    )}
                                                    )
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Godziny */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Początek</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime">Koniec</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Przerwa */}
                    <div className="space-y-2">
                        <Label htmlFor="break">Przerwa (minuty)</Label>
                        <Input
                            id="break"
                            type="number"
                            min={0}
                            max={120}
                            value={breakMinutes}
                            onChange={(e) =>
                                setBreakMinutes(parseInt(e.target.value) || 0)
                            }
                        />
                    </div>

                    {/* Czas pracy */}
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-sm text-blue-600">Czas pracy</p>
                        <p className="text-xl font-semibold text-blue-700">
                            {calculateWorkHours()}
                        </p>
                    </div>

                    {/* Notatki */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notatki</Label>
                        <Textarea
                            id="notes"
                            placeholder="Opcjonalne notatki..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onDelete}
                        className="w-full sm:w-auto"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Usuń zmianę
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 sm:flex-none"
                        >
                            Anuluj
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            className="flex-1 sm:flex-none"
                        >
                            Zapisz zmiany
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
