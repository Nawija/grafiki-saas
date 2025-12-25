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
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Imię i nazwisko</TableHead>
                            <TableHead>Etat</TableHead>
                            <TableHead>Kontakt</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{
                                                backgroundColor: employee.color,
                                            }}
                                        />
                                        {employee.first_name}{" "}
                                        {employee.last_name}
                                    </div>
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
                                <TableCell>
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
