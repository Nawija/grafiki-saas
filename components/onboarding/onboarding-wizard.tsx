"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    Users,
    Calendar,
    ArrowRight,
    ArrowLeft,
    Check,
    Sparkles,
    Clock,
    UserPlus,
    Briefcase,
    ChevronRight,
    Loader2,
    Plus,
    X,
    Mail,
} from "lucide-react";
import { createOrganization } from "@/lib/actions/organization";
import { createTeam } from "@/lib/actions/team";
import { createEmployee, CreateEmployeeInput } from "@/lib/actions/employee";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
    userId: string;
    userEmail: string;
    existingOrganizationId?: string;
}

interface TeamEmployee {
    firstName: string;
    lastName: string;
    email?: string;
    position?: string;
    contractType: "full_time" | "part_time" | "contract";
    hoursPerWeek: number;
}

const CONTRACT_TYPES = [
    { value: "full_time", label: "Pełny etat", hours: 40 },
    { value: "part_time", label: "Pół etatu", hours: 20 },
    { value: "contract", label: "Umowa zlecenie", hours: 0 },
] as const;

const STEPS = [
    {
        id: 1,
        title: "Utwórz firmę",
        description: "Podstawowe informacje o Twojej organizacji",
        icon: Building2,
    },
    {
        id: 2,
        title: "Dodaj zespół",
        description: "Nazwa zespołu lub lokalizacji",
        icon: Users,
    },
    {
        id: 3,
        title: "Dodaj pracowników",
        description: "Osoby, dla których tworzysz grafik",
        icon: UserPlus,
    },
    {
        id: 4,
        title: "Gotowe!",
        description: "Twój grafik czeka",
        icon: Calendar,
    },
];

export function OnboardingWizard({
    userId,
    userEmail,
    existingOrganizationId,
}: OnboardingWizardProps) {
    const router = useRouter();
    // Start from step 2 if organization already exists
    const [currentStep, setCurrentStep] = useState(
        existingOrganizationId ? 2 : 1
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [organizationName, setOrganizationName] = useState("");
    const [teamName, setTeamName] = useState("");
    const [employees, setEmployees] = useState<TeamEmployee[]>([
        {
            firstName: "",
            lastName: "",
            contractType: "full_time",
            hoursPerWeek: 40,
        },
    ]);

    // Created IDs - use existing org if provided
    const [organizationId, setOrganizationId] = useState<string | null>(
        existingOrganizationId || null
    );
    const [teamId, setTeamId] = useState<string | null>(null);

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return organizationName.trim().length >= 2;
            case 2:
                return teamName.trim().length >= 2;
            case 3:
                return employees.some(
                    (e) => e.firstName.trim() && e.lastName.trim()
                );
            default:
                return true;
        }
    };

    const handleNext = async () => {
        setError(null);

        if (currentStep === 1) {
            // Create organization
            setIsLoading(true);
            const result = await createOrganization(organizationName.trim());
            setIsLoading(false);

            if (result.error) {
                setError(result.error);
                return;
            }
            setOrganizationId(result.data!.id);
            setCurrentStep(2);
        } else if (currentStep === 2) {
            // Create team
            setIsLoading(true);
            const result = await createTeam(organizationId!, teamName.trim());
            setIsLoading(false);

            if (result.error) {
                setError(result.error);
                return;
            }
            setTeamId(result.data!.id);
            setCurrentStep(3);
        } else if (currentStep === 3) {
            // Create employees
            setIsLoading(true);

            const validEmployees = employees.filter(
                (e) => e.firstName.trim() && e.lastName.trim()
            );

            for (const emp of validEmployees) {
                const result = await createEmployee({
                    team_id: teamId!,
                    first_name: emp.firstName.trim(),
                    last_name: emp.lastName.trim(),
                    email: emp.email?.trim() || undefined,
                    position: emp.position?.trim() || "Pracownik",
                    contract_type: emp.contractType,
                    hours_per_week: emp.hoursPerWeek,
                });

                if (result.error) {
                    setError(result.error);
                    setIsLoading(false);
                    return;
                }
            }

            setIsLoading(false);
            setCurrentStep(4);
        } else if (currentStep === 4) {
            router.push("/dashboard/schedule");
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const addEmployee = () => {
        if (employees.length >= 5) {
            setError(
                "W darmowym planie możesz dodać maksymalnie 5 pracowników"
            );
            return;
        }
        setEmployees([
            ...employees,
            {
                firstName: "",
                lastName: "",
                contractType: "full_time",
                hoursPerWeek: 40,
            },
        ]);
    };

    const removeEmployee = (index: number) => {
        if (employees.length > 1) {
            setEmployees(employees.filter((_, i) => i !== index));
        }
    };

    const updateEmployee = (
        index: number,
        field: keyof TeamEmployee,
        value: string | number
    ) => {
        const updated = [...employees];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-update hours based on contract type
        if (field === "contractType") {
            const contractType = CONTRACT_TYPES.find((c) => c.value === value);
            if (contractType) {
                updated[index].hoursPerWeek = contractType.hours;
            }
        }

        setEmployees(updated);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="container max-w-4xl mx-auto px-4 py-8 md:py-16">
                {/* Progress Steps */}
                <div className="mb-12">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                        {STEPS.map((step, index) => {
                            const StepIcon = step.icon;
                            const isCompleted = currentStep > step.id;
                            const isCurrent = currentStep === step.id;

                            return (
                                <div
                                    key={step.id}
                                    className="flex items-center"
                                >
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                                isCompleted
                                                    ? "bg-green-500 text-white"
                                                    : isCurrent
                                                    ? "bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-800"
                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                            )}
                                        >
                                            {isCompleted ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <StepIcon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "text-xs mt-2 font-medium hidden sm:block",
                                                isCurrent
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-slate-500"
                                            )}
                                        >
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={cn(
                                                "w-12 sm:w-24 h-1 mx-2 rounded-full transition-colors",
                                                isCompleted
                                                    ? "bg-green-500"
                                                    : "bg-slate-200 dark:bg-slate-700"
                                            )}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    {currentStep === 1 && (
                                        <Building2 className="w-8 h-8 text-white" />
                                    )}
                                    {currentStep === 2 && (
                                        <Users className="w-8 h-8 text-white" />
                                    )}
                                    {currentStep === 3 && (
                                        <UserPlus className="w-8 h-8 text-white" />
                                    )}
                                    {currentStep === 4 && (
                                        <Sparkles className="w-8 h-8 text-white" />
                                    )}
                                </div>
                                <CardTitle className="text-2xl">
                                    {STEPS[currentStep - 1].title}
                                </CardTitle>
                                <CardDescription className="text-base">
                                    {STEPS[currentStep - 1].description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 pt-4">
                                {/* Step 1: Organization */}
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="org-name"
                                                className="text-sm font-medium"
                                            >
                                                Nazwa firmy
                                            </Label>
                                            <Input
                                                id="org-name"
                                                placeholder="np. Kawiarnia Espresso"
                                                value={organizationName}
                                                onChange={(e) =>
                                                    setOrganizationName(
                                                        e.target.value
                                                    )
                                                }
                                                className="h-12 text-lg"
                                                autoFocus
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Możesz to zmienić później w
                                                ustawieniach.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                                            <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Plan Darmowy
                                            </h4>
                                            <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    1 zespół
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    Do 5 pracowników
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    Automatyczne generowanie
                                                    grafików
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    Polskie niedziele handlowe
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Team */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="team-name"
                                                className="text-sm font-medium"
                                            >
                                                Nazwa zespołu
                                            </Label>
                                            <Input
                                                id="team-name"
                                                placeholder="np. Sklep Główny, Biuro, Kuchnia"
                                                value={teamName}
                                                onChange={(e) =>
                                                    setTeamName(e.target.value)
                                                }
                                                className="h-12 text-lg"
                                                autoFocus
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Zespół to grupa osób pracująca w
                                                jednej lokalizacji lub dziale.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                "Sklep",
                                                "Biuro",
                                                "Magazyn",
                                                "Recepcja",
                                                "Kuchnia",
                                                "Obsługa",
                                            ].map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() =>
                                                        setTeamName(suggestion)
                                                    }
                                                    className={cn(
                                                        "p-3 rounded-lg border text-left transition-all",
                                                        teamName === suggestion
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                                                    )}
                                                >
                                                    <span className="font-medium">
                                                        {suggestion}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Employees */}
                                {currentStep === 3 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                Dodaj pracowników (max 5 w
                                                darmowym planie)
                                            </p>
                                            <Badge variant="secondary">
                                                {
                                                    employees.filter(
                                                        (e) =>
                                                            e.firstName.trim() &&
                                                            e.lastName.trim()
                                                    ).length
                                                }
                                                /5
                                            </Badge>
                                        </div>

                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                            {employees.map(
                                                (employee, index) => (
                                                    <div
                                                        key={index}
                                                        className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                Pracownik{" "}
                                                                {index + 1}
                                                            </span>
                                                            {employees.length >
                                                                1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        removeEmployee(
                                                                            index
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">
                                                                    Imię *
                                                                </Label>
                                                                <Input
                                                                    placeholder="Jan"
                                                                    value={
                                                                        employee.firstName
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateEmployee(
                                                                            index,
                                                                            "firstName",
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">
                                                                    Nazwisko *
                                                                </Label>
                                                                <Input
                                                                    placeholder="Kowalski"
                                                                    value={
                                                                        employee.lastName
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateEmployee(
                                                                            index,
                                                                            "lastName",
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" />
                                                                    Email
                                                                    (opcjonalnie)
                                                                </Label>
                                                                <Input
                                                                    type="email"
                                                                    placeholder="jan@example.com"
                                                                    value={
                                                                        employee.email ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateEmployee(
                                                                            index,
                                                                            "email",
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">
                                                                    Stanowisko
                                                                </Label>
                                                                <Input
                                                                    placeholder="np. Kasjer"
                                                                    value={
                                                                        employee.position ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateEmployee(
                                                                            index,
                                                                            "position",
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Rodzaj umowy
                                                            </Label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {CONTRACT_TYPES.map(
                                                                    (type) => (
                                                                        <button
                                                                            key={
                                                                                type.value
                                                                            }
                                                                            onClick={() =>
                                                                                updateEmployee(
                                                                                    index,
                                                                                    "contractType",
                                                                                    type.value
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                "p-2 rounded-lg border text-xs font-medium transition-all",
                                                                                employee.contractType ===
                                                                                    type.value
                                                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                                                                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                                                                            )}
                                                                        >
                                                                            {
                                                                                type.label
                                                                            }
                                                                            <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                                                                {
                                                                                    type.hours
                                                                                }
                                                                                h/tydzień
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {employees.length < 5 && (
                                            <Button
                                                variant="outline"
                                                onClick={addEmployee}
                                                className="w-full"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Dodaj pracownika
                                            </Button>
                                        )}

                                        <p className="text-xs text-muted-foreground text-center">
                                            Email jest opcjonalny. Jeśli podasz,
                                            pracownik będzie mógł otrzymywać
                                            powiadomienia o grafiku.
                                        </p>
                                    </div>
                                )}

                                {/* Step 4: Complete */}
                                {currentStep === 4 && (
                                    <div className="text-center space-y-6 py-4">
                                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                                            <Check className="w-10 h-10 text-white" />
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-semibold mb-2">
                                                Wszystko gotowe!
                                            </h3>
                                            <p className="text-muted-foreground">
                                                Twoja firma{" "}
                                                <strong>
                                                    {organizationName}
                                                </strong>{" "}
                                                i zespół{" "}
                                                <strong>{teamName}</strong>{" "}
                                                zostały utworzone.
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                            <h4 className="font-medium mb-3">
                                                Co dalej?
                                            </h4>
                                            <ul className="space-y-2 text-sm text-left">
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500" />
                                                    <span>
                                                        Przejdź do tworzenia
                                                        grafiku i ustaw pierwszy
                                                        tydzień
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500" />
                                                    <span>
                                                        Użyj automatycznego
                                                        generowania lub
                                                        przeciągaj zmiany
                                                        ręcznie
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500" />
                                                    <span>
                                                        Opublikuj grafik i
                                                        powiadom pracowników
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Error display */}
                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Navigation buttons */}
                                <div className="flex gap-3 mt-8">
                                    {currentStep > 1 && currentStep < 4 && (
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            disabled={isLoading}
                                            className="flex-1"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Wstecz
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleNext}
                                        disabled={!canProceed() || isLoading}
                                        className={cn(
                                            "flex-1 h-12",
                                            currentStep === 4
                                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                        )}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Zapisuję...
                                            </>
                                        ) : currentStep === 4 ? (
                                            <>
                                                Przejdź do grafiku
                                                <Calendar className="w-4 h-4 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Dalej
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
