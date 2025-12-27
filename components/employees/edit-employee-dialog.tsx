"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
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
import { Loader2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#a855f7", // purple
    "#f43f5e", // rose
];

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
    const [selectedColor, setSelectedColor] = useState(employee.color || "#3b82f6");

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
                    color: selectedColor,
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
            <DialogContent className="sm:max-w-lg">
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

                    {/* Color Picker */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <Label>Kolor pracownika</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-10 h-10 rounded-full border-2 border-muted flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                                style={{ backgroundColor: selectedColor }}
                            >
                                {employee.first_name[0]}{employee.last_name[0]}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={cn(
                                            "w-7 h-7 rounded-full transition-all hover:scale-110",
                                            selectedColor === color 
                                                ? "ring-2 ring-offset-2 ring-primary" 
                                                : "hover:ring-2 hover:ring-offset-1 hover:ring-muted-foreground/30"
                                        )}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                        <Input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="h-8 w-20 p-1 cursor-pointer"
                            disabled={isLoading}
                        />
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
