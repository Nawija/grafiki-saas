"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AbsenceFormDialog } from "@/components/absences/absence-form-dialog";
import {
    Plus,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    Clock,
    Calendar as CalendarIcon,
    Plane,
    Stethoscope,
    GraduationCap,
    Baby,
    FileQuestion,
    Loader2,
    AlertCircle,
    Inbox,
} from "lucide-react";
import type {
    Absence,
    AbsenceType,
    AbsenceStatus,
    Employee,
    AbsenceWithEmployee,
    Team,
} from "@/types";
import {
    getAbsencesByTeam,
    createAbsence,
    approveAbsence,
    rejectAbsence,
    deleteAbsence,
} from "@/lib/actions/absence";
import { getEmployeesByTeam } from "@/lib/actions/employee";
import { getTeamsByOrganization } from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/client";
import { countWorkingDays } from "@/lib/polish-holidays";

// Absence type configurations
const absenceTypeConfig: Record<
    AbsenceType,
    { label: string; icon: React.ElementType; color: string }
> = {
    vacation: {
        label: "Urlop wypoczynkowy",
        icon: Plane,
        color: "bg-blue-100 text-blue-700",
    },
    vacation_on_demand: {
        label: "Urlop na żądanie",
        icon: Plane,
        color: "bg-blue-100 text-blue-700",
    },
    sick_leave: {
        label: "Zwolnienie lekarskie (L4)",
        icon: Stethoscope,
        color: "bg-red-100 text-red-700",
    },
    uz: {
        label: "Urlop okolicznościowy (UZ)",
        icon: CalendarIcon,
        color: "bg-purple-100 text-purple-700",
    },
    maternity: {
        label: "Urlop macierzyński",
        icon: Baby,
        color: "bg-pink-100 text-pink-700",
    },
    paternity: {
        label: "Urlop ojcowski",
        icon: Baby,
        color: "bg-cyan-100 text-cyan-700",
    },
    childcare: {
        label: "Urlop wychowawczy",
        icon: Baby,
        color: "bg-orange-100 text-orange-700",
    },
    unpaid: {
        label: "Urlop bezpłatny",
        icon: CalendarIcon,
        color: "bg-gray-100 text-gray-700",
    },
    training: {
        label: "Szkolenie",
        icon: GraduationCap,
        color: "bg-green-100 text-green-700",
    },
    delegation: {
        label: "Delegacja",
        icon: Plane,
        color: "bg-amber-100 text-amber-700",
    },
    blood_donation: {
        label: "Krwiodawstwo",
        icon: Stethoscope,
        color: "bg-red-100 text-red-700",
    },
    military: {
        label: "Ćwiczenia wojskowe",
        icon: CalendarIcon,
        color: "bg-slate-100 text-slate-700",
    },
    other: {
        label: "Inne",
        icon: FileQuestion,
        color: "bg-gray-100 text-gray-700",
    },
};

const statusConfig: Record<
    AbsenceStatus,
    { label: string; color: string; icon: React.ElementType }
> = {
    pending: {
        label: "Oczekujące",
        color: "bg-amber-100 text-amber-700",
        icon: Clock,
    },
    approved: {
        label: "Zatwierdzone",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
    },
    rejected: {
        label: "Odrzucone",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
    },
    cancelled: {
        label: "Anulowane",
        color: "bg-gray-100 text-gray-700",
        icon: XCircle,
    },
};

interface AbsenceCardProps {
    absence: AbsenceWithEmployee;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
}

function AbsenceCard({
    absence,
    onApprove,
    onReject,
    onDelete,
}: AbsenceCardProps) {
    const typeConfig = absenceTypeConfig[absence.type];
    const status = statusConfig[absence.status];
    const StatusIcon = status.icon;
    const TypeIcon = typeConfig.icon;
    const employee = absence.employee;

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                            style={{
                                backgroundColor: employee?.color || "#6b7280",
                            }}
                        >
                            {employee
                                ? `${employee.first_name[0]}${employee.last_name[0]}`
                                : "?"}
                        </div>
                        <div>
                            <p className="font-medium">
                                {employee
                                    ? `${employee.first_name} ${employee.last_name}`
                                    : "Nieznany pracownik"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    className={cn("text-xs", typeConfig.color)}
                                >
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {typeConfig.label}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(absence.start_date), "d MMM", {
                                    locale: pl,
                                })}
                                {absence.start_date !== absence.end_date && (
                                    <>
                                        {" — "}
                                        {format(
                                            new Date(absence.end_date),
                                            "d MMM yyyy",
                                            { locale: pl }
                                        )}
                                    </>
                                )}
                                {absence.start_date === absence.end_date && (
                                    <>
                                        {" "}
                                        {format(
                                            new Date(absence.start_date),
                                            "yyyy",
                                            { locale: pl }
                                        )}
                                    </>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {countWorkingDays(
                                    new Date(absence.start_date),
                                    new Date(absence.end_date)
                                )}{" "}
                                dni roboczych
                            </p>
                            {absence.reason && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                    &quot;{absence.reason}&quot;
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", status.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                        </Badge>

                        {absence.status === "pending" && (
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
                                        onClick={() => onApprove(absence.id)}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                        Zatwierdź
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => onReject(absence.id)}
                                    >
                                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                        Odrzuć
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {(absence.status === "pending" ||
                            absence.status === "rejected") && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => onDelete(absence.id)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AbsencesPage() {
    const [absences, setAbsences] = useState<AbsenceWithEmployee[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">(
        "pending"
    );

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

                setUserId(user.id);

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

    // Load absences and employees when team changes
    const loadTeamData = useCallback(async () => {
        if (!currentTeamId) return;

        setIsLoading(true);
        setError(null);

        try {
            const [absencesResult, employeesResult] = await Promise.all([
                getAbsencesByTeam(currentTeamId),
                getEmployeesByTeam(currentTeamId, false),
            ]);

            if (absencesResult.error) {
                setError(absencesResult.error);
                return;
            }
            if (employeesResult.error) {
                setError(employeesResult.error);
                return;
            }

            setAbsences(absencesResult.data || []);
            setEmployees(employeesResult.data || []);
        } catch {
            setError("Wystąpił błąd podczas ładowania danych");
        } finally {
            setIsLoading(false);
        }
    }, [currentTeamId]);

    useEffect(() => {
        if (currentTeamId) {
            loadTeamData();
        }
    }, [currentTeamId, loadTeamData]);

    // Filter absences by tab
    const filteredAbsences = absences.filter((absence) => {
        if (activeTab === "pending") return absence.status === "pending";
        if (activeTab === "approved") return absence.status === "approved";
        return true;
    });

    // Stats
    const pendingCount = absences.filter((a) => a.status === "pending").length;
    const approvedCount = absences.filter(
        (a) => a.status === "approved"
    ).length;
    const totalDays = absences
        .filter((a) => a.status === "approved")
        .reduce(
            (sum, a) =>
                sum +
                countWorkingDays(new Date(a.start_date), new Date(a.end_date)),
            0
        );

    // Handlers
    const handleApprove = async (id: string) => {
        if (!userId) return;
        const result = await approveAbsence(id, userId);
        if (result.error) {
            setError(result.error);
        } else {
            await loadTeamData();
        }
    };

    const handleReject = async (id: string) => {
        if (!userId) return;
        const result = await rejectAbsence(id, userId);
        if (result.error) {
            setError(result.error);
        } else {
            await loadTeamData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć ten wniosek?")) return;

        const result = await deleteAbsence(id);
        if (result.error) {
            setError(result.error);
        } else {
            await loadTeamData();
        }
    };

    const handleCreateAbsence = async (data: {
        employee_id: string;
        type: AbsenceType;
        start_date: string;
        end_date: string;
        reason?: string;
    }) => {
        if (!currentTeamId) return;

        const result = await createAbsence({
            team_id: currentTeamId,
            ...data,
        });

        if (result.error) {
            setError(result.error);
        } else {
            setDialogOpen(false);
            await loadTeamData();
        }
    };

    // Loading state
    if (isLoading && absences.length === 0) {
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
                <Inbox className="h-16 w-16 text-muted-foreground" />
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
                        Nieobecności
                    </h1>
                    <p className="text-muted-foreground">
                        Zarządzaj urlopami i nieobecnościami zespołu.
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj nieobecność
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

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Oczekujące
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {pendingCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Zatwierdzone
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {approvedCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Dni nieobecności
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDays}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
                <TabsList>
                    <TabsTrigger value="pending">
                        Oczekujące ({pendingCount})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        Zatwierdzone ({approvedCount})
                    </TabsTrigger>
                    <TabsTrigger value="all">Wszystkie</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {filteredAbsences.length === 0 ? (
                        <Card className="p-8">
                            <div className="text-center">
                                <Inbox className="h-12 w-12 mx-auto text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">
                                    Brak nieobecności
                                </h3>
                                <p className="mt-2 text-muted-foreground">
                                    {activeTab === "pending"
                                        ? "Nie ma żadnych oczekujących wniosków."
                                        : activeTab === "approved"
                                        ? "Nie ma żadnych zatwierdzonych nieobecności."
                                        : "Dodaj pierwszą nieobecność."}
                                </p>
                                {activeTab === "all" && (
                                    <Button
                                        onClick={() => setDialogOpen(true)}
                                        className="mt-4"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Dodaj nieobecność
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredAbsences.map((absence) => (
                                <AbsenceCard
                                    key={absence.id}
                                    absence={absence}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Add Absence Dialog */}
            <AbsenceFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                employees={employees}
                onSave={async (data) => {
                    if (!currentTeamId) return;
                    await handleCreateAbsence({
                        employee_id: data.employee_id!,
                        type: data.type!,
                        start_date: data.start_date!,
                        end_date: data.end_date!,
                        reason: data.reason,
                    });
                }}
            />
        </div>
    );
}
