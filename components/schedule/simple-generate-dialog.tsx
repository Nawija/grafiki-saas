"use client";

import { useState, useEffect } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    addMonths,
    getMonth,
    getYear,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Wand2,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Calendar,
    Users,
    Clock,
} from "lucide-react";
import {
    generateMonthlySchedule,
    GeneratorResult,
    GeneratedShift,
} from "@/lib/schedule-generator";
import type { Employee, ShiftTemplate, TeamSettings, Absence } from "@/types";
import { getAbsencesByTeam } from "@/lib/actions/absence";

interface SimpleGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    templates: ShiftTemplate[];
    teamId: string;
    settings: TeamSettings;
    onGenerate: (shifts: GeneratedShift[]) => void;
}

export function SimpleGenerateDialog({
    open,
    onOpenChange,
    employees,
    templates,
    teamId,
    settings,
    onGenerate,
}: SimpleGenerateDialogProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<GeneratorResult | null>(null);
    const [step, setStep] = useState<"config" | "preview">("config");
    const [absences, setAbsences] = useState<Absence[]>([]);

    // Wybór miesiąca - domyślnie następny miesiąc
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    const [selectedMonth, setSelectedMonth] = useState(getMonth(nextMonth) + 1);
    const [selectedYear, setSelectedYear] = useState(getYear(nextMonth));

    // Wybór pracowników
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
        employees.filter((e) => e.is_active).map((e) => e.id)
    );

    // Załaduj nieobecności
    useEffect(() => {
        const loadAbsences = async () => {
            if (!teamId || !open) return;

            const monthStart = format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "yyyy-MM-dd"
            );
            const monthEnd = format(
                endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)),
                "yyyy-MM-dd"
            );

            const result = await getAbsencesByTeam(teamId, {
                startDate: monthStart,
                endDate: monthEnd,
                status: "approved",
            });

            if (result.data) {
                setAbsences(result.data);
            }
        };

        loadAbsences();
    }, [teamId, open, selectedMonth, selectedYear]);

    // Generowanie grafiku
    const handleGenerate = async () => {
        setIsGenerating(true);

        try {
            // Filtruj wybranych pracowników
            const employeesToSchedule = employees.filter((e) =>
                selectedEmployees.includes(e.id)
            );

            console.log("🚀 Rozpoczynam generowanie grafiku", {
                month: selectedMonth,
                year: selectedYear,
                employees: employeesToSchedule.length,
                absences: absences.length,
                templates: templates.length,
            });

            // Generuj grafik
            const generationResult = generateMonthlySchedule(
                {
                    teamId,
                    month: selectedMonth,
                    year: selectedYear,
                    settings,
                },
                employeesToSchedule,
                absences,
                templates
            );

            console.log("✅ Wynik generowania:", generationResult);

            setResult(generationResult);
            setStep("preview");
        } catch (error) {
            console.error("❌ Błąd generowania grafiku:", error);
            // Pokaż ostrzeżenie nawet jeśli wystąpił błąd
            setResult({
                success: false,
                shifts: [],
                warnings: [
                    `Błąd generowania: ${
                        error instanceof Error ? error.message : "Nieznany błąd"
                    }`,
                ],
                statistics: {
                    totalShifts: 0,
                    hoursPerEmployee: {},
                    targetHoursPerEmployee: {},
                },
            });
            setStep("preview");
        } finally {
            setIsGenerating(false);
        }
    };

    // Zapisz grafik
    const handleConfirm = () => {
        if (result?.shifts) {
            onGenerate(result.shifts);
        }
        handleClose();
    };

    // Zamknij dialog
    const handleClose = () => {
        setStep("config");
        setResult(null);
        onOpenChange(false);
    };

    // Przełącz pracownika
    const toggleEmployee = (empId: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(empId)
                ? prev.filter((id) => id !== empId)
                : [...prev, empId]
        );
    };

    // Zaznacz/odznacz wszystkich
    const toggleAll = () => {
        const activeIds = employees.filter((e) => e.is_active).map((e) => e.id);
        if (selectedEmployees.length === activeIds.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(activeIds);
        }
    };

    // Opcje miesięcy
    const monthOptions = [
        { value: 1, label: "Styczeń" },
        { value: 2, label: "Luty" },
        { value: 3, label: "Marzec" },
        { value: 4, label: "Kwiecień" },
        { value: 5, label: "Maj" },
        { value: 6, label: "Czerwiec" },
        { value: 7, label: "Lipiec" },
        { value: 8, label: "Sierpień" },
        { value: 9, label: "Wrzesień" },
        { value: 10, label: "Październik" },
        { value: 11, label: "Listopad" },
        { value: 12, label: "Grudzień" },
    ];

    const yearOptions = [getYear(today), getYear(today) + 1];

    const activeEmployees = employees.filter((e) => e.is_active);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Generuj grafik
                    </DialogTitle>
                    <DialogDescription>
                        {step === "config"
                            ? "Wybierz miesiąc i pracowników do zaplanowania."
                            : "Sprawdź wygenerowany grafik."}
                    </DialogDescription>
                </DialogHeader>

                {step === "config" ? (
                    <div className="space-y-6">
                        {/* Wybór miesiąca */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Miesiąc
                            </label>
                            <div className="flex gap-2">
                                <Select
                                    value={String(selectedMonth)}
                                    onValueChange={(v) =>
                                        setSelectedMonth(Number(v))
                                    }
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map((m) => (
                                            <SelectItem
                                                key={m.value}
                                                value={String(m.value)}
                                            >
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={String(selectedYear)}
                                    onValueChange={(v) =>
                                        setSelectedYear(Number(v))
                                    }
                                >
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((y) => (
                                            <SelectItem
                                                key={y}
                                                value={String(y)}
                                            >
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Nieobecności w tym miesiącu */}
                        {absences.length > 0 && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    W wybranym miesiącu jest {absences.length}{" "}
                                    zatwierdzonych nieobecności. Zostaną
                                    automatycznie uwzględnione.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Wybór pracowników */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Pracownicy ({selectedEmployees.length}/
                                    {activeEmployees.length})
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAll}
                                >
                                    {selectedEmployees.length ===
                                    activeEmployees.length
                                        ? "Odznacz wszystkich"
                                        : "Zaznacz wszystkich"}
                                </Button>
                            </div>
                            <ScrollArea className="h-48 border rounded-md p-2">
                                <div className="space-y-2">
                                    {activeEmployees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                                            onClick={() =>
                                                toggleEmployee(emp.id)
                                            }
                                        >
                                            <Checkbox
                                                checked={selectedEmployees.includes(
                                                    emp.id
                                                )}
                                                onCheckedChange={() =>
                                                    toggleEmployee(emp.id)
                                                }
                                            />
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor: emp.color,
                                                }}
                                            />
                                            <span className="flex-1">
                                                {emp.first_name} {emp.last_name}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {emp.contract_hours}h/mies.
                                            </span>
                                            {emp.preferences
                                                ?.shift_preference &&
                                                emp.preferences
                                                    .shift_preference !==
                                                    "flexible" && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {emp.preferences
                                                            .shift_preference ===
                                                        "morning"
                                                            ? "Rano"
                                                            : emp.preferences
                                                                  .shift_preference ===
                                                              "afternoon"
                                                            ? "Popołudnie"
                                                            : "Wieczór"}
                                                    </Badge>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                ) : (
                    // PREVIEW
                    <div className="space-y-4">
                        {result && (
                            <>
                                {/* Statystyki */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold">
                                            {result.statistics.totalShifts}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Zmian
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold">
                                            {selectedEmployees.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Pracowników
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold">
                                            {result.warnings.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Ostrzeżeń
                                        </div>
                                    </div>
                                </div>

                                {/* Godziny per pracownik */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Przydzielone godziny
                                    </label>
                                    <ScrollArea className="h-32 border rounded-md p-2">
                                        <div className="space-y-1">
                                            {Object.entries(
                                                result.statistics
                                                    .hoursPerEmployee
                                            ).map(([empId, hours]) => {
                                                const emp = employees.find(
                                                    (e) => e.id === empId
                                                );
                                                const target =
                                                    result.statistics
                                                        .targetHoursPerEmployee[
                                                        empId
                                                    ] || 160;
                                                const percent = Math.round(
                                                    (hours / target) * 100
                                                );
                                                const isOk =
                                                    percent >= 90 &&
                                                    percent <= 110;

                                                return (
                                                    <div
                                                        key={empId}
                                                        className="flex items-center justify-between text-sm py-1"
                                                    >
                                                        <span>
                                                            {emp?.first_name}{" "}
                                                            {emp?.last_name}
                                                        </span>
                                                        <span
                                                            className={
                                                                isOk
                                                                    ? "text-green-600"
                                                                    : "text-orange-600"
                                                            }
                                                        >
                                                            {hours.toFixed(0)}h
                                                            /{target}h (
                                                            {percent}%)
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* Ostrzeżenia */}
                                {result.warnings.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            Ostrzeżenia
                                        </label>
                                        <ScrollArea className="h-24 border border-orange-200 rounded-md p-2 bg-orange-50">
                                            <div className="space-y-1 text-sm">
                                                {result.warnings.map(
                                                    (warn, i) => (
                                                        <div key={i}>
                                                            {warn}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}

                                {/* Sukces */}
                                {result.success &&
                                    result.warnings.length === 0 && (
                                        <Alert className="bg-green-50 border-green-200">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-700">
                                                Grafik wygenerowany pomyślnie!
                                                Wszystkie godziny przydzielone
                                                prawidłowo.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                            </>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === "config" ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Anuluj
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={
                                    isGenerating ||
                                    selectedEmployees.length === 0
                                }
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generuję...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        Generuj grafik
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep("config")}
                            >
                                Wróć
                            </Button>
                            <Button onClick={handleConfirm}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Zapisz grafik
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
