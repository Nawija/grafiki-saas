"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface ClearScheduleButtonProps {
    scheduleId: string;
    monthName: string;
    shiftsCount: number;
}

export function ClearScheduleButton({
    scheduleId,
    monthName,
    shiftsCount,
}: ClearScheduleButtonProps) {
    const router = useRouter();
    const [isClearing, setIsClearing] = useState(false);
    const [open, setOpen] = useState(false);

    async function handleClear() {
        setIsClearing(true);

        try {
            const supabase = createClient();

            // Usuń wszystkie zmiany dla tego grafiku
            const { error } = await supabase
                .from("shifts")
                .delete()
                .eq("schedule_id", scheduleId);

            if (error) throw error;

            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Error clearing schedule:", error);
        } finally {
            setIsClearing(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={shiftsCount === 0}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Wyczyść grafik
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Wyczyścić grafik?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Czy na pewno chcesz usunąć{" "}
                            <strong>wszystkie zmiany</strong> z grafiku na{" "}
                            <strong>{monthName}</strong>?
                        </p>
                        <p className="text-red-600 font-medium">
                            Ta operacja usunie {shiftsCount}{" "}
                            {shiftsCount === 1
                                ? "zmianę"
                                : shiftsCount < 5
                                ? "zmiany"
                                : "zmian"}{" "}
                            i nie może być cofnięta!
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearing}>
                        Anuluj
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleClear}
                        disabled={isClearing}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isClearing && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Tak, wyczyść
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
