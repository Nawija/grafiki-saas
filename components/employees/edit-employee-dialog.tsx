"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    employeeSchema,
    type EmployeeInput,
    EMPLOYEE_COLORS,
} from "@/lib/validations/employee";
import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: EditEmployeeDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<EmployeeInput>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email || "",
            phone: employee.phone || "",
            employmentType: employee.employment_type,
            customHours: employee.custom_hours,
            color: employee.color,
        },
    });

    const employmentType = watch("employmentType");

    async function onSubmit(data: EmployeeInput) {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("employees")
                .update({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email || null,
                    phone: data.phone || null,
                    employment_type: data.employmentType,
                    custom_hours:
                        data.employmentType === "custom"
                            ? data.customHours
                            : null,
                    color: data.color,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", employee.id);

            if (error) throw error;

            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error updating employee:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edytuj pracownika</DialogTitle>
                    <DialogDescription>
                        Zmień dane pracownika {employee.first_name}{" "}
                        {employee.last_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Imię</Label>
                            <Input
                                id="firstName"
                                disabled={isLoading}
                                {...register("firstName")}
                            />
                            {errors.firstName && (
                                <p className="text-sm text-red-500">
                                    {errors.firstName.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Nazwisko</Label>
                            <Input
                                id="lastName"
                                disabled={isLoading}
                                {...register("lastName")}
                            />
                            {errors.lastName && (
                                <p className="text-sm text-red-500">
                                    {errors.lastName.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            disabled={isLoading}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                            id="phone"
                            type="tel"
                            disabled={isLoading}
                            {...register("phone")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="employmentType">Wymiar etatu</Label>
                        <Select
                            value={employmentType}
                            onValueChange={(value) =>
                                setValue(
                                    "employmentType",
                                    value as "full" | "half" | "custom"
                                )
                            }
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full">
                                    Pełny etat (8h/dzień)
                                </SelectItem>
                                <SelectItem value="half">
                                    1/2 etatu (4h/dzień)
                                </SelectItem>
                                <SelectItem value="custom">
                                    Niestandardowy
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {employmentType === "custom" && (
                        <div className="space-y-2">
                            <Label htmlFor="customHours">
                                Godziny dziennie
                            </Label>
                            <Input
                                id="customHours"
                                type="number"
                                min="1"
                                max="12"
                                disabled={isLoading}
                                {...register("customHours", {
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.customHours && (
                                <p className="text-sm text-red-500">
                                    {errors.customHours.message}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Kolor pracownika</Label>
                        <div className="flex flex-wrap gap-2">
                            {EMPLOYEE_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setValue("color", color)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                                        watch("color") === color
                                            ? "border-slate-900 dark:border-white scale-110"
                                            : "border-transparent hover:scale-105"
                                    )}
                                    style={{ backgroundColor: color }}
                                    disabled={isLoading}
                                >
                                    {watch("color") === color && (
                                        <Check className="h-4 w-4 text-white drop-shadow-md" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {errors.color && (
                            <p className="text-sm text-red-500">
                                {errors.color.message}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Anuluj
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Zapisz
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
