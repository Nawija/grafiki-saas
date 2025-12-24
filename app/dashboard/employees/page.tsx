"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import {
    Plus,
    Search,
    MoreHorizontal,
    Mail,
    Phone,
    Clock,
    Edit,
    Trash2,
    UserX,
    UserCheck,
    Loader2,
    AlertCircle,
    Users,
} from "lucide-react";
import type { Employee, EmployeeRole, Team, ShiftPreference } from "@/types";
import { SHIFT_PREFERENCE_HOURS } from "@/types";
import {
    getEmployeesByTeam,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} from "@/lib/actions/employee";
import { getTeamsByOrganization } from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/client";

const roleLabels: Record<EmployeeRole, string> = {
    manager: "Kierownik",
    employee: "Pracownik",
    "part-time": "Niepełny etat",
    trainee: "Stażysta",
};

const roleColors: Record<EmployeeRole, string> = {
    manager: "bg-purple-100 text-purple-700",
    employee: "bg-blue-100 text-blue-700",
    "part-time": "bg-green-100 text-green-700",
    trainee: "bg-amber-100 text-amber-700",
};

const colorOptions = [
    { value: "#3b82f6", label: "Niebieski" },
    { value: "#10b981", label: "Zielony" },
    { value: "#8b5cf6", label: "Fioletowy" },
    { value: "#f59e0b", label: "Pomarańczowy" },
    { value: "#ec4899", label: "Różowy" },
    { value: "#06b6d4", label: "Turkusowy" },
    { value: "#ef4444", label: "Czerwony" },
    { value: "#64748b", label: "Szary" },
];

const shiftPreferenceOptions: { value: ShiftPreference; label: string }[] = [
    { value: "flexible", label: "Elastycznie (dowolne godziny)" },
    { value: "morning", label: "Tylko rano (6:00-14:00)" },
    { value: "afternoon", label: "Tylko popołudnie (14:00-22:00)" },
    { value: "evening", label: "Tylko wieczór (18:00-22:00)" },
];

interface EmployeeFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    position: string;
    role: EmployeeRole;
    contract_hours: number;
    color: string;
    shift_preference: ShiftPreference;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<EmployeeFormData>({
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            position: "",
            role: "employee",
            contract_hours: 160,
            color: "#3b82f6",
            shift_preference: "flexible",
        },
    });

    // Load organization and teams
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

                // Get user's organization
                const { data: membership } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .single();

                if (!membership) {
                    setError("Nie należysz do żadnej organizacji");
                    return;
                }

                // Get teams
                const teamsResult = await getTeamsByOrganization(
                    membership.organization_id
                );
                if (teamsResult.error) {
                    setError(teamsResult.error);
                    return;
                }

                setTeams(teamsResult.data || []);

                // Set first team as current
                if (teamsResult.data && teamsResult.data.length > 0) {
                    setCurrentTeamId(teamsResult.data[0].id);
                }
            } catch (err) {
                setError("Wystąpił błąd podczas ładowania danych");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Load employees when team changes
    const loadEmployees = useCallback(async () => {
        if (!currentTeamId) return;

        setIsLoading(true);
        const result = await getEmployeesByTeam(currentTeamId, true);
        setIsLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setEmployees(result.data || []);
        }
    }, [currentTeamId]);

    useEffect(() => {
        if (currentTeamId) {
            loadEmployees();
        }
    }, [currentTeamId, loadEmployees]);

    // Filter employees
    const filteredEmployees = employees.filter((emp) => {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        return (
            fullName.includes(query) ||
            emp.email?.toLowerCase().includes(query) ||
            emp.position.toLowerCase().includes(query)
        );
    });

    const activeEmployees = filteredEmployees.filter((e) => e.is_active);
    const inactiveEmployees = filteredEmployees.filter((e) => !e.is_active);

    // Handlers
    const handleOpenDialog = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            form.reset({
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email || "",
                phone: employee.phone || "",
                position: employee.position,
                role: employee.role,
                contract_hours: employee.contract_hours,
                color: employee.color,
                shift_preference:
                    employee.preferences?.shift_preference || "flexible",
            });
        } else {
            setEditingEmployee(null);
            form.reset({
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                position: "",
                role: "employee",
                contract_hours: 160,
                color: "#3b82f6",
                shift_preference: "flexible",
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async (data: EmployeeFormData) => {
        if (!currentTeamId) return;

        setIsSaving(true);
        setError(null);

        // Przygotuj preferencje
        const preferences = {
            shift_preference: data.shift_preference,
            preferred_days: [],
            avoided_days: [],
            max_hours_per_week: 40,
            max_consecutive_days: 6,
            min_hours_between_shifts: 11,
        };

        try {
            if (editingEmployee) {
                // Update existing employee
                const result = await updateEmployee(editingEmployee.id, {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    position: data.position,
                    role: data.role,
                    contract_hours: data.contract_hours,
                    color: data.color,
                    preferences: {
                        shift_preference: data.shift_preference,
                        preferred_days:
                            editingEmployee.preferences?.preferred_days || [],
                        avoided_days:
                            editingEmployee.preferences?.avoided_days || [],
                        max_hours_per_week:
                            editingEmployee.preferences?.max_hours_per_week ||
                            40,
                        max_consecutive_days:
                            editingEmployee.preferences?.max_consecutive_days ||
                            6,
                        min_hours_between_shifts:
                            editingEmployee.preferences
                                ?.min_hours_between_shifts || 11,
                        notes: editingEmployee.preferences?.notes,
                    },
                });

                if (result.error) {
                    setError(result.error);
                    return;
                }
            } else {
                // Create new employee
                const result = await createEmployee({
                    team_id: currentTeamId,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    position: data.position,
                    role: data.role,
                    contract_type:
                        data.contract_hours >= 160 ? "full_time" : "part_time",
                    contract_hours: data.contract_hours,
                    hours_per_week: Math.round(data.contract_hours / 4),
                });

                if (result.error) {
                    setError(result.error);
                    return;
                }

                // Update preferences for new employee
                if (result.data && data.shift_preference !== "flexible") {
                    await updateEmployee(result.data.id, {
                        preferences: preferences,
                    });
                }
            }

            // Reload employees
            await loadEmployees();
            setDialogOpen(false);
        } catch {
            setError("Wystąpił błąd podczas zapisywania");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (employee: Employee) => {
        const result = await updateEmployee(employee.id, {
            is_active: !employee.is_active,
        });

        if (result.error) {
            setError(result.error);
        } else {
            await loadEmployees();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć tego pracownika?")) return;

        const result = await deleteEmployee(id);
        if (result.error) {
            setError(result.error);
        } else {
            await loadEmployees();
        }
    };

    // Loading state
    if (isLoading && employees.length === 0) {
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
                <Users className="h-16 w-16 text-muted-foreground" />
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
                        Pracownicy
                    </h1>
                    <p className="text-muted-foreground">
                        Zarządzaj zespołem i ich ustawieniami.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pracownika
                </Button>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Team selector (if multiple teams) */}
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

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Szukaj pracownika..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Wszyscy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {employees.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Aktywni
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {employees.filter((e) => e.is_active).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pełny etat
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                employees.filter((e) => e.contract_hours >= 160)
                                    .length
                            }
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Niepełny etat
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                employees.filter((e) => e.contract_hours < 160)
                                    .length
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee list */}
            <div className="space-y-4">
                {/* Empty state */}
                {employees.length === 0 && !isLoading && (
                    <Card className="p-8">
                        <div className="text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">
                                Brak pracowników
                            </h3>
                            <p className="mt-2 text-muted-foreground">
                                Dodaj pierwszego pracownika do zespołu.
                            </p>
                            <Button
                                onClick={() => handleOpenDialog()}
                                className="mt-4"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Dodaj pracownika
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Active employees */}
                {activeEmployees.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeEmployees.map((employee) => {
                            const initials = `${employee.first_name[0]}${employee.last_name[0]}`;
                            const fullName = `${employee.first_name} ${employee.last_name}`;
                            return (
                                <Card key={employee.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage
                                                        src={
                                                            employee.avatar_url
                                                        }
                                                    />
                                                    <AvatarFallback
                                                        style={{
                                                            backgroundColor:
                                                                employee.color,
                                                            color: "#fff",
                                                        }}
                                                    >
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {fullName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {employee.position}
                                                    </p>
                                                    <Badge
                                                        className={cn(
                                                            "text-xs mt-1",
                                                            roleColors[
                                                                employee.role
                                                            ]
                                                        )}
                                                    >
                                                        {
                                                            roleLabels[
                                                                employee.role
                                                            ]
                                                        }
                                                    </Badge>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleOpenDialog(
                                                                employee
                                                            )
                                                        }
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edytuj
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleToggleActive(
                                                                employee
                                                            )
                                                        }
                                                    >
                                                        <UserX className="mr-2 h-4 w-4" />
                                                        Dezaktywuj
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleDelete(
                                                                employee.id
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

                                        <div className="mt-4 space-y-2 text-sm">
                                            {employee.email && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="h-4 w-4" />
                                                    <span>
                                                        {employee.email}
                                                    </span>
                                                </div>
                                            )}
                                            {employee.phone && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="h-4 w-4" />
                                                    <span>
                                                        {employee.phone}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    {employee.contract_hours}h /
                                                    miesiąc
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Inactive employees */}
                {inactiveEmployees.length > 0 && (
                    <>
                        <h3 className="text-lg font-medium text-muted-foreground mt-8">
                            Nieaktywni pracownicy
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {inactiveEmployees.map((employee) => {
                                const initials = `${employee.first_name[0]}${employee.last_name[0]}`;
                                const fullName = `${employee.first_name} ${employee.last_name}`;
                                return (
                                    <Card
                                        key={employee.id}
                                        className="opacity-60"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback className="bg-gray-100 text-gray-500">
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">
                                                            {fullName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {employee.position}
                                                        </p>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs mt-1"
                                                        >
                                                            Nieaktywny
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleToggleActive(
                                                                    employee
                                                                )
                                                            }
                                                        >
                                                            <UserCheck className="mr-2 h-4 w-4" />
                                                            Aktywuj
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    employee.id
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
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Employee form dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEmployee
                                ? "Edytuj pracownika"
                                : "Nowy pracownik"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingEmployee
                                ? "Zmień dane pracownika."
                                : "Dodaj nowego pracownika do zespołu."}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSave)}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    rules={{ required: "Imię jest wymagane" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Imię</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="np. Jan"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    rules={{
                                        required: "Nazwisko jest wymagane",
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nazwisko</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="np. Kowalski"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Email (opcjonalny)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefon</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="tel"
                                                    placeholder="+48 ..."
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="position"
                                    rules={{
                                        required: "Stanowisko jest wymagane",
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Stanowisko</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="np. Kasjer"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rola</FormLabel>
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
                                                    {Object.entries(
                                                        roleLabels
                                                    ).map(([value, label]) => (
                                                        <SelectItem
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="contract_hours"
                                    rules={{
                                        required: "Wymagane",
                                        min: { value: 1, message: "Min. 1h" },
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Godziny / miesiąc
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={200}
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            Number(
                                                                e.target.value
                                                            )
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                160h = pełny etat
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
                                                    {colorOptions.map(
                                                        (color) => (
                                                            <SelectItem
                                                                key={
                                                                    color.value
                                                                }
                                                                value={
                                                                    color.value
                                                                }
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="h-4 w-4 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                color.value,
                                                                        }}
                                                                    />
                                                                    {
                                                                        color.label
                                                                    }
                                                                </div>
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Preferencje zmianowe */}
                            <FormField
                                control={form.control}
                                name="shift_preference"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Preferowane zmiany
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz preferencję" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {shiftPreferenceOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Algorytm przydzieli pracownikowi
                                            zmiany zgodne z preferencjami
                                        </FormDescription>
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
                                    ) : editingEmployee ? (
                                        "Zapisz zmiany"
                                    ) : (
                                        "Dodaj pracownika"
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
