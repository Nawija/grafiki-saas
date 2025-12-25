"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";

interface AddEmployeeDialogProps {
    organizationId: string;
    defaultOpen?: boolean;
}

export function AddEmployeeDialog({
    organizationId,
    defaultOpen = false,
}: AddEmployeeDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(defaultOpen);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<EmployeeInput>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            employmentType: "full",
            color: "#3b82f6",
        },
    });

    const employmentType = watch("employmentType");

    async function onSubmit(data: EmployeeInput) {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase.from("employees").insert({
                organization_id: organizationId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email || null,
                phone: data.phone || null,
                employment_type: data.employmentType,
                custom_hours:
                    data.employmentType === "custom" ? data.customHours : null,
                color: data.color,
            });

            if (error) throw error;

            reset();
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Error adding employee:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pracownika
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Dodaj pracownika</DialogTitle>
                    <DialogDescription>
                        Wprowadź dane nowego pracownika
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Imię</Label>
                            <Input
                                id="firstName"
                                placeholder="Jan"
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
                                placeholder="Kowalski"
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
                        <Label htmlFor="email">Email (opcjonalnie)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="jan@example.com"
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
                        <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+48 123 456 789"
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
                                <SelectValue placeholder="Wybierz wymiar etatu" />
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
                                placeholder="np. 6"
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

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            Anuluj
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Dodaj
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
