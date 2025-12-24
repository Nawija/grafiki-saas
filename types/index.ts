// ===========================================
// GRAFIKI SAAS - COMPLETE TYPE DEFINITIONS
// ===========================================

// ============ ORGANIZATION ============
export type OrganizationTier = "free" | "pro" | "enterprise";
export type OrganizationRole = "owner" | "admin" | "manager" | "viewer";

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    settings: OrganizationSettings;
    subscription_tier: OrganizationTier;
    max_teams: number;
    max_employees_per_team: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrganizationSettings {
    timezone: string;
    default_currency: string;
    week_start: "monday" | "sunday";
    language: "pl" | "en";
}

export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: OrganizationRole;
    invited_by?: string;
    joined_at: string;
    created_at: string;
    user?: {
        email: string;
        user_metadata?: {
            first_name?: string;
            last_name?: string;
            full_name?: string;
        };
    };
}

export interface OrganizationInvite {
    id: string;
    organization_id: string;
    email: string;
    role: OrganizationRole;
    token: string;
    invited_by?: string;
    expires_at: string;
    accepted_at?: string;
    created_at: string;
}

// ============ EMPLOYEE ============
export type EmployeeRole = "manager" | "employee" | "part-time" | "trainee";
export type ContractType = "full_time" | "part_time" | "contract" | "intern";

export interface Employee {
    id: string;
    team_id: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email?: string; // Optional - only needed for notifications
    phone?: string;
    avatar_url?: string;
    color: string; // Hex color (#3b82f6)
    role: EmployeeRole;
    position: string;
    contract_type: ContractType;
    contract_hours: number; // Monthly hours (e.g., 160)
    hours_per_week: number; // Weekly hours (e.g., 40)
    hourly_rate?: number;
    is_active: boolean;
    notification_preferences: NotificationPreferences;
    preferences?: EmployeePreferences;
    created_at: string;
    updated_at: string;
}

// Computed helper
export function getEmployeeFullName(employee: Employee): string {
    return `${employee.first_name} ${employee.last_name}`;
}

export function getEmployeeInitials(employee: Employee): string {
    return `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
}

export interface NotificationPreferences {
    receive_email: boolean;
    schedule_published: boolean;
    shift_changes: boolean;
    reminders: boolean;
}

// ============ PREFERENCJE ZMIANOWE ============
// Proste preferencje - jakie zmiany pracownik preferuje
export type ShiftPreference =
    | "morning" // Tylko rano (6:00-14:00)
    | "afternoon" // Tylko popołudnie (14:00-22:00)
    | "evening" // Tylko wieczór (18:00-22:00+)
    | "flexible"; // Elastycznie - dowolna zmiana

// Stałe dla godzin zmian
export const SHIFT_PREFERENCE_HOURS: Record<
    ShiftPreference,
    { start: string; end: string; label: string }
> = {
    morning: { start: "06:00", end: "14:00", label: "Rano (6:00-14:00)" },
    afternoon: {
        start: "14:00",
        end: "22:00",
        label: "Popołudnie (14:00-22:00)",
    },
    evening: { start: "18:00", end: "22:00", label: "Wieczór (18:00-22:00)" },
    flexible: { start: "08:00", end: "16:00", label: "Elastycznie" },
};

export interface EmployeePreferences {
    // Główna preferencja zmianowa
    shift_preference: ShiftPreference;
    // Dodatkowe opcje
    preferred_days: number[]; // 0-6 (niedziela=0, pon=1...sob=6) - preferowane dni
    avoided_days: number[]; // Dni których unika (np. 0,6 = weekendy)
    max_hours_per_week: number; // Max godzin tygodniowo (default 40)
    max_consecutive_days: number; // Max dni z rzędu (default 6)
    min_hours_between_shifts: number; // Min odpoczynek (default 11h - KP)
    notes?: string; // Dodatkowe notatki
}

// Domyślne preferencje dla nowych pracowników
export const DEFAULT_EMPLOYEE_PREFERENCES: EmployeePreferences = {
    shift_preference: "flexible",
    preferred_days: [],
    avoided_days: [],
    max_hours_per_week: 40,
    max_consecutive_days: 6,
    min_hours_between_shifts: 11,
};

// ============ TEAM ============
export interface Team {
    id: string;
    organization_id?: string;
    name: string;
    description?: string;
    owner_id: string;
    settings: TeamSettings;
    created_at: string;
    updated_at: string;
}

export interface TeamSettings {
    default_shift_duration: number; // in minutes
    min_shift_duration: number;
    max_shift_duration: number;
    break_duration: number; // default break in minutes
    week_starts_on: 0 | 1; // 0 = Sunday, 1 = Monday
    working_days: number[]; // Default working days
    opening_hours: {
        [key: number]: { start: string; end: string } | null; // 0-6
    };
    respect_polish_trading_sundays: boolean;
    auto_calculate_breaks: boolean;
    overtime_threshold_daily: number; // hours
    overtime_threshold_weekly: number; // hours
}

// ============ SHIFT ============
// These match the database enum shift_type
export type ShiftType = "regular" | "overtime" | "training" | "on_call";

export type ShiftStatus =
    | "scheduled"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled";

export interface Shift {
    id: string;
    team_id: string;
    employee_id: string;
    date: string; // ISO date string
    start_time: string; // "HH:mm"
    end_time: string; // "HH:mm"
    break_duration: number; // break in minutes
    type: ShiftType;
    status: ShiftStatus;
    position?: string; // Specific position/station
    notes?: string;
    is_overtime: boolean;
    is_published?: boolean;
    published_at?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface ShiftWithEmployee extends Shift {
    employee: Employee;
}

// ============ SHIFT TEMPLATES ============
export interface ShiftTemplate {
    id: string;
    team_id: string;
    name: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    color: string;
    is_default: boolean;
    capacity: number; // Liczba osób na zmianie (domyślnie 1)
    created_at: string;
    updated_at?: string;
}

// ============ ABSENCES ============
export type AbsenceType =
    | "vacation" // Urlop wypoczynkowy
    | "vacation_on_demand" // Urlop na żądanie
    | "sick_leave" // L4 - Zwolnienie lekarskie
    | "uz" // UZ - Urlop okolicznościowy
    | "maternity" // Urlop macierzyński
    | "paternity" // Urlop ojcowski
    | "childcare" // Urlop wychowawczy
    | "unpaid" // Urlop bezpłatny
    | "training" // Szkolenie
    | "delegation" // Delegacja
    | "blood_donation" // Honorowe krwiodawstwo
    | "military" // Ćwiczenia wojskowe
    | "other"; // Inne

export type AbsenceStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Absence {
    id: string;
    team_id: string;
    employee_id: string;
    type: AbsenceType;
    start_date: string;
    end_date: string;
    status: AbsenceStatus;
    reason?: string;
    approved_by?: string;
    approved_at?: string;
    documents_url?: string[];
    created_at: string;
    updated_at: string;
}

export interface AbsenceWithEmployee extends Absence {
    employee: Employee;
}

// ============ SCHEDULE ============
export type ScheduleViewType = "weekly" | "monthly";

export interface ScheduleDay {
    date: string;
    dayOfWeek: number; // 0-6
    isToday: boolean;
    isWeekend: boolean;
    isTradingSunday: boolean;
    isNonTradingSunday: boolean;
    isHoliday: boolean;
    holidayName?: string;
    shifts: ShiftWithEmployee[];
    absences: AbsenceWithEmployee[];
}

export interface ScheduleWeek {
    weekNumber: number;
    startDate: string;
    endDate: string;
    days: ScheduleDay[];
}

export interface ScheduleFilters {
    view: ScheduleViewType;
    startDate: string;
    endDate: string;
    employeeIds?: string[];
    shiftTypes?: ShiftType[];
    positions?: string[];
}

// ============ ALGORITHM CONFIG ============
export interface ScheduleGenerationConfig {
    team_id: string;
    start_date: string;
    end_date: string;

    // Staffing requirements per day
    staffing_requirements: {
        [dayOfWeek: number]: {
            min_employees: number;
            max_employees: number;
            required_positions?: { position: string; count: number }[];
        };
    };

    // Distribution settings
    distribute_hours_evenly: boolean;
    respect_preferences: boolean;
    avoid_consecutive_weekends: boolean;
    max_weekends_per_month: number;

    // Constraints
    min_rest_between_shifts: number; // hours (default 11)
    max_consecutive_work_days: number;

    // Priority settings
    seniority_priority: boolean;
    fill_preferred_first: boolean;
}

export interface ScheduleGenerationResult {
    success: boolean;
    shifts: Omit<Shift, "id" | "created_at" | "updated_at">[];
    warnings: string[];
    unfilledSlots: { date: string; reason: string }[];
    statistics: {
        totalShifts: number;
        hoursPerEmployee: { [employeeId: string]: number };
        weekendShiftsPerEmployee: { [employeeId: string]: number };
    };
}

// ============ POLISH HOLIDAYS ============
export interface PolishHoliday {
    date: string;
    name: string;
    type: "public" | "trading_sunday" | "non_trading_sunday";
}

// ============ NOTIFICATIONS ============
export type NotificationType =
    | "shift_assigned"
    | "shift_changed"
    | "shift_cancelled"
    | "absence_requested"
    | "absence_approved"
    | "absence_rejected"
    | "schedule_published"
    | "reminder";

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

// ============ EXPORT ============
export interface ExportConfig {
    format: "pdf" | "excel" | "csv";
    view: ScheduleViewType;
    start_date: string;
    end_date: string;
    include_employees: string[] | "all";
    include_absences: boolean;
    include_statistics: boolean;
    paper_size?: "A4" | "A3" | "letter";
    orientation?: "portrait" | "landscape";
}

// ============ UI STATE ============
export interface DragItem {
    id: string;
    type: "shift" | "employee";
    data: Shift | Employee;
}

export interface DropTarget {
    date: string;
    employeeId?: string;
    timeSlot?: string;
}

// ============ API RESPONSES ============
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    status: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}
