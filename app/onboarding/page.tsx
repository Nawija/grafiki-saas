import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user already has an organization WITH a team
    // Only redirect if they completed full onboarding (org + team)
    const { data: existingOrg } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    let existingOrgId: string | undefined;

    if (existingOrg) {
        // Check if organization has at least one team
        const { data: teams } = await supabase
            .from("teams")
            .select("id")
            .eq("organization_id", existingOrg.organization_id)
            .limit(1);

        if (teams && teams.length > 0) {
            // User already completed onboarding (has org + team)
            redirect("/dashboard");
        }

        // Organization exists but no team - continue from step 2
        existingOrgId = existingOrg.organization_id;
    }

    return (
        <OnboardingWizard
            userId={user.id}
            userEmail={user.email || ""}
            existingOrganizationId={existingOrgId}
        />
    );
}
