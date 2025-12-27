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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Settings, Trash2, Loader2, Clock, Users, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ShiftTemplatesManagerProps {
    templates: ShiftTemplate[];
    organizationId: string;
}

const defaultFormData = {
    name: "",
    startTime: "08:00",
    endTime: "16:00",
    breakMinutes: 30,
    color: "#3b82f6",
    minEmployees: 1,
};

export function ShiftTemplatesManager({
    templates,
    organizationId,
}: ShiftTemplatesManagerProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(defaultFormData);

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

    function openCreateDialog() {
        setEditingTemplate(null);
        setFormData(defaultFormData);
        setDialogOpen(true);
    }

    function openEditDialog(template: ShiftTemplate) {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            startTime: template.start_time.substring(0, 5),
            endTime: template.end_time.substring(0, 5),
            breakMinutes: template.break_minutes,
            color: template.color,
            minEmployees: template.min_employees || 1,
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Podaj nazwę szablonu");
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();

            const data = {
                organization_id: organizationId,
                name: formData.name,
                start_time: formData.startTime,
                end_time: formData.endTime,
                break_minutes: formData.breakMinutes,
                color: formData.color,
                min_employees: formData.minEmployees,
            };

            if (editingTemplate) {
                const { error } = await supabase
                    .from("shift_templates")
                    .update(data)
                    .eq("id", editingTemplate.id);

                if (error) throw error;
                toast.success("Szablon został zaktualizowany");
            } else {
                const { error } = await supabase
                    .from("shift_templates")
                    .insert(data);

                if (error) throw error;
                toast.success("Szablon został utworzony");
            }

            setFormData(defaultFormData);
            setEditingTemplate(null);
            setDialogOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Error saving template:", error);
            toast.error("Wystąpił błąd podczas zapisywania");
        } finally {
            setIsLoading(false);
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
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Szablony ({templates.length})
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    {templates.length > 0 ? (
                        <>
                            {templates.map((template) => (
                                <DropdownMenuItem
                                    key={template.id}
                                    className="flex items-center justify-between p-2"
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <div 
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                        onClick={() => openEditDialog(template)}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: template.color }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm truncate">
                                                {template.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>
                                                    {template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-0.5">
                                                    <Users className="h-3 w-3" />
                                                    {template.min_employees || 1} os.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => openEditDialog(template)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleDelete(template.id)}
                                            disabled={deletingId === template.id}
                                        >
                                            {deletingId === template.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            )}
                                        </Button>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                        </>
                    ) : (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            Brak szablonów zmian
                        </div>
                    )}

                    <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        openCreateDialog();
                    }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj szablon
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog tworzenia/edycji */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? "Edytuj szablon zmiany" : "Nowy szablon zmiany"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate 
                                ? "Zmień parametry szablonu zmiany" 
                                : "Szablon ułatwi szybkie dodawanie zmian"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nazwa szablonu</Label>
                            <Input
                                placeholder="np. Poranna, Popołudniowa, Nocna"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
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
                                        setFormData({ ...formData, startTime: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Godzina zakończenia</Label>
                                <Input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) =>
                                        setFormData({ ...formData, endTime: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                                            breakMinutes: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Min. osób na zmianie
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={formData.minEmployees}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            minEmployees: parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
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
                                        onClick={() => setFormData({ ...formData, color })}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* Podsumowanie */}
                        <div className="bg-muted p-3 rounded-lg space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Czas pracy:</span>
                                <span className="font-medium">
                                    {calculateHours(formData.startTime, formData.endTime, formData.breakMinutes)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Wymagane osoby:</span>
                                <span className="font-medium">
                                    {formData.minEmployees} {formData.minEmployees === 1 ? "osoba" : formData.minEmployees < 5 ? "osoby" : "osób"}
                                </span>
                            </div>
                        </div>
                        
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || !formData.name.trim()}
                            className="w-full"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingTemplate ? "Zapisz zmiany" : "Utwórz szablon"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
