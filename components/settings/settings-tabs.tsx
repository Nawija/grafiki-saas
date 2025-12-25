"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile, OrganizationWithRole } from "@/types";
import { ProfileSettings } from "./profile-settings";
import { OrganizationsSettings } from "./organizations-settings";

interface SettingsTabsProps {
    profile: Profile | null;
    organizations: OrganizationWithRole[];
    defaultTab: string;
    userId: string;
}

export function SettingsTabs({
    profile,
    organizations,
    defaultTab,
    userId,
}: SettingsTabsProps) {
    return (
        <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList>
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="organizations">Organizacje</TabsTrigger>
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
        </Tabs>
    );
}
