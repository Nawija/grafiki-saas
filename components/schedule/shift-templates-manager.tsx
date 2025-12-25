"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShiftTemplate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Settings, Trash2, Loader2, Clock } from "lucide-react";

interface ShiftTemplatesManagerProps {
    templates: ShiftTemplate[];
    organizationId: string;
}

export function ShiftTemplatesManager({
    templates,
    organizationId,
}: ShiftTemplatesManagerProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        startTime: "08:00",
        endTime: "16:00",
        breakMinutes: 30,
        color: "#3b82f6",
    });

    function calculateHours(
        start: string,
        end: string,
        breakMins: number
    ): string {
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);

        let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        totalMinutes -= breakMins;

        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }

    async function handleCreate() {
        if (!formData.name.trim()) return;

        setIsCreating(true);

        try {
            const supabase = createClient();

            const { error } = await supabase.from("shift_templates").insert({
                organization_id: organizationId,
                name: formData.name,
                start_time: formData.startTime,
                end_time: formData.endTime,
                break_minutes: formData.breakMinutes,
                color: formData.color,
            });

            if (error) throw error;

            setFormData({
                name: "",
                startTime: "08:00",
                endTime: "16:00",
                breakMinutes: 30,
                color: "#3b82f6",
            });
            setDialogOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Error creating template:", error);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(templateId: string) {
        setDeletingId(templateId);

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("shift_templates")
                .delete()
                .eq("id", templateId);

            if (error) throw error;
            router.refresh();
        } catch (error) {
            console.error("Error deleting template:", error);
        } finally {
            setDeletingId(null);
        }
    }

    const presetColors = [
        "#3b82f6", // blue
        "#10b981", // green
        "#f59e0b", // amber
        "#ef4444", // red
        "#8b5cf6", // violet
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#84cc16", // lime
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Szablony ({templates.length})
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                {templates.length > 0 ? (
                    <>
                        {templates.map((template) => (
                            <DropdownMenuItem
                                key={template.id}
                                className="flex items-center justify-between"
                                onSelect={(e) => e.preventDefault()}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: template.color,
                                        }}
                                    />
                                    <div>
                                        <div className="font-medium text-sm">
                                            {template.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {template.start_time.substring(
                                                0,
                                                5
                                            )}{" "}
                                            -{" "}
                                            {template.end_time.substring(0, 5)}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleDelete(template.id)}
                                    disabled={deletingId === template.id}
                                >
                                    {deletingId === template.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    )}
                                </Button>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                ) : (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        Brak szablonów zmian
                    </div>
                )}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Dodaj szablon
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nowy szablon zmiany</DialogTitle>
                            <DialogDescription>
                                Szablon ułatwi szybkie dodawanie zmian
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nazwa szablonu</Label>
                                <Input
                                    placeholder="np. Poranna, Popołudniowa, Nocna"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Godzina rozpoczęcia</Label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                startTime: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Godzina zakończenia</Label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                endTime: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Przerwa (minuty)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={formData.breakMinutes}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            breakMinutes:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kolor</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {presetColors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                                formData.color === color
                                                    ? "border-gray-900 scale-110"
                                                    : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    color,
                                                })
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Czas pracy:{" "}
                                    <span className="font-medium text-foreground">
                                        {calculateHours(
                                            formData.startTime,
                                            formData.endTime,
                                            formData.breakMinutes
                                        )}
                                    </span>
                                </span>
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={isCreating || !formData.name.trim()}
                                className="w-full"
                            >
                                {isCreating && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Utwórz szablon
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
