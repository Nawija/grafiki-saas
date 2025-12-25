"use client";

import { useState } from "react";
import { Employee } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Mail,
    Phone,
    Users,
} from "lucide-react";
import { getEmploymentTypeLabel } from "@/lib/utils/work-hours";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { DeleteEmployeeDialog } from "./delete-employee-dialog";

interface EmployeesListProps {
    employees: Employee[];
    organizationId: string;
}

export function EmployeesList({
    employees,
    organizationId,
}: EmployeesListProps) {
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(
        null
    );
    const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
        null
    );

    if (employees.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Brak pracowników</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Dodaj pierwszego pracownika do organizacji
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Widok mobilny - karty */}
            <div className="grid gap-3 sm:hidden">
                {employees.map((employee) => (
                    <Card key={employee.id}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium">
                                        {employee.first_name}{" "}
                                        {employee.last_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {getEmploymentTypeLabel(
                                            employee.employment_type
                                        )}
                                        {employee.employment_type ===
                                            "custom" &&
                                            employee.custom_hours && (
                                                <span className="ml-1">
                                                    ({employee.custom_hours}
                                                    h/dzień)
                                                </span>
                                            )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            employee.is_active
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {employee.is_active
                                            ? "Aktywny"
                                            : "Nieaktywny"}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setEditingEmployee(employee)
                                                }
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edytuj
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setDeletingEmployee(
                                                        employee
                                                    )
                                                }
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Usuń
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {(employee.email || employee.phone) && (
                                <div className="mt-3 pt-3 border-t flex flex-col gap-1">
                                    {employee.email && (
                                        <a
                                            href={`mailto:${employee.email}`}
                                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            <Mail className="h-3 w-3" />
                                            {employee.email}
                                        </a>
                                    )}
                                    {employee.phone && (
                                        <a
                                            href={`tel:${employee.phone}`}
                                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            <Phone className="h-3 w-3" />
                                            {employee.phone}
                                        </a>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Widok desktop - tabela */}
            <Card className="hidden sm:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Imię i nazwisko</TableHead>
                            <TableHead>Etat</TableHead>
                            <TableHead className="hidden md:table-cell">
                                Kontakt
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell className="font-medium">
                                    {employee.first_name} {employee.last_name}
                                </TableCell>
                                <TableCell>
                                    <div>
                                        {getEmploymentTypeLabel(
                                            employee.employment_type
                                        )}
                                        {employee.employment_type ===
                                            "custom" &&
                                            employee.custom_hours && (
                                                <span className="text-muted-foreground ml-1">
                                                    ({employee.custom_hours}
                                                    h/dzień)
                                                </span>
                                            )}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1">
                                        {employee.email && (
                                            <a
                                                href={`mailto:${employee.email}`}
                                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                            >
                                                <Mail className="h-3 w-3" />
                                                {employee.email}
                                            </a>
                                        )}
                                        {employee.phone && (
                                            <a
                                                href={`tel:${employee.phone}`}
                                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                            >
                                                <Phone className="h-3 w-3" />
                                                {employee.phone}
                                            </a>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            employee.is_active
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {employee.is_active
                                            ? "Aktywny"
                                            : "Nieaktywny"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setEditingEmployee(employee)
                                                }
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edytuj
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setDeletingEmployee(
                                                        employee
                                                    )
                                                }
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Usuń
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {editingEmployee && (
                <EditEmployeeDialog
                    employee={editingEmployee}
                    open={!!editingEmployee}
                    onOpenChange={(open) => !open && setEditingEmployee(null)}
                />
            )}

            {deletingEmployee && (
                <DeleteEmployeeDialog
                    employee={deletingEmployee}
                    open={!!deletingEmployee}
                    onOpenChange={(open) => !open && setDeletingEmployee(null)}
                />
            )}
        </>
    );
}
