"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
    CalendarIcon,
    Plane,
    Stethoscope,
    GraduationCap,
    Baby,
    FileQuestion,
    Calendar as CalIcon,
} from "lucide-react";
import { countWorkingDays } from "@/lib/polish-holidays";
import type { Absence, AbsenceType, Employee } from "@/types";

interface AbsenceFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    absence?: Absence | null;
    employees: Employee[];
    onSave: (absence: Partial<Absence>) => void;
}

interface AbsenceFormData {
    employee_id: string;
    type: AbsenceType;
    start_date: Date;
    end_date: Date;
    reason?: string;
}

const absenceTypes: {
    value: AbsenceType;
    label: string;
    icon: React.ElementType;
    description: string;
}[] = [
    {
        value: "vacation",
        label: "Urlop wypoczynkowy",
        icon: Plane,
        description: "Standardowy urlop płatny",
    },
    {
        value: "vacation_on_demand",
        label: "Urlop na żądanie",
        icon: Plane,
        description: "Do 4 dni w roku",
    },
    {
        value: "sick_leave",
        label: "Zwolnienie lekarskie (L4)",
        icon: Stethoscope,
        description: "Choroba potwierdzona przez lekarza",
    },
    {
        value: "uz",
        label: "Urlop okolicznościowy",
        icon: CalIcon,
        description: "Ślub, narodziny, pogrzeb",
    },
    {
        value: "maternity",
        label: "Urlop macierzyński",
        icon: Baby,
        description: "Dla matek po porodzie",
    },
    {
        value: "paternity",
        label: "Urlop ojcowski",
        icon: Baby,
        description: "Dla ojców, do 2 tygodni",
    },
    {
        value: "childcare",
        label: "Urlop wychowawczy",
        icon: Baby,
        description: "Opieka nad dzieckiem",
    },
    {
        value: "unpaid",
        label: "Urlop bezpłatny",
        icon: CalIcon,
        description: "Bez wynagrodzenia",
    },
    {
        value: "training",
        label: "Szkolenie",
        icon: GraduationCap,
        description: "Szkolenie zawodowe",
    },
    {
        value: "delegation",
        label: "Delegacja",
        icon: Plane,
        description: "Wyjazd służbowy",
    },
    {
        value: "blood_donation",
        label: "Krwiodawstwo",
        icon: Stethoscope,
        description: "Honorowe oddawanie krwi",
    },
    {
        value: "military",
        label: "Ćwiczenia wojskowe",
        icon: CalIcon,
        description: "Rezerwa wojskowa",
    },
    {
        value: "other",
        label: "Inne",
        icon: FileQuestion,
        description: "Inna nieobecność",
    },
];

export function AbsenceFormDialog({
    open,
    onOpenChange,
    absence,
    employees,
    onSave,
}: AbsenceFormDialogProps) {
    const isEditing = !!absence;

    const form = useForm<AbsenceFormData>({
        defaultValues: {
            employee_id: "",
            type: "vacation",
            start_date: new Date(),
            end_date: new Date(),
            reason: "",
        },
    });

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            if (absence) {
                form.reset({
                    employee_id: absence.employee_id,
                    type: absence.type,
                    start_date: new Date(absence.start_date),
                    end_date: new Date(absence.end_date),
                    reason: absence.reason || "",
                });
            } else {
                form.reset({
                    employee_id: "",
                    type: "vacation",
                    start_date: new Date(),
                    end_date: new Date(),
                    reason: "",
                });
            }
        }
    }, [open, absence, form]);

    const onSubmit = (data: AbsenceFormData) => {
        onSave({
            ...data,
            start_date: format(data.start_date, "yyyy-MM-dd"),
            end_date: format(data.end_date, "yyyy-MM-dd"),
            id: absence?.id,
        });
        onOpenChange(false);
    };

    // Calculate working days
    const watchStartDate = form.watch("start_date");
    const watchEndDate = form.watch("end_date");

    const workingDays =
        watchStartDate && watchEndDate
            ? countWorkingDays(watchStartDate, watchEndDate)
            : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edytuj nieobecność" : "Zgłoś nieobecność"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Zmień szczegóły zgłoszenia nieobecności."
                            : "Wypełnij formularz, aby zgłosić nieobecność pracownika."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
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
                                            {employees.map((emp) => {
                                                const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
                                                const fullName = `${emp.first_name} ${emp.last_name}`;
                                                return (
                                                    <SelectItem
                                                        key={emp.id}
                                                        value={emp.id}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium"
                                                                style={{
                                                                    backgroundColor:
                                                                        emp.color ||
                                                                        "#e0e7ff",
                                                                    color: "#4338ca",
                                                                }}
                                                            >
                                                                {initials}
                                                            </div>
                                                            {fullName}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Absence type */}
                        <FormField
                            control={form.control}
                            name="type"
                            rules={{ required: "Wybierz typ nieobecności" }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Typ nieobecności</FormLabel>
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
                                            {absenceTypes.map((type) => {
                                                const Icon = type.icon;
                                                return (
                                                    <SelectItem
                                                        key={type.value}
                                                        value={type.value}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            <div>
                                                                <p>
                                                                    {type.label}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {
                                                                        type.description
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
                                rules={{ required: "Wybierz datę" }}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Od</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "pl-3 text-left font-normal",
                                                            !field.value &&
                                                                "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                "d MMM yyyy",
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
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        // If end date is before start date, update it
                                                        if (
                                                            date &&
                                                            watchEndDate < date
                                                        ) {
                                                            form.setValue(
                                                                "end_date",
                                                                date
                                                            );
                                                        }
                                                    }}
                                                    locale={pl}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="end_date"
                                rules={{ required: "Wybierz datę" }}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Do</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "pl-3 text-left font-normal",
                                                            !field.value &&
                                                                "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                "d MMM yyyy",
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
                                                    disabled={(date) =>
                                                        date < watchStartDate
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Working days summary */}
                        <div className="rounded-lg bg-muted p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    Dni robocze:
                                </span>
                                <Badge variant="secondary" className="text-lg">
                                    {workingDays}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Obliczone z uwzględnieniem weekendów i świąt
                            </p>
                        </div>

                        {/* Reason */}
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Powód (opcjonalnie)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="np. Wyjazd rodzinny, choroba, szkolenie BHP..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Krótki opis powodu nieobecności
                                    </FormDescription>
                                    <FormMessage />
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
                                {isEditing
                                    ? "Zapisz zmiany"
                                    : "Zgłoś nieobecność"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
