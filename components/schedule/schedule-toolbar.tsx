"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Wand2,
    Download,
    FileSpreadsheet,
    FileText,
    Settings2,
    RefreshCw,
    Printer,
} from "lucide-react";

interface ScheduleToolbarProps {
    onGenerate: () => void;
    onExportPdf: () => void;
    onExportExcel: () => void;
    onSettings?: () => void;
    isGenerating?: boolean;
}

export function ScheduleToolbar({
    onGenerate,
    onExportPdf,
    onExportExcel,
    onSettings,
    isGenerating = false,
}: ScheduleToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 py-3 border-b">
            {/* Generate schedule button */}
            <Button
                onClick={onGenerate}
                disabled={isGenerating}
                className="gap-2"
            >
                {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                    {isGenerating ? "Generowanie..." : "Wygeneruj grafik"}
                </span>
                <span className="sm:hidden">
                    {isGenerating ? "..." : "Generuj"}
                </span>
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Eksportuj</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={onExportPdf}>
                        <FileText className="mr-2 h-4 w-4" />
                        Eksport do PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Eksport do Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Drukuj
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings button */}
            {onSettings && (
                <Button variant="outline" size="icon" onClick={onSettings}>
                    <Settings2 className="h-4 w-4" />
                    <span className="sr-only">Ustawienia grafiku</span>
                </Button>
            )}
        </div>
    );
}
