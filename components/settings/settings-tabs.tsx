"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile, OrganizationWithRole } from "@/types";
import { ShiftTemplate, OrganizationSettings } from "@/types/database";
import { ProfileSettings } from "./profile-settings";
import { OrganizationsSettings } from "./organizations-settings";
import { ShiftTemplatesSettings } from "./shift-templates-settings";
import { OrganizationSettingsComponent } from "./organization-settings";

interface SettingsTabsProps {
    profile: Profile | null;
    organizations: OrganizationWithRole[];
    defaultTab: string;
    userId: string;
    shiftTemplates: ShiftTemplate[];
    currentOrganizationId?: string;
    organizationSettings?: OrganizationSettings | null;
}

export function SettingsTabs({
    profile,
    organizations,
    defaultTab,
    userId,
    shiftTemplates,
    currentOrganizationId,
    organizationSettings,
}: SettingsTabsProps) {
    return (
        <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList>
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="organizations">Organizacje</TabsTrigger>
                {currentOrganizationId && (
                    <>
                        <TabsTrigger value="templates">
                            Szablony zmian
                        </TabsTrigger>
                        <TabsTrigger value="org-settings">
                            Ustawienia org.
                        </TabsTrigger>
                    </>
                )}
            </TabsList>

            <TabsContent value="profile">
                <ProfileSettings profile={profile} />
            </TabsContent>

            <TabsContent value="organizations">
                <OrganizationsSettings
                    organizations={organizations}
                    userId={userId}
                />
            </TabsContent>

            {currentOrganizationId && (
                <>
                    <TabsContent value="templates">
                        <ShiftTemplatesSettings
                            templates={shiftTemplates}
                            organizationId={currentOrganizationId}
                        />
                    </TabsContent>

                    <TabsContent value="org-settings">
                        <OrganizationSettingsComponent
                            organizationId={currentOrganizationId}
                            settings={organizationSettings || null}
                        />
                    </TabsContent>
                </>
            )}
        </Tabs>
    );
}
