export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            organizations: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    owner_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    description?: string | null;
                    owner_id: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    description?: string | null;
                    owner_id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            organization_members: {
                Row: {
                    id: string;
                    organization_id: string;
                    user_id: string;
                    joined_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    user_id: string;
                    joined_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    user_id?: string;
                    joined_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "organization_members_organization_id_fkey";
                        columns: ["organization_id"];
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "organization_members_user_id_fkey";
                        columns: ["user_id"];
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            employees: {
                Row: {
                    id: string;
                    organization_id: string;
                    first_name: string;
                    last_name: string;
                    email: string | null;
                    phone: string | null;
                    employment_type: "full" | "half" | "custom";
                    custom_hours: number | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    first_name: string;
                    last_name: string;
                    email?: string | null;
                    phone?: string | null;
                    employment_type?: "full" | "half" | "custom";
                    custom_hours?: number | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    first_name?: string;
                    last_name?: string;
                    email?: string | null;
                    phone?: string | null;
                    employment_type?: "full" | "half" | "custom";
                    custom_hours?: number | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "employees_organization_id_fkey";
                        columns: ["organization_id"];
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            schedules: {
                Row: {
                    id: string;
                    organization_id: string;
                    year: number;
                    month: number;
                    is_published: boolean;
                    published_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    year: number;
                    month: number;
                    is_published?: boolean;
                    published_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    year?: number;
                    month?: number;
                    is_published?: boolean;
                    published_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "schedules_organization_id_fkey";
                        columns: ["organization_id"];
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            shifts: {
                Row: {
                    id: string;
                    schedule_id: string;
                    employee_id: string;
                    date: string;
                    start_time: string;
                    end_time: string;
                    break_minutes: number;
                    notes: string | null;
                    color: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    schedule_id: string;
                    employee_id: string;
                    date: string;
                    start_time: string;
                    end_time: string;
                    break_minutes?: number;
                    notes?: string | null;
                    color?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    schedule_id?: string;
                    employee_id?: string;
                    date?: string;
                    start_time?: string;
                    end_time?: string;
                    break_minutes?: number;
                    notes?: string | null;
                    color?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "shifts_schedule_id_fkey";
                        columns: ["schedule_id"];
                        referencedRelation: "schedules";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "shifts_employee_id_fkey";
                        columns: ["employee_id"];
                        referencedRelation: "employees";
                        referencedColumns: ["id"];
                    }
                ];
            };
            holidays_cache: {
                Row: {
                    id: string;
                    year: number;
                    country_code: string;
                    holidays: Json;
                    fetched_at: string;
                };
                Insert: {
                    id?: string;
                    year: number;
                    country_code: string;
                    holidays: Json;
                    fetched_at?: string;
                };
                Update: {
                    id?: string;
                    year?: number;
                    country_code?: string;
                    holidays?: Json;
                    fetched_at?: string;
                };
                Relationships: [];
            };
            shift_templates: {
                Row: {
                    id: string;
                    organization_id: string;
                    name: string;
                    start_time: string;
                    end_time: string;
                    break_minutes: number;
                    color: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    name: string;
                    start_time: string;
                    end_time: string;
                    break_minutes?: number;
                    color?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    name?: string;
                    start_time?: string;
                    end_time?: string;
                    break_minutes?: number;
                    color?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "shift_templates_organization_id_fkey";
                        columns: ["organization_id"];
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
            verification_codes: {
                Row: {
                    id: string;
                    email: string;
                    code: string;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    code: string;
                    expires_at: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    code?: string;
                    expires_at?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            organization_settings: {
                Row: {
                    id: string;
                    organization_id: string;
                    trading_sundays_mode: "all" | "none" | "custom";
                    custom_trading_sundays: string[] | null;
                    default_shift_duration: number;
                    default_break_minutes: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    trading_sundays_mode?: "all" | "none" | "custom";
                    custom_trading_sundays?: string[] | null;
                    default_shift_duration?: number;
                    default_break_minutes?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    trading_sundays_mode?: "all" | "none" | "custom";
                    custom_trading_sundays?: string[] | null;
                    default_shift_duration?: number;
                    default_break_minutes?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "organization_settings_organization_id_fkey";
                        columns: ["organization_id"];
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            employment_type: "full" | "half" | "custom";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}

// Typy pomocnicze
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"];

// Aliasy dla wygody
export type Profile = Tables<"profiles">;
export type Organization = Tables<"organizations">;
export type OrganizationMember = Tables<"organization_members">;
export type Employee = Tables<"employees">;
export type Schedule = Tables<"schedules">;
export type Shift = Tables<"shifts">;
export type ShiftTemplate = Tables<"shift_templates">;
export type OrganizationSettings = Tables<"organization_settings">;
