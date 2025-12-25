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
} from "lucide-react";
import { OrganizationWithRole } from "@/types";
import { OrganizationSwitcher } from "./organization-switcher";

interface SidebarProps {
    organizations: OrganizationWithRole[];
}

const navigation = [
    { name: "Panel", href: "/panel", icon: LayoutDashboard },
    { name: "Grafik", href: "/grafik", icon: CalendarDays },
    { name: "Pracownicy", href: "/pracownicy", icon: Users },
    { name: "Ustawienia", href: "/ustawienia", icon: Settings },
];

export function Sidebar({ organizations }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentOrgSlug = searchParams.get("org");

    // Generuj href z parametrem org jeśli jest ustawiony
    const getNavHref = (baseHref: string) => {
        if (currentOrgSlug) {
            return `${baseHref}?org=${currentOrgSlug}`;
        }
        // Jeśli nie ma w URL, użyj pierwszej organizacji
        if (organizations.length > 0) {
            return `${baseHref}?org=${organizations[0].slug}`;
        }
        return baseHref;
    };

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center">
                    <Link
                        href={getNavHref("/panel")}
                        className="flex items-center gap-2"
                    >
                        <span className="text-2xl">🗓️</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            Grafiki
                        </span>
                    </Link>
                </div>

                {/* Organization Switcher */}
                <div className="space-y-2">
                    <OrganizationSwitcher organizations={organizations} />
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={getNavHref(item.href)}
                                                className={cn(
                                                    "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                                                    isActive
                                                        ? "bg-slate-100 dark:bg-slate-800 text-primary"
                                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                        </li>

                        {/* Organizations list */}
                        <li>
                            <div className="text-xs font-semibold leading-6 text-slate-400 uppercase">
                                Twoje organizacje
                            </div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                                {organizations.map((org) => {
                                    const isCurrentOrg =
                                        org.slug === currentOrgSlug ||
                                        (!currentOrgSlug &&
                                            org === organizations[0]);
                                    return (
                                        <li key={org.id}>
                                            <Link
                                                href={`${pathname}?org=${org.slug}`}
                                                className={cn(
                                                    "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                                    isCurrentOrg
                                                        ? "text-primary bg-slate-100 dark:bg-slate-800"
                                                        : "text-slate-700 dark:text-slate-300"
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
                                                {org.is_owner && (
                                                    <span className="ml-auto text-xs text-slate-400">
                                                        Właściciel
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                                <li>
                                    <Link
                                        href="/ustawienia?tab=organizations"
                                        className="group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    >
                                        <Plus className="h-5 w-5 shrink-0" />
                                        Dodaj organizację
                                    </Link>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
