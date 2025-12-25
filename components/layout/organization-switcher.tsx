"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { OrganizationWithRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";

interface OrganizationSwitcherProps {
    organizations: OrganizationWithRole[];
}

export function OrganizationSwitcher({
    organizations,
}: OrganizationSwitcherProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentOrgSlug = searchParams.get("org");

    const currentOrg =
        organizations.find((o) => o.slug === currentOrgSlug) ||
        organizations[0];

    // Ustaw cookie gdy organizacja się zmieni
    useEffect(() => {
        if (currentOrg) {
            document.cookie = `current_organization=${currentOrg.id}; path=/; max-age=31536000`;
        }
    }, [currentOrg]);

    function handleSelectOrganization(slug: string) {
        const params = new URLSearchParams(searchParams);
        params.set("org", slug);

        // Zachowaj bieżącą ścieżkę ale usuń inne parametry które mogą być specyficzne dla starej org
        // Zachowaj year i month dla schedule
        const newParams = new URLSearchParams();
        newParams.set("org", slug);

        if (params.has("year")) newParams.set("year", params.get("year")!);
        if (params.has("month")) newParams.set("month", params.get("month")!);
        if (params.has("tab")) newParams.set("tab", params.get("tab")!);

        router.push(`${pathname}?${newParams.toString()}`);
        router.refresh();
    }

    if (organizations.length === 0) {
        return (
            <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/ustawienia?tab=organizations">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj organizację
                </a>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {currentOrg?.name || "Wybierz organizację"}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSelectOrganization(org.slug)}
                        className="cursor-pointer"
                    >
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="flex-1 truncate">{org.name}</span>
                        {org.slug === currentOrg?.slug && (
                            <Check className="ml-2 h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <a
                        href="/ustawienia?tab=organizations"
                        className="cursor-pointer"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj organizację
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
