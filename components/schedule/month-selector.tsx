"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS_PL = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
];

interface MonthSelectorProps {
    year: number;
    month: number;
}

export function MonthSelector({ year, month }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    function navigate(newYear: number, newMonth: number) {
        const params = new URLSearchParams(searchParams);
        params.set("year", newYear.toString());
        params.set("month", newMonth.toString());
        router.push(`/grafik?${params.toString()}`);
    }

    function handlePrevMonth() {
        if (month === 1) {
            navigate(year - 1, 12);
        } else {
            navigate(year, month - 1);
        }
    }

    function handleNextMonth() {
        if (month === 12) {
            navigate(year + 1, 1);
        } else {
            navigate(year, month + 1);
        }
    }

    function handleToday() {
        const today = new Date();
        navigate(today.getFullYear(), today.getMonth() + 1);
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
                Dziś
            </Button>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="w-40 text-center font-medium">
                    {MONTHS_PL[month - 1]} {year}
                </div>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
