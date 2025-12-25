"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    format,
    getDay,
    startOfYear,
    endOfYear,
    eachDayOfInterval,
    addMonths,
} from "date-fns";
import { pl } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { OrganizationSettings } from "@/types/database";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar, ShoppingBag, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationSettingsProps {
    organizationId: string;
    settings: OrganizationSettings | null;
}

// Polska lista niedziel handlowych na 2025 rok (przykładowe)
const POLISH_TRADING_SUNDAYS_2025 = [
    "2025-01-26",
    "2025-04-13",
    "2025-04-27",
    "2025-06-29",
    "2025-08-31",
    "2025-12-14",
    "2025-12-21",
];

export function OrganizationSettingsComponent({
    organizationId,
    settings: initialSettings,
}: OrganizationSettingsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mode, setMode] = useState<"all" | "none" | "custom">(
        initialSettings?.trading_sundays_mode || "none"
    );
    const [customSundays, setCustomSundays] = useState<string[]>(
        initialSettings?.custom_trading_sundays || POLISH_TRADING_SUNDAYS_2025
    );
    const [defaultShiftDuration, setDefaultShiftDuration] = useState(
        initialSettings?.default_shift_duration || 8
    );
    const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(
        initialSettings?.default_break_minutes || 30
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Pobierz wszystkie niedziele w wybranym roku
    const getSundaysInYear = (year: number) => {
        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));
        const days = eachDayOfInterval({ start, end });
        return days
            .filter((d) => getDay(d) === 0)
            .map((d) => format(d, "yyyy-MM-dd"));
    };

    const sundaysInYear = getSundaysInYear(selectedYear);

    const toggleSunday = (date: string) => {
        setCustomSundays((prev) =>
            prev.includes(date)
                ? prev.filter((d) => d !== date)
                : [...prev, date]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const supabase = createClient();

            const settingsData = {
                organization_id: organizationId,
                trading_sundays_mode: mode,
                custom_trading_sundays:
                    mode === "custom" ? customSundays : null,
                default_shift_duration: defaultShiftDuration,
                default_break_minutes: defaultBreakMinutes,
                updated_at: new Date().toISOString(),
            };

            if (initialSettings) {
                const { error } = await supabase
                    .from("organization_settings")
                    .update(settingsData)
                    .eq("organization_id", organizationId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("organization_settings")
                    .insert(settingsData);

                if (error) throw error;
            }

            router.refresh();
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const selectPolishSundays = () => {
        // Wybierz tylko niedziele z obecnej listy polskich niedziel handlowych
        const year = selectedYear.toString();
        const polishForYear = POLISH_TRADING_SUNDAYS_2025.filter((d) =>
            d.startsWith(year)
        );
        setCustomSundays(polishForYear);
    };

    const groupSundaysByMonth = () => {
        const grouped: { [key: string]: string[] } = {};
        sundaysInYear.forEach((date) => {
            const monthKey = format(new Date(date), "yyyy-MM");
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(date);
        });
        return grouped;
    };

    const sundaysByMonth = groupSundaysByMonth();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        <CardTitle>Niedziele handlowe</CardTitle>
                    </div>
                    <CardDescription>
                        Ustawienia dotyczące niedziel pracujących w Twojej
                        organizacji
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">
                                    Niedziele handlowe w Polsce
                                </p>
                                <p>
                                    Zgodnie z ustawą z dnia 10 stycznia 2018 r.
                                    o ograniczeniu handlu w niedziele, w 2025
                                    roku handel jest dozwolony tylko w wybrane
                                    niedziele. Możesz ustawić własne niedziele
                                    handlowe dla swojej organizacji.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tryb niedziel handlowych</Label>
                        <Select
                            value={mode}
                            onValueChange={(v) =>
                                setMode(v as "all" | "none" | "custom")
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <span>🟢</span>
                                        <span>
                                            Wszystkie niedziele handlowe
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="none">
                                    <div className="flex items-center gap-2">
                                        <span>🔴</span>
                                        <span>Brak niedziel handlowych</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="custom">
                                    <div className="flex items-center gap-2">
                                        <span>🟡</span>
                                        <span>Wybrane niedziele handlowe</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {mode === "custom" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label>Rok</Label>
                                    <Select
                                        value={selectedYear.toString()}
                                        onValueChange={(v) =>
                                            setSelectedYear(parseInt(v))
                                        }
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2024, 2025, 2026].map((year) => (
                                                <SelectItem
                                                    key={year}
                                                    value={year.toString()}
                                                >
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={selectPolishSundays}
                                    >
                                        Ustaw polskie niedziele handlowe
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCustomSundays(sundaysInYear)
                                        }
                                    >
                                        Zaznacz wszystkie
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCustomSundays([])}
                                    >
                                        Odznacz wszystkie
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(sundaysByMonth).map(
                                        ([monthKey, sundays]) => (
                                            <div
                                                key={monthKey}
                                                className="space-y-2"
                                            >
                                                <h4 className="font-medium text-sm text-muted-foreground capitalize">
                                                    {format(
                                                        new Date(
                                                            monthKey + "-01"
                                                        ),
                                                        "LLLL yyyy",
                                                        { locale: pl }
                                                    )}
                                                </h4>
                                                <div className="space-y-1">
                                                    {sundays.map((date) => (
                                                        <label
                                                            key={date}
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                                                                customSundays.includes(
                                                                    date
                                                                )
                                                                    ? "bg-green-100 dark:bg-green-950/50"
                                                                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                                            )}
                                                        >
                                                            <Checkbox
                                                                checked={customSundays.includes(
                                                                    date
                                                                )}
                                                                onCheckedChange={() =>
                                                                    toggleSunday(
                                                                        date
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-sm">
                                                                {format(
                                                                    new Date(
                                                                        date
                                                                    ),
                                                                    "d MMMM",
                                                                    {
                                                                        locale: pl,
                                                                    }
                                                                )}
                                                            </span>
                                                            {customSundays.includes(
                                                                date
                                                            ) && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="ml-auto text-xs"
                                                                >
                                                                    Handlowa
                                                                </Badge>
                                                            )}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    Wybrano{" "}
                                    {
                                        customSundays.filter((d) =>
                                            d.startsWith(
                                                selectedYear.toString()
                                            )
                                        ).length
                                    }{" "}
                                    z {sundaysInYear.length} niedziel
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Domyślne ustawienia zmian</CardTitle>
                    <CardDescription>
                        Ustawienia stosowane przy tworzeniu nowych zmian
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="defaultShiftDuration">
                                Domyślna długość zmiany (godziny)
                            </Label>
                            <Input
                                id="defaultShiftDuration"
                                type="number"
                                min="1"
                                max="24"
                                value={defaultShiftDuration}
                                onChange={(e) =>
                                    setDefaultShiftDuration(
                                        parseInt(e.target.value) || 8
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="defaultBreakMinutes">
                                Domyślna przerwa (minuty)
                            </Label>
                            <Input
                                id="defaultBreakMinutes"
                                type="number"
                                min="0"
                                max="120"
                                value={defaultBreakMinutes}
                                onChange={(e) =>
                                    setDefaultBreakMinutes(
                                        parseInt(e.target.value) || 30
                                    )
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Zapisz ustawienia
                </Button>
            </div>
        </div>
    );
}
