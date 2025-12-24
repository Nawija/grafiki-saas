"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Building2,
    Clock,
    Calendar,
    Bell,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle,
    Settings2,
} from "lucide-react";
import type { Team, TeamSettings } from "@/types";
import {
    getTeamsByOrganization,
    updateTeam,
    getTeam,
} from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/client";

interface SettingsFormData {
    name: string;
    description: string;
    default_shift_duration: number;
    min_shift_duration: number;
    max_shift_duration: number;
    break_duration: number;
    week_starts_on: "0" | "1";
    respect_polish_trading_sundays: boolean;
    auto_calculate_breaks: boolean;
    overtime_threshold_daily: number;
    overtime_threshold_weekly: number;
}

interface OpeningHoursDay {
    start: string;
    end: string;
    enabled: boolean;
}

const DAY_NAMES = [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
];

const DEFAULT_OPENING_HOURS: Record<number, OpeningHoursDay> = {
    0: { start: "10:00", end: "18:00", enabled: false }, // Sunday
    1: { start: "08:00", end: "20:00", enabled: true },
    2: { start: "08:00", end: "20:00", enabled: true },
    3: { start: "08:00", end: "20:00", enabled: true },
    4: { start: "08:00", end: "20:00", enabled: true },
    5: { start: "08:00", end: "20:00", enabled: true },
    6: { start: "09:00", end: "17:00", enabled: true }, // Saturday
};

export default function SettingsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [openingHours, setOpeningHours] = useState<
        Record<number, OpeningHoursDay>
    >({ ...DEFAULT_OPENING_HOURS });

    const form = useForm<SettingsFormData>({
        defaultValues: {
            name: "",
            description: "",
            default_shift_duration: 480,
            min_shift_duration: 240,
            max_shift_duration: 720,
            break_duration: 30,
            week_starts_on: "1",
            respect_polish_trading_sundays: true,
            auto_calculate_breaks: true,
            overtime_threshold_daily: 8,
            overtime_threshold_weekly: 40,
        },
    });

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setError("Nie jesteś zalogowany");
                    return;
                }

                const { data: membership } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .single();

                if (!membership) {
                    setError("Nie należysz do żadnej organizacji");
                    return;
                }

                const teamsResult = await getTeamsByOrganization(
                    membership.organization_id
                );
                if (teamsResult.error) {
                    setError(teamsResult.error);
                    return;
                }

                setTeams(teamsResult.data || []);

                if (teamsResult.data && teamsResult.data.length > 0) {
                    setCurrentTeamId(teamsResult.data[0].id);
                }
            } catch {
                setError("Wystąpił błąd podczas ładowania danych");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Load team data when team changes
    useEffect(() => {
        const loadTeam = async () => {
            if (!currentTeamId) return;

            setIsLoading(true);
            const result = await getTeam(currentTeamId);
            setIsLoading(false);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data) {
                setCurrentTeam(result.data);
                const settings = result.data.settings as TeamSettings;

                // Convert opening_hours to local state format
                // UWAGA: JSON z bazy danych może mieć klucze jako stringi!
                const newOpeningHours: Record<number, OpeningHoursDay> = {};
                for (let i = 0; i <= 6; i++) {
                    // Próbuj zarówno numeric jak i string key (JSON z bazy używa stringów)
                    const hoursAny = settings.opening_hours as
                        | Record<
                              string | number,
                              { start: string; end: string } | null
                          >
                        | undefined;
                    const hours = hoursAny?.[i] ?? hoursAny?.[String(i)];
                    newOpeningHours[i] = hours
                        ? { start: hours.start, end: hours.end, enabled: true }
                        : { ...DEFAULT_OPENING_HOURS[i], enabled: false };
                }
                setOpeningHours(newOpeningHours);

                form.reset({
                    name: result.data.name,
                    description: result.data.description || "",
                    default_shift_duration: settings.default_shift_duration,
                    min_shift_duration: settings.min_shift_duration,
                    max_shift_duration: settings.max_shift_duration,
                    break_duration: settings.break_duration,
                    week_starts_on: settings.week_starts_on === 0 ? "0" : "1",
                    respect_polish_trading_sundays:
                        settings.respect_polish_trading_sundays,
                    auto_calculate_breaks: settings.auto_calculate_breaks,
                    overtime_threshold_daily: settings.overtime_threshold_daily,
                    overtime_threshold_weekly:
                        settings.overtime_threshold_weekly,
                });
            }
        };

        loadTeam();
    }, [currentTeamId, form]);

    const handleSave = async (data: SettingsFormData) => {
        if (!currentTeamId || !currentTeam) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Convert local state opening_hours to settings format
            const openingHoursSettings: {
                [key: number]: { start: string; end: string } | null;
            } = {};
            for (let i = 0; i <= 6; i++) {
                const hours = openingHours[i];
                openingHoursSettings[i] = hours.enabled
                    ? { start: hours.start, end: hours.end }
                    : null;
            }

            // Calculate working_days from enabled opening hours
            const workingDays = Object.entries(openingHours)
                .filter(([, h]) => h.enabled)
                .map(([day]) => parseInt(day));

            const updatedSettings: TeamSettings = {
                ...currentTeam.settings,
                default_shift_duration: data.default_shift_duration,
                min_shift_duration: data.min_shift_duration,
                max_shift_duration: data.max_shift_duration,
                break_duration: data.break_duration,
                week_starts_on: data.week_starts_on === "0" ? 0 : 1,
                working_days: workingDays,
                opening_hours: openingHoursSettings,
                respect_polish_trading_sundays:
                    data.respect_polish_trading_sundays,
                auto_calculate_breaks: data.auto_calculate_breaks,
                overtime_threshold_daily: data.overtime_threshold_daily,
                overtime_threshold_weekly: data.overtime_threshold_weekly,
            };

            const result = await updateTeam(currentTeamId, {
                name: data.name,
                description: data.description || undefined,
                settings: updatedSettings,
            });

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess("Ustawienia zostały zapisane");
                // Update local state
                setCurrentTeam({
                    ...currentTeam,
                    name: data.name,
                    description: data.description,
                    settings: updatedSettings,
                });
            }
        } catch {
            setError("Wystąpił błąd podczas zapisywania");
        } finally {
            setIsSaving(false);
        }
    };

    // Loading state
    if (isLoading && !currentTeam) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Ładowanie...</p>
                </div>
            </div>
        );
    }

    // No teams state
    if (!currentTeamId && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Settings2 className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Brak zespołów</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Nie masz jeszcze żadnego zespołu. Przejdź przez onboarding,
                    aby utworzyć pierwszy zespół.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Ustawienia
                    </h1>
                    <p className="text-muted-foreground">
                        Konfiguruj zespół, zmiany i powiadomienia.
                    </p>
                </div>

                {/* Team selector */}
                {teams.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Zespół:
                        </span>
                        <Select
                            value={currentTeamId || ""}
                            onValueChange={setCurrentTeamId}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Success */}
            {success && (
                <Alert className="border-green-500 bg-green-50 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">
                        <Building2 className="mr-2 h-4 w-4" />
                        Ogólne
                    </TabsTrigger>
                    <TabsTrigger value="shifts">
                        <Clock className="mr-2 h-4 w-4" />
                        Zmiany
                    </TabsTrigger>
                    <TabsTrigger value="schedule">
                        <Calendar className="mr-2 h-4 w-4" />
                        Grafik
                    </TabsTrigger>
                </TabsList>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)}>
                        {/* General settings */}
                        <TabsContent value="general" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informacje o zespole</CardTitle>
                                    <CardDescription>
                                        Podstawowe informacje o zespole.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        rules={{
                                            required: "Nazwa jest wymagana",
                                        }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Nazwa zespołu
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Opis</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Opis zespołu (opcjonalny)"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Shift settings */}
                        <TabsContent value="shifts" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Domyślne ustawienia zmian
                                    </CardTitle>
                                    <CardDescription>
                                        Parametry używane przy tworzeniu nowych
                                        zmian.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <FormField
                                            control={form.control}
                                            name="default_shift_duration"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Domyślny czas zmiany
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(v) =>
                                                            field.onChange(
                                                                Number(v)
                                                            )
                                                        }
                                                        value={String(
                                                            field.value
                                                        )}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="240">
                                                                4 godziny
                                                            </SelectItem>
                                                            <SelectItem value="360">
                                                                6 godzin
                                                            </SelectItem>
                                                            <SelectItem value="480">
                                                                8 godzin
                                                            </SelectItem>
                                                            <SelectItem value="600">
                                                                10 godzin
                                                            </SelectItem>
                                                            <SelectItem value="720">
                                                                12 godzin
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="min_shift_duration"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Min. czas zmiany
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(v) =>
                                                            field.onChange(
                                                                Number(v)
                                                            )
                                                        }
                                                        value={String(
                                                            field.value
                                                        )}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="120">
                                                                2 godziny
                                                            </SelectItem>
                                                            <SelectItem value="180">
                                                                3 godziny
                                                            </SelectItem>
                                                            <SelectItem value="240">
                                                                4 godziny
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="max_shift_duration"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Max. czas zmiany
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(v) =>
                                                            field.onChange(
                                                                Number(v)
                                                            )
                                                        }
                                                        value={String(
                                                            field.value
                                                        )}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="480">
                                                                8 godzin
                                                            </SelectItem>
                                                            <SelectItem value="600">
                                                                10 godzin
                                                            </SelectItem>
                                                            <SelectItem value="720">
                                                                12 godzin
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="break_duration"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Domyślna przerwa
                                                        (minuty)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={120}
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Zgodnie z kodeksem: 15
                                                        min przy 6h, 30 min przy
                                                        9h+
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="auto_calculate_breaks"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            Automatyczne przerwy
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Obliczaj przerwy
                                                            według kodeksu pracy
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="overtime_threshold_daily"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Próg nadgodzin dziennie
                                                        (h)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={6}
                                                            max={12}
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Po ilu godzinach
                                                        dziennie liczyć
                                                        nadgodziny
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="overtime_threshold_weekly"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Próg nadgodzin
                                                        tygodniowo (h)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={30}
                                                            max={60}
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Po ilu godzinach
                                                        tygodniowo liczyć
                                                        nadgodziny
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Schedule settings */}
                        <TabsContent
                            value="schedule"
                            className="space-y-6 mt-6"
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Godziny otwarcia sklepu
                                    </CardTitle>
                                    <CardDescription>
                                        Określ w jakie dni i w jakich godzinach
                                        sklep jest otwarty. Te ustawienia będą
                                        używane przy generowaniu grafiku.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                                        <div
                                            key={day}
                                            className="flex items-center gap-4 p-3 rounded-lg border"
                                        >
                                            <div className="w-32 flex items-center gap-2">
                                                <Switch
                                                    checked={
                                                        openingHours[day]
                                                            ?.enabled ?? false
                                                    }
                                                    onCheckedChange={(
                                                        checked
                                                    ) => {
                                                        setOpeningHours(
                                                            (prev) => ({
                                                                ...prev,
                                                                [day]: {
                                                                    ...prev[
                                                                        day
                                                                    ],
                                                                    enabled:
                                                                        checked,
                                                                },
                                                            })
                                                        );
                                                    }}
                                                />
                                                <span className="font-medium">
                                                    {DAY_NAMES[day]}
                                                </span>
                                            </div>

                                            {openingHours[day]?.enabled && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Input
                                                        type="time"
                                                        value={
                                                            openingHours[day]
                                                                ?.start ??
                                                            "08:00"
                                                        }
                                                        onChange={(e) => {
                                                            setOpeningHours(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [day]: {
                                                                        ...prev[
                                                                            day
                                                                        ],
                                                                        start: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                })
                                                            );
                                                        }}
                                                        className="w-32"
                                                    />
                                                    <span className="text-muted-foreground">
                                                        do
                                                    </span>
                                                    <Input
                                                        type="time"
                                                        value={
                                                            openingHours[day]
                                                                ?.end ?? "20:00"
                                                        }
                                                        onChange={(e) => {
                                                            setOpeningHours(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [day]: {
                                                                        ...prev[
                                                                            day
                                                                        ],
                                                                        end: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                })
                                                            );
                                                        }}
                                                        className="w-32"
                                                    />
                                                </div>
                                            )}

                                            {!openingHours[day]?.enabled && (
                                                <span className="text-muted-foreground text-sm">
                                                    Zamknięte
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Ustawienia grafiku</CardTitle>
                                    <CardDescription>
                                        Konfiguracja kalendarza i dni roboczych.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="week_starts_on"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Tydzień zaczyna się w
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1">
                                                            Poniedziałek
                                                        </SelectItem>
                                                        <SelectItem value="0">
                                                            Niedziela
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Separator />

                                    <FormField
                                        control={form.control}
                                        name="respect_polish_trading_sundays"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        Niedziele handlowe
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Uwzględniaj polskie
                                                        niedziele handlowe w
                                                        grafiku. Niedziele
                                                        niehandlowe będą
                                                        wyłączone z planowania.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={
                                                            field.onChange
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Save button */}
                        <div className="flex justify-end mt-6">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Zapisywanie...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Zapisz ustawienia
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </Tabs>
        </div>
    );
}
