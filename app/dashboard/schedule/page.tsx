"use client";

import { useState, useEffect, useCallback } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { MonthlyScheduleView } from "@/components/schedule/monthly-schedule-view";
import { ShiftFormDialog } from "@/components/schedule/shift-form-dialog";
import { SimpleGenerateDialog } from "@/components/schedule/simple-generate-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { exportScheduleToPdf, exportScheduleToExcel } from "@/lib/export";
import { AlertCircle, Loader2, CalendarDays } from "lucide-react";
import type {
    Shift,
    Employee,
    ShiftTemplate,
    Team,
    TeamSettings,
} from "@/types";
import {
    getShiftsByDateRange,
    createShift,
    createShifts,
    updateShift,
    deleteShift,
} from "@/lib/actions/shift";
import { getEmployeesByTeam } from "@/lib/actions/employee";
import { getShiftTemplatesByTeam } from "@/lib/actions/shift-template";
import { getTeamsByOrganization, getTeam } from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedShift } from "@/lib/schedule-generator";

// Helper to normalize team settings from DB (handles string keys from JSON)
function normalizeTeamSettings(
    settings: TeamSettings | null | undefined
): TeamSettings {
    const defaultSettings: TeamSettings = {
        default_shift_duration: 480,
        min_shift_duration: 240,
        max_shift_duration: 720,
        break_duration: 30,
        week_starts_on: 1,
        working_days: [1, 2, 3, 4, 5],
        opening_hours: {
            0: null,
            1: { start: "08:00", end: "20:00" },
            2: { start: "08:00", end: "20:00" },
            3: { start: "08:00", end: "20:00" },
            4: { start: "08:00", end: "20:00" },
            5: { start: "08:00", end: "20:00" },
            6: null,
        },
        respect_polish_trading_sundays: true,
        auto_calculate_breaks: true,
        overtime_threshold_daily: 8,
        overtime_threshold_weekly: 40,
    };

    if (!settings) return defaultSettings;

    // Normalize opening_hours - convert string keys to numbers
    const normalizedOpeningHours: TeamSettings["opening_hours"] = {};
    if (settings.opening_hours) {
        for (let i = 0; i <= 6; i++) {
            // Try both number and string keys (JSON from DB uses strings)
            const hours =
                (
                    settings.opening_hours as Record<
                        string | number,
                        { start: string; end: string } | null
                    >
                )[i] ??
                (
                    settings.opening_hours as Record<
                        string | number,
                        { start: string; end: string } | null
                    >
                )[String(i)];
            normalizedOpeningHours[i] = hours ?? null;
        }
    } else {
        // Use defaults
        Object.assign(normalizedOpeningHours, defaultSettings.opening_hours);
    }

    // Calculate working_days from opening_hours if not set
    let workingDays = settings.working_days;
    if (!workingDays || workingDays.length === 0) {
        workingDays = [];
        for (let i = 0; i <= 6; i++) {
            if (normalizedOpeningHours[i] !== null) {
                workingDays.push(i);
            }
        }
    }

    return {
        ...defaultSettings,
        ...settings,
        opening_hours: normalizedOpeningHours,
        working_days: workingDays,
    };
}

export default function SchedulePage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Current displayed date range - start with current month
    const [displayedDateRange, setDisplayedDateRange] = useState<{
        start: string;
        end: string;
    }>(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return {
            start: format(monthStart, "yyyy-MM-dd"),
            end: format(monthEnd, "yyyy-MM-dd"),
        };
    });

    // Dialog states
    const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [defaultShiftDate, setDefaultShiftDate] = useState<
        string | undefined
    >();

    // Load initial data (teams, user)
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

    // Load shifts for displayed date range
    const loadShifts = useCallback(
        async (startDate: string, endDate: string) => {
            if (!currentTeamId) return;

            console.log(
                `📅 Ładuję zmiany dla zakresu: ${startDate} - ${endDate}`
            );

            try {
                const shiftsResult = await getShiftsByDateRange(
                    currentTeamId,
                    startDate,
                    endDate
                );

                if (shiftsResult.error) {
                    console.error(
                        "❌ Błąd ładowania zmian:",
                        shiftsResult.error
                    );
                    return;
                }

                const loadedShifts =
                    shiftsResult.data?.map((s) => ({
                        id: s.id,
                        team_id: s.team_id,
                        employee_id: s.employee_id,
                        date: s.date,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        break_duration: s.break_duration,
                        type: s.type,
                        status: s.status,
                        position: s.position,
                        notes: s.notes,
                        is_overtime: s.is_overtime,
                        is_published: s.is_published,
                        published_at: s.published_at,
                        created_by: s.created_by,
                        created_at: s.created_at,
                        updated_at: s.updated_at,
                    })) || [];

                console.log(`✅ Załadowano ${loadedShifts.length} zmian`);
                setShifts(loadedShifts);
            } catch (err) {
                console.error("❌ Exception loading shifts:", err);
            }
        },
        [currentTeamId]
    );

    // Load team data (employees, templates, settings)
    const loadTeamData = useCallback(async () => {
        if (!currentTeamId) return;

        setIsLoading(true);
        setError(null);

        try {
            const [employeesResult, templatesResult, teamResult] =
                await Promise.all([
                    getEmployeesByTeam(currentTeamId, false),
                    getShiftTemplatesByTeam(currentTeamId),
                    getTeam(currentTeamId),
                ]);

            if (employeesResult.error) {
                setError(employeesResult.error);
                return;
            }

            // Normalize and set team settings
            const normalizedSettings = normalizeTeamSettings(
                teamResult.data?.settings
            );
            console.log("📋 Team settings loaded:", normalizedSettings);
            setTeamSettings(normalizedSettings);

            setEmployees(employeesResult.data || []);
            setTemplates(templatesResult.data || []);

            // Load shifts for current displayed range
            await loadShifts(displayedDateRange.start, displayedDateRange.end);
        } catch {
            setError("Wystąpił błąd podczas ładowania danych");
        } finally {
            setIsLoading(false);
        }
    }, [
        currentTeamId,
        displayedDateRange.start,
        displayedDateRange.end,
        loadShifts,
    ]);

    // Reload when team changes
    useEffect(() => {
        if (currentTeamId) {
            loadTeamData();
        }
    }, [currentTeamId, loadTeamData]);

    // Handle date range change from ScheduleGrid
    const handleDateRangeChange = useCallback(
        (start: Date, end: Date) => {
            const startStr = format(start, "yyyy-MM-dd");
            const endStr = format(end, "yyyy-MM-dd");

            console.log(`📆 Date range changed: ${startStr} - ${endStr}`);

            setDisplayedDateRange({ start: startStr, end: endStr });
            loadShifts(startStr, endStr);
        },
        [loadShifts]
    );

    // Shift handlers
    const handleAddShift = useCallback((date: string) => {
        setDefaultShiftDate(date);
        setEditingShift(null);
        setShiftDialogOpen(true);
    }, []);

    const handleEditShift = useCallback((shift: Shift) => {
        setEditingShift(shift);
        setDefaultShiftDate(undefined);
        setShiftDialogOpen(true);
    }, []);

    const handleDeleteShift = useCallback(async (shiftId: string) => {
        const result = await deleteShift(shiftId);
        if (result.error) {
            setError(result.error);
        } else {
            setShifts((prev) => prev.filter((s) => s.id !== shiftId));
        }
    }, []);

    // Create shift from template (drag & drop)
    const handleCreateShiftFromTemplate = useCallback(
        async (data: {
            employee_id: string;
            date: string;
            start_time: string;
            end_time: string;
            break_duration: number;
        }) => {
            if (!currentTeamId) return;

            setError(null);

            try {
                const result = await createShift({
                    team_id: currentTeamId,
                    employee_id: data.employee_id,
                    date: data.date,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    break_duration: data.break_duration,
                    type: "regular",
                });

                if (result.error) {
                    setError(result.error);
                    return;
                }

                if (result.data) {
                    setShifts((prev) => [...prev, result.data as Shift]);
                }
            } catch {
                setError("Wystąpił błąd podczas tworzenia zmiany");
            }
        },
        [currentTeamId]
    );

    const handleSaveShift = useCallback(
        async (shiftData: Partial<Shift>) => {
            if (!currentTeamId || !userId) return;

            setError(null);

            try {
                if (shiftData.id) {
                    const result = await updateShift(shiftData.id, {
                        employee_id: shiftData.employee_id,
                        date: shiftData.date,
                        start_time: shiftData.start_time,
                        end_time: shiftData.end_time,
                        break_duration: shiftData.break_duration,
                        type: shiftData.type,
                        position: shiftData.position,
                        notes: shiftData.notes,
                        is_overtime: shiftData.is_overtime,
                    });

                    if (result.error) {
                        setError(result.error);
                        return;
                    }

                    await loadShifts(
                        displayedDateRange.start,
                        displayedDateRange.end
                    );
                } else {
                    const result = await createShift({
                        team_id: currentTeamId,
                        employee_id: shiftData.employee_id!,
                        date: shiftData.date!,
                        start_time: shiftData.start_time!,
                        end_time: shiftData.end_time!,
                        break_duration: shiftData.break_duration || 30,
                        type: shiftData.type || "regular",
                        position: shiftData.position,
                        notes: shiftData.notes,
                    });

                    if (result.error) {
                        setError(result.error);
                        return;
                    }

                    if (result.data) {
                        setShifts((prev) => [...prev, result.data as Shift]);
                    }
                }

                setShiftDialogOpen(false);
            } catch {
                setError("Wystąpił błąd podczas zapisywania zmiany");
            }
        },
        [currentTeamId, userId, displayedDateRange, loadShifts]
    );

    // Export handlers
    const handleExport = useCallback(
        (formatType: "pdf" | "excel") => {
            if (formatType === "pdf") {
                exportScheduleToPdf(shifts, employees);
            } else {
                exportScheduleToExcel(shifts, employees);
            }
        },
        [shifts, employees]
    );

    // Generate schedule handler
    const handleGenerateSchedule = useCallback(() => {
        setGenerateDialogOpen(true);
    }, []);

    const handleGenerateConfirm = useCallback(
        async (generatedShifts: GeneratedShift[]) => {
            if (!currentTeamId) {
                console.error("❌ Brak currentTeamId!");
                return;
            }

            setError(null);
            console.log(`📤 Zapisuję ${generatedShifts.length} zmian...`);

            try {
                const shiftsToCreate = generatedShifts.map((s) => ({
                    team_id: currentTeamId,
                    employee_id: s.employee_id,
                    date: s.date,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    break_duration: s.break_duration,
                    type: s.type,
                }));

                console.log(
                    "📋 First 3 shifts to create:",
                    shiftsToCreate.slice(0, 3)
                );

                const result = await createShifts(shiftsToCreate);

                if (result.error) {
                    console.error("❌ Błąd zapisu:", result.error);
                    setError(result.error);
                    return;
                }

                console.log(`✅ Zapisano ${result.count} zmian do bazy`);

                // Get the month from generated shifts and load that range
                if (generatedShifts.length > 0) {
                    const firstDate = new Date(generatedShifts[0].date);
                    const monthStart = startOfMonth(firstDate);
                    const monthEnd = endOfMonth(firstDate);
                    const startStr = format(monthStart, "yyyy-MM-dd");
                    const endStr = format(monthEnd, "yyyy-MM-dd");

                    console.log(
                        `📅 Przeładowuję zmiany dla miesiąca: ${startStr} - ${endStr}`
                    );
                    setDisplayedDateRange({ start: startStr, end: endStr });
                    await loadShifts(startStr, endStr);
                }
            } catch (err) {
                console.error("❌ Exception:", err);
                setError("Wystąpił błąd podczas zapisywania grafiku");
            }

            setGenerateDialogOpen(false);
        },
        [currentTeamId, loadShifts]
    );

    // Handle shifts change from drag & drop
    const handleShiftsChange = useCallback((newShifts: Shift[]) => {
        setShifts(newShifts);
    }, []);

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
                <CalendarDays className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Brak zespołów</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Nie masz jeszcze żadnego zespołu. Przejdź przez onboarding,
                    aby utworzyć pierwszy zespół.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Grafik pracy
                    </h1>
                    <p className="text-muted-foreground">
                        Zarządzaj zmianami pracowników. Przeciągnij i upuść, aby
                        zmienić przypisania.
                    </p>
                </div>

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
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Monthly schedule view */}
            <MonthlyScheduleView
                shifts={shifts}
                employees={employees}
                templates={templates}
                onCreateShift={handleCreateShiftFromTemplate}
                onDeleteShift={handleDeleteShift}
                onDateRangeChange={handleDateRangeChange}
                onGenerateSchedule={handleGenerateSchedule}
                onExportPdf={() => handleExport("pdf")}
                onExportExcel={() => handleExport("excel")}
            />

            {/* Shift form dialog */}
            <ShiftFormDialog
                open={shiftDialogOpen}
                onOpenChange={setShiftDialogOpen}
                shift={editingShift}
                employees={employees}
                templates={templates}
                defaultDate={defaultShiftDate}
                onSave={handleSaveShift}
            />

            {/* Generate schedule dialog */}
            {teamSettings && (
                <SimpleGenerateDialog
                    open={generateDialogOpen}
                    onOpenChange={setGenerateDialogOpen}
                    employees={employees}
                    templates={templates}
                    teamId={currentTeamId || ""}
                    settings={teamSettings}
                    onGenerate={handleGenerateConfirm}
                />
            )}
        </div>
    );
}
