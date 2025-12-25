export * from "./database";

// Typy dla API date.nager
export interface PublicHoliday {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
    fixed: boolean;
    global: boolean;
    counties: string[] | null;
    launchYear: number | null;
    types: string[];
}

// Typy dla kalkulatora godzin
export interface WorkingHoursResult {
    totalWorkingDays: number;
    totalWorkingHours: number;
    holidays: PublicHoliday[];
    weekends: number;
}

export interface EmploymentConfig {
    type: "full" | "half" | "custom";
    customHours?: number;
}

// Typy dla grafiku
export interface ShiftWithEmployee extends Shift {
    employee: Employee;
}

export interface ScheduleWithShifts extends Schedule {
    shifts: ShiftWithEmployee[];
}

// Typy dla organizacji z członkami
export interface OrganizationWithMembers extends Organization {
    members: OrganizationMember[];
}

// Re-eksport z database
import type {
    Employee,
    Shift,
    Schedule,
    Organization,
    OrganizationMember,
} from "./database";
export type { Employee, Shift, Schedule, Organization, OrganizationMember };

// Organizacja z rolą użytkownika
export interface OrganizationWithRole {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    is_owner: boolean;
    created_at: string;
}
