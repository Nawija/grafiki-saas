"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Plus,
    Copy,
    Pencil,
    Trash2,
    MoreVertical,
    Clock,
    Coffee,
    Sun,
    Moon,
    Sunset,
    Loader2,
    AlertCircle,
    Layers,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { ShiftTemplate, Team } from "@/types";
import {
    getShiftTemplatesByTeam,
    createShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
    duplicateShiftTemplate,
} from "@/lib/actions/shift-template";
import { getTeamsByOrganization } from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/client";

// Helper to get shift period label from times
function getShiftPeriodLabel(
    startTime: string,
    endTime: string
): { label: string; icon: React.ElementType; bgColor: string } {
    const [startH] = startTime.split(":").map(Number);

    if (startH >= 22 || startH < 6)
        return { label: "Nocna", icon: Moon, bgColor: "bg-slate-100" };
    if (startH >= 6 && startH < 12)
        return { label: "Ranna", icon: Sun, bgColor: "bg-amber-50" };
    if (startH >= 12 && startH < 18)
        return { label: "Popołudniowa", icon: Sunset, bgColor: "bg-orange-50" };
    return { label: "Wieczorna", icon: Moon, bgColor: "bg-purple-50" };
}

const colorOptions = [
    { value: "#22c55e", label: "Zielony" },
    { value: "#3b82f6", label: "Niebieski" },
    { value: "#f59e0b", label: "Pomarańczowy" },
    { value: "#8b5cf6", label: "Fioletowy" },
    { value: "#ec4899", label: "Różowy" },
    { value: "#06b6d4", label: "Turkusowy" },
    { value: "#ef4444", label: "Czerwony" },
    { value: "#64748b", label: "Szary" },
];

function calculateDuration(
    startTime: string,
    endTime: string,
    breakDuration: number
): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    return (endMinutes - startMinutes - breakDuration) / 60;
}

interface TemplateFormData {
    name: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    color: string;
    is_default: boolean;
    capacity: number;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] =
        useState<ShiftTemplate | null>(null);

    const form = useForm<TemplateFormData>({
        defaultValues: {
            name: "",
            start_time: "08:00",
            end_time: "16:00",
            break_duration: 30,
            color: "#3b82f6",
            is_default: false,
            capacity: 1,
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

    // Load templates when team changes
    const loadTemplates = useCallback(async () => {
        if (!currentTeamId) return;

        setIsLoading(true);
        const result = await getShiftTemplatesByTeam(currentTeamId);
        setIsLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setTemplates(result.data || []);
        }
    }, [currentTeamId]);

    useEffect(() => {
        if (currentTeamId) {
            loadTemplates();
        }
    }, [currentTeamId, loadTemplates]);

    // Handlers
    const handleOpenDialog = (template?: ShiftTemplate) => {
        if (template) {
            setEditingTemplate(template);
            form.reset({
                name: template.name,
                start_time: template.start_time,
                end_time: template.end_time,
                break_duration: template.break_duration,
                color: template.color,
                is_default: template.is_default,
                capacity: template.capacity || 1,
            });
        } else {
            setEditingTemplate(null);
            form.reset({
                name: "",
                start_time: "08:00",
                end_time: "16:00",
                break_duration: 30,
                color: "#3b82f6",
                is_default: false,
                capacity: 1,
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async (data: TemplateFormData) => {
        if (!currentTeamId) return;

        setIsSaving(true);
        setError(null);

        try {
            if (editingTemplate) {
                const result = await updateShiftTemplate(
                    editingTemplate.id,
                    data
                );
                if (result.error) {
                    setError(result.error);
                    return;
                }
            } else {
                const result = await createShiftTemplate({
                    team_id: currentTeamId,
                    ...data,
                });
                if (result.error) {
                    setError(result.error);
                    return;
                }
            }

            await loadTemplates();
            setDialogOpen(false);
        } catch {
            setError("Wystąpił błąd podczas zapisywania");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDuplicate = async (id: string) => {
        const result = await duplicateShiftTemplate(id);
        if (result.error) {
            setError(result.error);
        } else {
            await loadTemplates();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć ten szablon?")) return;

        const result = await deleteShiftTemplate(id);
        if (result.error) {
            setError(result.error);
        } else {
            await loadTemplates();
        }
    };

    // Loading state
    if (isLoading && templates.length === 0) {
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
                <Layers className="h-16 w-16 text-muted-foreground" />
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
                        Szablony zmian
                    </h1>
                    <p className="text-muted-foreground">
                        Twórz i zarządzaj szablonami zmian dla szybszego
                        planowania.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nowy szablon
                </Button>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

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

            {/* Templates grid */}
            {templates.length === 0 ? (
                <Card className="p-8">
                    <div className="text-center">
                        <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">
                            Brak szablonów
                        </h3>
                        <p className="mt-2 text-muted-foreground">
                            Utwórz pierwszy szablon zmiany, aby przyspieszyć
                            planowanie grafiku.
                        </p>
                        <Button
                            onClick={() => handleOpenDialog()}
                            className="mt-4"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nowy szablon
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                        const periodConfig = getShiftPeriodLabel(
                            template.start_time,
                            template.end_time
                        );
                        const Icon = periodConfig.icon;
                        const duration = calculateDuration(
                            template.start_time,
                            template.end_time,
                            template.break_duration
                        );

                        return (
                            <Card
                                key={template.id}
                                className={cn(
                                    "relative overflow-hidden",
                                    periodConfig.bgColor
                                )}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: template.color }}
                                />
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <CardTitle className="text-base">
                                                    {template.name}
                                                </CardTitle>
                                                <CardDescription>
                                                    {periodConfig.label}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleOpenDialog(
                                                            template
                                                        )
                                                    }
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edytuj
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleDuplicate(
                                                            template.id
                                                        )
                                                    }
                                                >
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Duplikuj
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleDelete(
                                                            template.id
                                                        )
                                                    }
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Usuń
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {template.start_time} —{" "}
                                                {template.end_time}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Coffee className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {template.break_duration} min
                                                przerwy
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Layers className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                min. {template.capacity || 1}{" "}
                                                {(template.capacity || 1) === 1
                                                    ? "osoba"
                                                    : (template.capacity || 1) <
                                                      5
                                                    ? "osoby"
                                                    : "osób"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Badge variant="secondary">
                                                {duration.toFixed(1)}h netto
                                            </Badge>
                                            {template.is_default && (
                                                <Badge variant="outline">
                                                    Domyślny
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Template Form Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate
                                ? "Edytuj szablon"
                                : "Nowy szablon"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? "Zmień ustawienia szablonu zmiany."
                                : "Utwórz nowy szablon zmiany do szybkiego planowania."}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSave)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                rules={{ required: "Nazwa jest wymagana" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nazwa szablonu</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="np. Rano 6-14"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start_time"
                                    rules={{ required: "Wymagane" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Początek</FormLabel>
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
                                            <FormLabel>Koniec</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="break_duration"
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
                                        <FormDescription>
                                            Zgodnie z kodeksem pracy: 15 min
                                            przy 6h, 30 min przy 9h+
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="capacity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Minimum osób na zmianie
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={10}
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Minimalna liczba osób wymagana na
                                            tej zmianie. Możesz dodać więcej
                                            ręcznie.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kolor</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {colorOptions.map((color) => (
                                                    <SelectItem
                                                        key={color.value}
                                                        value={color.value}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-4 w-4 rounded-full"
                                                                style={{
                                                                    backgroundColor:
                                                                        color.value,
                                                                }}
                                                            />
                                                            {color.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isSaving}
                                >
                                    Anuluj
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Zapisywanie...
                                        </>
                                    ) : editingTemplate ? (
                                        "Zapisz zmiany"
                                    ) : (
                                        "Utwórz szablon"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
