"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Calendar, Clock, Gauge, CalendarCheck, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmployeePreferencesDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Preferences {
    preferred_days: number[];
    unavailable_days: number[];
    preferred_start_time: string | null;
    preferred_end_time: string | null;
    max_hours_per_day: number | null;
    max_hours_per_week: number | null;
    can_work_weekends: boolean;
    can_work_holidays: boolean;
    notes: string | null;
}

const DAYS_OF_WEEK = [
    { value: 1, label: "Pon", fullLabel: "Poniedziałek" },
    { value: 2, label: "Wt", fullLabel: "Wtorek" },
    { value: 3, label: "Śr", fullLabel: "Środa" },
    { value: 4, label: "Czw", fullLabel: "Czwartek" },
    { value: 5, label: "Pt", fullLabel: "Piątek" },
    { value: 6, label: "Sob", fullLabel: "Sobota" },
    { value: 0, label: "Nd", fullLabel: "Niedziela" },
];

export function EmployeePreferencesDialog({
    employee,
    open,
    onOpenChange,
}: EmployeePreferencesDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [existingId, setExistingId] = useState<string | null>(null);

    const [preferences, setPreferences] = useState<Preferences>({
        preferred_days: [],
        unavailable_days: [],
        preferred_start_time: null,
        preferred_end_time: null,
        max_hours_per_day: null,
        max_hours_per_week: null,
        can_work_weekends: true,
        can_work_holidays: true,
        notes: null,
    });

    useEffect(() => {
        if (open && employee.id) {
            loadPreferences();
        }
    }, [open, employee.id]);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("employee_preferences")
                .select("*")
                .eq("employee_id", employee.id)
                .single();

            if (error && error.code !== "PGRST116") {
                throw error;
            }

            if (data) {
                setExistingId(data.id);
                setPreferences({
                    preferred_days: data.preferred_days || [],
                    unavailable_days: data.unavailable_days || [],
                    preferred_start_time: data.preferred_start_time,
                    preferred_end_time: data.preferred_end_time,
                    max_hours_per_day: data.max_hours_per_day,
                    max_hours_per_week: data.max_hours_per_week,
                    can_work_weekends: data.can_work_weekends ?? true,
                    can_work_holidays: data.can_work_holidays ?? true,
                    notes: data.notes,
                });
            }
        } catch (error: any) {
            console.error("Error loading preferences:", error);
            toast.error("Błąd podczas wczytywania preferencji");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const supabase = createClient();

            const preferencesData = {
                employee_id: employee.id,
                preferred_days: preferences.preferred_days,
                unavailable_days: preferences.unavailable_days,
                preferred_start_time: preferences.preferred_start_time || null,
                preferred_end_time: preferences.preferred_end_time || null,
                max_hours_per_day: preferences.max_hours_per_day,
                max_hours_per_week: preferences.max_hours_per_week,
                can_work_weekends: preferences.can_work_weekends,
                can_work_holidays: preferences.can_work_holidays,
                notes: preferences.notes || null,
                updated_at: new Date().toISOString(),
            };

            if (existingId) {
                const { error } = await supabase
                    .from("employee_preferences")
                    .update(preferencesData)
                    .eq("id", existingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("employee_preferences")
                    .insert(preferencesData);

                if (error) throw error;
            }

            toast.success("Preferencje zostały zapisane");
            onOpenChange(false);
            router.refresh();
        } catch (error: any) {
            const errorMessage = error?.message || JSON.stringify(error);
            console.error("Error saving preferences:", errorMessage);
            toast.error(`Błąd podczas zapisywania: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const togglePreferredDay = (day: number) => {
        setPreferences((prev) => ({
            ...prev,
            preferred_days: prev.preferred_days.includes(day)
                ? prev.preferred_days.filter((d) => d !== day)
                : [...prev.preferred_days, day],
            // Usuń z niedostępnych jeśli dodajemy do preferowanych
            unavailable_days: prev.unavailable_days.filter((d) => d !== day),
        }));
    };

    const toggleUnavailableDay = (day: number) => {
        setPreferences((prev) => ({
            ...prev,
            unavailable_days: prev.unavailable_days.includes(day)
                ? prev.unavailable_days.filter((d) => d !== day)
                : [...prev.unavailable_days, day],
            // Usuń z preferowanych jeśli dodajemy do niedostępnych
            preferred_days: prev.preferred_days.filter((d) => d !== day),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: employee.color || '#3b82f6' }}
                        >
                            {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                        <div>
                            <DialogTitle className="text-lg">
                                Preferencje pracownika
                            </DialogTitle>
                            <DialogDescription className="mt-0.5">
                                {employee.first_name} {employee.last_name}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-5 pt-2">
                        {/* Preferowane dni */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-md bg-green-500/10">
                                    <Check className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm">Preferowane dni</h4>
                                    <p className="text-xs text-muted-foreground">Dni, w które pracownik chce pracować</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = preferences.preferred_days.includes(day.value);
                                    return (
                                        <button
                                            key={`pref-${day.value}`}
                                            type="button"
                                            onClick={() => togglePreferredDay(day.value)}
                                            className={cn(
                                                "w-11 h-11 rounded-lg text-sm font-medium transition-all border-2",
                                                isSelected
                                                    ? "bg-green-500 text-white border-green-500 shadow-sm"
                                                    : "bg-background hover:bg-green-50 hover:border-green-200 border-transparent"
                                            )}
                                            title={day.fullLabel}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Niedostępne dni */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-md bg-red-500/10">
                                    <X className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm">Dni niedostępności</h4>
                                    <p className="text-xs text-muted-foreground">Dni, w które pracownik NIE może pracować</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = preferences.unavailable_days.includes(day.value);
                                    return (
                                        <button
                                            key={`unavail-${day.value}`}
                                            type="button"
                                            onClick={() => toggleUnavailableDay(day.value)}
                                            className={cn(
                                                "w-11 h-11 rounded-lg text-sm font-medium transition-all border-2",
                                                isSelected
                                                    ? "bg-red-500 text-white border-red-500 shadow-sm"
                                                    : "bg-background hover:bg-red-50 hover:border-red-200 border-transparent"
                                            )}
                                            title={day.fullLabel}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Preferowane godziny i limity w grid */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Preferowane godziny */}
                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-md bg-blue-500/10">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <h4 className="font-medium text-sm">Preferowane godziny</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="startTime" className="text-xs text-muted-foreground">Od</Label>
                                        <Input
                                            id="startTime"
                                            type="time"
                                            className="h-9"
                                            value={preferences.preferred_start_time || ""}
                                            onChange={(e) =>
                                                setPreferences((prev) => ({
                                                    ...prev,
                                                    preferred_start_time: e.target.value || null,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="endTime" className="text-xs text-muted-foreground">Do</Label>
                                        <Input
                                            id="endTime"
                                            type="time"
                                            className="h-9"
                                            value={preferences.preferred_end_time || ""}
                                            onChange={(e) =>
                                                setPreferences((prev) => ({
                                                    ...prev,
                                                    preferred_end_time: e.target.value || null,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Limity godzin */}
                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-md bg-orange-500/10">
                                        <Gauge className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <h4 className="font-medium text-sm">Limity godzin</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="maxDaily" className="text-xs text-muted-foreground">Dziennie (h)</Label>
                                        <Input
                                            id="maxDaily"
                                            type="number"
                                            min="1"
                                            max="24"
                                            className="h-9"
                                            value={preferences.max_hours_per_day || ""}
                                            onChange={(e) =>
                                                setPreferences((prev) => ({
                                                    ...prev,
                                                    max_hours_per_day: e.target.value ? parseInt(e.target.value) : null,
                                                }))
                                            }
                                            placeholder="8"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="maxWeekly" className="text-xs text-muted-foreground">Tygodniowo (h)</Label>
                                        <Input
                                            id="maxWeekly"
                                            type="number"
                                            min="1"
                                            max="168"
                                            className="h-9"
                                            value={preferences.max_hours_per_week || ""}
                                            onChange={(e) =>
                                                setPreferences((prev) => ({
                                                    ...prev,
                                                    max_hours_per_week: e.target.value ? parseInt(e.target.value) : null,
                                                }))
                                            }
                                            placeholder="40"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dostępność specjalna */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-md bg-purple-500/10">
                                    <CalendarCheck className="h-4 w-4 text-purple-600" />
                                </div>
                                <h4 className="font-medium text-sm">Dostępność specjalna</h4>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <Checkbox
                                        checked={preferences.can_work_weekends}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                can_work_weekends: checked === true,
                                            }))
                                        }
                                    />
                                    <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                                        Może pracować w weekendy
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <Checkbox
                                        checked={preferences.can_work_holidays}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                can_work_holidays: checked === true,
                                            }))
                                        }
                                    />
                                    <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                                        Może pracować w święta
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Notatki */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-md bg-slate-500/10">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                </div>
                                <h4 className="font-medium text-sm">Dodatkowe uwagi</h4>
                            </div>
                            <Textarea
                                id="notes"
                                value={preferences.notes || ""}
                                onChange={(e) =>
                                    setPreferences((prev) => ({
                                        ...prev,
                                        notes: e.target.value || null,
                                    }))
                                }
                                placeholder="np. Student - dostępny tylko po 15:00, preferencje weekendów zmiennych..."
                                rows={2}
                                className="resize-none"
                            />
                        </div>

                        {/* Przyciski */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving}
                            >
                                Anuluj
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Zapisz preferencje
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
