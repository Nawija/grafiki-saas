"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShiftTemplate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, Clock, Coffee } from "lucide-react";

interface ShiftTemplatesSettingsProps {
    templates: ShiftTemplate[];
    organizationId: string;
}

export function ShiftTemplatesSettings({
    templates,
    organizationId,
}: ShiftTemplatesSettingsProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        startTime: "06:00",
        endTime: "14:00",
        breakMinutes: 0,
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
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Next day
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Szablony zmian</CardTitle>
                        <CardDescription>
                            Twórz szablony do szybkiego dodawania zmian
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Dodaj szablon
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nowy szablon zmiany</DialogTitle>
                                <DialogDescription>
                                    Szablon ułatwi szybkie dodawanie zmian do
                                    grafiku
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
                                                    parseInt(e.target.value) ||
                                                    0,
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
                                                style={{
                                                    backgroundColor: color,
                                                }}
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
                                <div className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        Czas pracy:{" "}
                                        <span className="font-medium text-foreground">
                                            {calculateHours(
                                                formData.startTime,
                                                formData.endTime,
                                                formData.breakMinutes
                                            )}
                                        </span>
                                    </p>
                                </div>
                                <Button
                                    onClick={handleCreate}
                                    disabled={
                                        isCreating || !formData.name.trim()
                                    }
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
                </div>
            </CardHeader>
            <CardContent>
                {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nie masz jeszcze żadnych szablonów zmian</p>
                        <p className="text-sm">
                            Dodaj szablony aby szybciej tworzyć grafik
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nazwa</TableHead>
                                <TableHead>Godziny</TableHead>
                                <TableHead>Przerwa</TableHead>
                                <TableHead>Czas pracy</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        template.color,
                                                }}
                                            />
                                            <span className="font-medium">
                                                {template.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {template.start_time.slice(0, 5)} -{" "}
                                        {template.end_time.slice(0, 5)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Coffee className="h-3 w-3" />
                                            {template.break_minutes} min
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {calculateHours(
                                            template.start_time,
                                            template.end_time,
                                            template.break_minutes
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleDelete(template.id)
                                            }
                                            disabled={
                                                deletingId === template.id
                                            }
                                        >
                                            {deletingId === template.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
