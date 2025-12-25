"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Settings,
    Building2,
    Plus,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationWithRole } from "@/types";
import { OrganizationSwitcher } from "./organization-switcher";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

interface MobileSidebarProps {
    organizations: OrganizationWithRole[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const navigation = [
    { name: "Panel", href: "/panel", icon: LayoutDashboard },
    { name: "Grafik", href: "/grafik", icon: CalendarDays },
    { name: "Pracownicy", href: "/pracownicy", icon: Users },
    { name: "Ustawienia", href: "/ustawienia", icon: Settings },
];

export function MobileSidebar({
    organizations,
    open,
    onOpenChange,
}: MobileSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentOrgSlug = searchParams.get("org");

    const getNavHref = (baseHref: string) => {
        if (currentOrgSlug) {
            return `${baseHref}?org=${currentOrgSlug}`;
        }
        if (organizations.length > 0) {
            return `${baseHref}?org=${organizations[0].slug}`;
        }
        return baseHref;
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-72 p-0">
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <SheetHeader className="border-b border-slate-200 p-4">
                        <SheetTitle className="flex items-center gap-2">
                            <span className="text-2xl">🗓️</span>
                            <span className="text-xl font-bold">Grafiki</span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Organization Switcher */}
                        <div className="mb-6">
                            <OrganizationSwitcher
                                organizations={organizations}
                            />
                        </div>

                        {/* Navigation */}
                        <nav>
                            <ul className="space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={getNavHref(item.href)}
                                                onClick={() =>
                                                    onOpenChange(false)
                                                }
                                                className={cn(
                                                    "group flex gap-x-3 rounded-md p-3 text-sm font-medium leading-6 transition-colors",
                                                    isActive
                                                        ? "bg-slate-100 text-primary"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        "h-5 w-5 shrink-0",
                                                        isActive
                                                            ? "text-primary"
                                                            : "text-slate-400 group-hover:text-primary"
                                                    )}
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>

                        {/* Organizations list */}
                        <div className="mt-8">
                            <div className="text-xs font-semibold leading-6 text-slate-400 uppercase mb-2">
                                Twoje organizacje
                            </div>
                            <ul className="space-y-1">
                                {organizations.map((org) => {
                                    const isCurrentOrg =
                                        org.slug === currentOrgSlug ||
                                        (!currentOrgSlug &&
                                            org === organizations[0]);
                                    return (
                                        <li key={org.id}>
                                            <Link
                                                href={`${pathname}?org=${org.slug}`}
                                                onClick={() =>
                                                    onOpenChange(false)
                                                }
                                                className={cn(
                                                    "group flex gap-x-3 rounded-md p-3 text-sm font-medium leading-6 hover:bg-slate-50",
                                                    isCurrentOrg
                                                        ? "text-primary bg-slate-100"
                                                        : "text-slate-700"
                                                )}
                                            >
                                                <Building2
                                                    className={cn(
                                                        "h-5 w-5 shrink-0",
                                                        isCurrentOrg
                                                            ? "text-primary"
                                                            : "text-slate-400"
                                                    )}
                                                />
                                                <span className="truncate">
                                                    {org.name}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                                <li>
                                    <Link
                                        href="/ustawienia?tab=organizations"
                                        onClick={() => onOpenChange(false)}
                                        className="group flex gap-x-3 rounded-md p-3 text-sm font-medium leading-6 text-slate-500 hover:text-slate-700"
                                    >
                                        <Plus className="h-5 w-5 shrink-0" />
                                        Dodaj organizację
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
