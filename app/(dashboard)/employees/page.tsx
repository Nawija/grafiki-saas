import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeesList } from "@/components/employees/employees-list";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MembershipWithOrg {
    organization_id: string;
    organizations: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export default async function EmployeesPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string; action?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/logowanie");
    }

    // Pobierz organizacje użytkownika
    const { data: memberships } = await supabase
        .from("organization_members")
        .select(
            `
      organization_id,
      organizations (
        id,
        name,
        slug
      )
    `
        )
        .eq("user_id", user.id);

    const typedMemberships = memberships as MembershipWithOrg[] | null;
    const organizations =
        typedMemberships?.map((m) => m.organizations).filter(Boolean) || [];
    const currentOrg =
        organizations.find((o) => o?.slug === params.org) || organizations[0];

    if (!currentOrg) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Pracownicy
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Utwórz organizację, aby zarządzać pracownikami
                    </p>
                </div>
                <Button asChild>
                    <a href="/settings?tab=organizations">
                        <Plus className="mr-2 h-4 w-4" />
                        Utwórz organizację
                    </a>
                </Button>
            </div>
        );
    }

    // Pobierz pracowników
    const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("last_name", { ascending: true });

    const showAddDialog = params.action === "new";

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        Pracownicy
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                        Zarządzaj pracownikami w organizacji {currentOrg.name}
                    </p>
                </div>
                <AddEmployeeDialog
                    organizationId={currentOrg.id}
                    defaultOpen={showAddDialog}
                />
            </div>

            <EmployeesList
                employees={employees || []}
                organizationId={currentOrg.id}
            />
        </div>
    );
}
