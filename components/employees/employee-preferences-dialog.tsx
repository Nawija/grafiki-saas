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
import { Loader2, Settings2 } from "lucide-react";
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
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Preferencje pracownika
                    </DialogTitle>
                    <DialogDescription>
                        {employee.first_name} {employee.last_name}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Preferowane dni */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                Preferowane dni pracy
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Wybierz dni, w które pracownik preferuje
                                pracować
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={`pref-${day.value}`}
                                        type="button"
                                        onClick={() =>
                                            togglePreferredDay(day.value)
                                        }
                                        className={cn(
                                            "px-3 py-2 rounded-md text-sm font-medium transition-colors border",
                                            preferences.preferred_days.includes(
                                                day.value
                                            )
                                                ? "bg-green-500 text-white border-green-500"
                                                : "bg-background hover:bg-muted border-input"
                                        )}
                                        title={day.fullLabel}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Niedostępne dni */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                Dni niedostępności
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Wybierz dni, w które pracownik NIE może pracować
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={`unavail-${day.value}`}
                                        type="button"
                                        onClick={() =>
                                            toggleUnavailableDay(day.value)
                                        }
                                        className={cn(
                                            "px-3 py-2 rounded-md text-sm font-medium transition-colors border",
                                            preferences.unavailable_days.includes(
                                                day.value
                                            )
                                                ? "bg-red-500 text-white border-red-500"
                                                : "bg-background hover:bg-muted border-input"
                                        )}
                                        title={day.fullLabel}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preferowane godziny */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                Preferowane godziny pracy
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTime">Od</Label>
                                    <Input
                                        id="startTime"
                                        type="time"
                                        value={
                                            preferences.preferred_start_time ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                preferred_start_time:
                                                    e.target.value || null,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endTime">Do</Label>
                                    <Input
                                        id="endTime"
                                        type="time"
                                        value={
                                            preferences.preferred_end_time || ""
                                        }
                                        onChange={(e) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                preferred_end_time:
                                                    e.target.value || null,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Limity godzin */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                Limity godzin pracy
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="maxDaily">
                                        Maks. dziennie (h)
                                    </Label>
                                    <Input
                                        id="maxDaily"
                                        type="number"
                                        min="1"
                                        max="24"
                                        value={
                                            preferences.max_hours_per_day || ""
                                        }
                                        onChange={(e) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                max_hours_per_day: e.target
                                                    .value
                                                    ? parseInt(e.target.value)
                                                    : null,
                                            }))
                                        }
                                        placeholder="np. 8"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxWeekly">
                                        Maks. tygodniowo (h)
                                    </Label>
                                    <Input
                                        id="maxWeekly"
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={
                                            preferences.max_hours_per_week || ""
                                        }
                                        onChange={(e) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                max_hours_per_week: e.target
                                                    .value
                                                    ? parseInt(e.target.value)
                                                    : null,
                                            }))
                                        }
                                        placeholder="np. 40"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dostępność w weekendy i święta */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                Dostępność specjalna
                            </Label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={preferences.can_work_weekends}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                can_work_weekends:
                                                    checked === true,
                                            }))
                                        }
                                    />
                                    <span className="text-sm">
                                        Może pracować w weekendy
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={preferences.can_work_holidays}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                can_work_holidays:
                                                    checked === true,
                                            }))
                                        }
                                    />
                                    <span className="text-sm">
                                        Może pracować w święta
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Notatki */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Dodatkowe uwagi</Label>
                            <Textarea
                                id="notes"
                                value={preferences.notes || ""}
                                onChange={(e) =>
                                    setPreferences((prev) => ({
                                        ...prev,
                                        notes: e.target.value || null,
                                    }))
                                }
                                placeholder="np. Student - dostępny tylko po 15:00"
                                rows={3}
                            />
                        </div>

                        {/* Przyciski */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
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
