"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
} from "date-fns";
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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    CalendarIcon,
    Wand2,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { generateSchedule } from "@/lib/schedule-algorithm";
import type {
    Shift,
    Employee,
    ShiftTemplate,
    ScheduleGenerationConfig,
    ScheduleGenerationResult,
} from "@/types";

interface GenerateScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    templates: ShiftTemplate[];
    onGenerate: (shifts: Shift[]) => void;
}

interface GenerateFormData {
    date_range:
        | "this_week"
        | "next_week"
        | "this_month"
        | "next_month"
        | "custom";
    start_date: Date;
    end_date: Date;
    min_employees_per_day: number;
    max_employees_per_day: number;
    distribute_evenly: boolean;
    respect_preferences: boolean;
    avoid_consecutive_weekends: boolean;
    max_weekends_per_month: number;
    selected_employees: string[];
    template_id: string;
}

const dateRangeOptions = [
    { value: "this_week", label: "Ten tydzień" },
    { value: "next_week", label: "Następny tydzień" },
    { value: "this_month", label: "Ten miesiąc" },
    { value: "next_month", label: "Następny miesiąc" },
    { value: "custom", label: "Własny zakres" },
];

export function GenerateScheduleDialog({
    open,
    onOpenChange,
    employees,
    templates,
    onGenerate,
}: GenerateScheduleDialogProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<ScheduleGenerationResult | null>(null);
    const [step, setStep] = useState<"config" | "preview">("config");

    const form = useForm<GenerateFormData>({
        defaultValues: {
            date_range: "next_week",
            start_date: startOfWeek(addDays(new Date(), 7), {
                weekStartsOn: 1,
            }),
            end_date: endOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }),
            min_employees_per_day: 2,
            max_employees_per_day: 4,
            distribute_evenly: true,
            respect_preferences: true,
            avoid_consecutive_weekends: true,
            max_weekends_per_month: 2,
            selected_employees: employees.map((e) => e.id),
            template_id:
                templates.find((t) => t.is_default)?.id ||
                templates[0]?.id ||
                "",
        },
    });

    // Handle date range presets
    const handleDateRangeChange = (value: string) => {
        const today = new Date();

        switch (value) {
            case "this_week":
                form.setValue(
                    "start_date",
                    startOfWeek(today, { weekStartsOn: 1 })
                );
                form.setValue(
                    "end_date",
                    endOfWeek(today, { weekStartsOn: 1 })
                );
                break;
            case "next_week":
                form.setValue(
                    "start_date",
                    startOfWeek(addDays(today, 7), { weekStartsOn: 1 })
                );
                form.setValue(
                    "end_date",
                    endOfWeek(addDays(today, 7), { weekStartsOn: 1 })
                );
                break;
            case "this_month":
                form.setValue("start_date", startOfMonth(today));
                form.setValue("end_date", endOfMonth(today));
                break;
            case "next_month":
                const nextMonth = addDays(endOfMonth(today), 1);
                form.setValue("start_date", startOfMonth(nextMonth));
                form.setValue("end_date", endOfMonth(nextMonth));
                break;
        }
        form.setValue("date_range", value as GenerateFormData["date_range"]);
    };

    // Generate schedule
    const handleGenerate = async () => {
        setIsGenerating(true);

        const formData = form.getValues();
        const selectedTemplate = templates.find(
            (t) => t.id === formData.template_id
        );

        // Build staffing requirements for each day
        const staffingRequirements: ScheduleGenerationConfig["staffing_requirements"] =
            {};
        for (let i = 0; i < 7; i++) {
            staffingRequirements[i] = {
                min_employees: formData.min_employees_per_day,
                max_employees: formData.max_employees_per_day,
            };
        }

        const config: ScheduleGenerationConfig = {
            team_id: "team-1",
            start_date: format(formData.start_date, "yyyy-MM-dd"),
            end_date: format(formData.end_date, "yyyy-MM-dd"),
            staffing_requirements: staffingRequirements,
            distribute_hours_evenly: formData.distribute_evenly,
            respect_preferences: formData.respect_preferences,
            avoid_consecutive_weekends: formData.avoid_consecutive_weekends,
            max_weekends_per_month: formData.max_weekends_per_month,
            min_rest_between_shifts: 11,
            max_consecutive_work_days: 6,
            seniority_priority: false,
            fill_preferred_first: true,
        };

        // Filter employees
        const selectedEmployees = employees.filter((e) =>
            formData.selected_employees.includes(e.id)
        );

        // Simulate async generation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const generationResult = generateSchedule(
            config,
            selectedEmployees,
            new Map(), // Employee preferences would come from DB
            selectedTemplate ? [selectedTemplate] : templates,
            [] // Existing absences would come from DB
        );

        setResult(generationResult);
        setStep("preview");
        setIsGenerating(false);
    };

    // Confirm and save
    const handleConfirm = () => {
        if (result?.shifts) {
            const newShifts: Shift[] = result.shifts.map((s, i) => ({
                ...s,
                id: `generated-${Date.now()}-${i}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));
            onGenerate(newShifts);
        }
        handleClose();
    };

    // Reset and close
    const handleClose = () => {
        setStep("config");
        setResult(null);
        form.reset();
        onOpenChange(false);
    };

    const watchDateRange = form.watch("date_range");
    const watchStartDate = form.watch("start_date");
    const watchEndDate = form.watch("end_date");

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Automatyczne generowanie grafiku
                    </DialogTitle>
                    <DialogDescription>
                        {step === "config"
                            ? "Skonfiguruj parametry i pozwól algorytmowi wygenerować optymalny grafik."
                            : "Sprawdź wygenerowany grafik przed zapisaniem."}
                    </DialogDescription>
                </DialogHeader>

                {step === "config" ? (
                    <Form {...form}>
                        <form className="space-y-6">
                            <Tabs defaultValue="dates" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="dates">
                                        Zakres dat
                                    </TabsTrigger>
                                    <TabsTrigger value="staffing">
                                        Obsada
                                    </TabsTrigger>
                                    <TabsTrigger value="rules">
                                        Reguły
                                    </TabsTrigger>
                                </TabsList>

                                {/* Dates tab */}
                                <TabsContent
                                    value="dates"
                                    className="space-y-4 mt-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="date_range"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Okres</FormLabel>
                                                <Select
                                                    onValueChange={
                                                        handleDateRangeChange
                                                    }
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Wybierz okres" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {dateRangeOptions.map(
                                                            (opt) => (
                                                                <SelectItem
                                                                    key={
                                                                        opt.value
                                                                    }
                                                                    value={
                                                                        opt.value
                                                                    }
                                                                >
                                                                    {opt.label}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    {watchDateRange === "custom" && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="start_date"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>
                                                            Od
                                                        </FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="text-left font-normal"
                                                                    >
                                                                        {format(
                                                                            field.value,
                                                                            "d MMM yyyy",
                                                                            {
                                                                                locale: pl,
                                                                            }
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
                                                                    selected={
                                                                        field.value
                                                                    }
                                                                    onSelect={
                                                                        field.onChange
                                                                    }
                                                                    locale={pl}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="end_date"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>
                                                            Do
                                                        </FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="text-left font-normal"
                                                                    >
                                                                        {format(
                                                                            field.value,
                                                                            "d MMM yyyy",
                                                                            {
                                                                                locale: pl,
                                                                            }
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
                                                                    selected={
                                                                        field.value
                                                                    }
                                                                    onSelect={
                                                                        field.onChange
                                                                    }
                                                                    locale={pl}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div className="rounded-lg bg-muted p-3 text-sm">
                                        <p className="font-medium">
                                            Wybrany okres:
                                        </p>
                                        <p className="text-muted-foreground">
                                            {format(
                                                watchStartDate,
                                                "d MMMM yyyy",
                                                { locale: pl }
                                            )}{" "}
                                            —{" "}
                                            {format(
                                                watchEndDate,
                                                "d MMMM yyyy",
                                                { locale: pl }
                                            )}
                                        </p>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="template_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Szablon zmiany
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Wybierz szablon" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {templates.map(
                                                            (tpl) => (
                                                                <SelectItem
                                                                    key={tpl.id}
                                                                    value={
                                                                        tpl.id
                                                                    }
                                                                >
                                                                    {tpl.name} (
                                                                    {
                                                                        tpl.start_time
                                                                    }{" "}
                                                                    -{" "}
                                                                    {
                                                                        tpl.end_time
                                                                    }
                                                                    )
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Domyślne godziny pracy dla
                                                    generowanych zmian
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                {/* Staffing tab */}
                                <TabsContent
                                    value="staffing"
                                    className="space-y-4 mt-4"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="min_employees_per_day"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Min. pracowników/dzień
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={10}
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
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="max_employees_per_day"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Max. pracowników/dzień
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={20}
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
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="selected_employees"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Pracownicy do uwzględnienia
                                                </FormLabel>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {employees.map((emp) => {
                                                        const isSelected =
                                                            field.value.includes(
                                                                emp.id
                                                            );
                                                        return (
                                                            <Badge
                                                                key={emp.id}
                                                                variant={
                                                                    isSelected
                                                                        ? "default"
                                                                        : "outline"
                                                                }
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    if (
                                                                        isSelected
                                                                    ) {
                                                                        field.onChange(
                                                                            field.value.filter(
                                                                                (
                                                                                    id
                                                                                ) =>
                                                                                    id !==
                                                                                    emp.id
                                                                            )
                                                                        );
                                                                    } else {
                                                                        field.onChange(
                                                                            [
                                                                                ...field.value,
                                                                                emp.id,
                                                                            ]
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {`${emp.first_name} ${emp.last_name}`}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                                <FormDescription>
                                                    Kliknij, aby
                                                    zaznaczyć/odznaczyć
                                                    pracowników
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                {/* Rules tab */}
                                <TabsContent
                                    value="rules"
                                    className="space-y-4 mt-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="distribute_evenly"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>
                                                        Równomierne rozłożenie
                                                        godzin
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Staraj się przydzielić
                                                        podobną liczbę godzin
                                                        każdemu pracownikowi
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

                                    <FormField
                                        control={form.control}
                                        name="respect_preferences"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>
                                                        Uwzględnij preferencje
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Priorytetowo traktuj
                                                        preferowane dni
                                                        pracowników
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

                                    <FormField
                                        control={form.control}
                                        name="avoid_consecutive_weekends"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>
                                                        Unikaj kolejnych
                                                        weekendów
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Nie przydzielaj tego
                                                        samego pracownika na dwa
                                                        weekendy z rzędu
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

                                    <FormField
                                        control={form.control}
                                        name="max_weekends_per_month"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Max. weekendów w miesiącu:{" "}
                                                    {field.value}
                                                </FormLabel>
                                                <FormControl>
                                                    <Slider
                                                        min={0}
                                                        max={4}
                                                        step={1}
                                                        value={[field.value]}
                                                        onValueChange={([
                                                            val,
                                                        ]) =>
                                                            field.onChange(val)
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Maksymalna liczba weekendów
                                                    dla jednego pracownika
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>
                            </Tabs>
                        </form>
                    </Form>
                ) : (
                    /* Preview step */
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border p-4">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">
                                            Wygenerowane zmiany
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold mt-2">
                                        {result?.statistics.totalShifts || 0}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span className="font-medium">
                                            Ostrzeżenia
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold mt-2">
                                        {result?.warnings.length || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Warnings */}
                            {result?.warnings && result.warnings.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <h4 className="font-medium text-amber-800 mb-2">
                                        Ostrzeżenia:
                                    </h4>
                                    <ul className="space-y-1 text-sm text-amber-700">
                                        {result.warnings.map((warning, i) => (
                                            <li key={i}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Hours per employee */}
                            {result?.statistics.hoursPerEmployee && (
                                <div className="rounded-lg border p-4">
                                    <h4 className="font-medium mb-3">
                                        Godziny na pracownika:
                                    </h4>
                                    <div className="space-y-2">
                                        {Object.entries(
                                            result.statistics.hoursPerEmployee
                                        ).map(([empId, hours]) => {
                                            const employee = employees.find(
                                                (e) => e.id === empId
                                            );
                                            if (!employee) return null;
                                            return (
                                                <div
                                                    key={empId}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    employee.color ||
                                                                    "#e0e7ff",
                                                                color: "#4338ca",
                                                            }}
                                                        >
                                                            {`${employee.first_name[0]}${employee.last_name[0]}`}
                                                        </div>
                                                        <span className="text-sm">
                                                            {`${employee.first_name} ${employee.last_name}`}
                                                        </span>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {hours}h
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Unfilled slots */}
                            {result?.unfilledSlots &&
                                result.unfilledSlots.length > 0 && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                        <h4 className="font-medium text-red-800 mb-2">
                                            Nieobsadzone dni:
                                        </h4>
                                        <ul className="space-y-1 text-sm text-red-700">
                                            {result.unfilledSlots.map(
                                                (slot, i) => (
                                                    <li key={i}>
                                                        •{" "}
                                                        {format(
                                                            new Date(slot.date),
                                                            "d MMM (EEEE)",
                                                            { locale: pl }
                                                        )}{" "}
                                                        - {slot.reason}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    {step === "config" ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Anuluj
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Generowanie...
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
                                Wróć do konfiguracji
                            </Button>
                            <Button onClick={handleConfirm}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Zatwierdź i zapisz
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
