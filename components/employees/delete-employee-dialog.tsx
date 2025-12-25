"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface DeleteEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: DeleteEmployeeDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleDelete() {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("employees")
                .delete()
                .eq("id", employee.id);

            if (error) throw error;

            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error deleting employee:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Usuń pracownika</DialogTitle>
                    <DialogDescription>
                        Czy na pewno chcesz usunąć pracownika{" "}
                        <strong>
                            {employee.first_name} {employee.last_name}
                        </strong>
                        ? Ta akcja jest nieodwracalna.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Anuluj
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Usuń
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
