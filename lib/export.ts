// ===========================================
// SCHEDULE EXPORT - PDF & EXCEL
// ===========================================

import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { pl } from "date-fns/locale";
import type { Shift, Employee } from "@/types";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ============ EXCEL EXPORT ============

export function exportScheduleToExcel(
    shifts: Shift[],
    employees: Employee[],
    startDate?: Date,
    endDate?: Date
) {
    const now = new Date();
    const start = startDate || startOfWeek(now, { weekStartsOn: 1 });
    const end = endDate || endOfWeek(now, { weekStartsOn: 1 });

    // Create employee map
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Get all days in range
    const days = eachDayOfInterval({ start, end });
    const dayHeaders = days.map((d) => format(d, "EEEE d.MM", { locale: pl }));

    // Create header row
    const headers = ["Pracownik", "Stanowisko", ...dayHeaders, "Suma godzin"];

    // Create data rows per employee
    const data: (string | number)[][] = [];

    for (const employee of employees) {
        const row: (string | number)[] = [
            `${employee.first_name} ${employee.last_name}`,
            employee.position,
        ];
        let totalHours = 0;

        for (const day of days) {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter(
                (s) => s.employee_id === employee.id && s.date === dayStr
            );

            if (dayShifts.length === 0) {
                row.push("-");
            } else {
                const shiftTexts = dayShifts.map((s) => {
                    // Calculate hours
                    const [startH, startM] = s.start_time
                        .split(":")
                        .map(Number);
                    const [endH, endM] = s.end_time.split(":").map(Number);
                    let mins =
                        endH * 60 +
                        endM -
                        (startH * 60 + startM) -
                        (s.break_duration || 0);
                    if (mins < 0) mins += 24 * 60;
                    totalHours += mins / 60;

                    return `${s.start_time}-${s.end_time}`;
                });
                row.push(shiftTexts.join("\n"));
            }
        }

        row.push(totalHours.toFixed(1));
        data.push(row);
    }

    // Create summary row
    const summaryRow: (string | number)[] = ["RAZEM", ""];
    for (const day of days) {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dayStr);
        summaryRow.push(`${dayShifts.length} os.`);
    }
    summaryRow.push(
        data
            .reduce(
                (sum, row) =>
                    sum + (parseFloat(row[row.length - 1] as string) || 0),
                0
            )
            .toFixed(1)
    );
    data.push(summaryRow);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    ws["!cols"] = [
        { wch: 20 }, // Pracownik
        { wch: 15 }, // Stanowisko
        ...days.map(() => ({ wch: 12 })), // Days
        { wch: 12 }, // Suma
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Grafik");

    // Generate file
    const fileName = `grafik_${format(start, "yyyy-MM-dd")}_${format(
        end,
        "yyyy-MM-dd"
    )}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
}

// ============ PDF EXPORT ============
// Note: For proper PDF generation, we'll create a printable HTML view
// and use the browser's print functionality or a library like @react-pdf/renderer

export function exportScheduleToPdf(
    shifts: Shift[],
    employees: Employee[],
    startDate?: Date,
    endDate?: Date
) {
    const now = new Date();
    const start = startDate || startOfWeek(now, { weekStartsOn: 1 });
    const end = endDate || endOfWeek(now, { weekStartsOn: 1 });

    // Create employee map
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Get all days in range
    const days = eachDayOfInterval({ start, end });

    // Generate HTML for printing
    const html = generatePrintableHtml(shifts, employees, days, start, end);

    // Open print dialog
    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }
}

function generatePrintableHtml(
    shifts: Shift[],
    employees: Employee[],
    days: Date[],
    startDate: Date,
    endDate: Date
): string {
    const dayNames = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

    // Build table rows
    let tableRows = "";

    for (const employee of employees) {
        let row = `<tr>
      <td class="employee-name">${employee.first_name} ${employee.last_name}</td>
      <td class="employee-position">${employee.position}</td>`;

        let totalHours = 0;

        for (const day of days) {
            const dayStr = format(day, "yyyy-MM-dd");
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayShifts = shifts.filter(
                (s) => s.employee_id === employee.id && s.date === dayStr
            );

            let cellContent = "-";
            let cellClass = isWeekend ? "weekend" : "";

            if (dayShifts.length > 0) {
                cellContent = dayShifts
                    .map((s) => {
                        const [startH, startM] = s.start_time
                            .split(":")
                            .map(Number);
                        const [endH, endM] = s.end_time.split(":").map(Number);
                        let mins =
                            endH * 60 +
                            endM -
                            (startH * 60 + startM) -
                            (s.break_duration || 0);
                        if (mins < 0) mins += 24 * 60;
                        totalHours += mins / 60;
                        return `${s.start_time}-${s.end_time}`;
                    })
                    .join("<br>");
                cellClass += " has-shift";
            }

            row += `<td class="${cellClass}">${cellContent}</td>`;
        }

        row += `<td class="total-hours">${totalHours.toFixed(1)}h</td></tr>`;
        tableRows += row;
    }

    // Summary row
    let summaryRow = '<tr class="summary-row"><td colspan="2">RAZEM</td>';
    for (const day of days) {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dayStr);
        summaryRow += `<td>${dayShifts.length} os.</td>`;
    }
    const totalAllHours = employees.reduce((sum, emp) => {
        return (
            sum +
            shifts
                .filter((s) => s.employee_id === emp.id)
                .reduce((h, s) => {
                    const [startH, startM] = s.start_time
                        .split(":")
                        .map(Number);
                    const [endH, endM] = s.end_time.split(":").map(Number);
                    let mins =
                        endH * 60 +
                        endM -
                        (startH * 60 + startM) -
                        (s.break_duration || 0);
                    if (mins < 0) mins += 24 * 60;
                    return h + mins / 60;
                }, 0)
        );
    }, 0);
    summaryRow += `<td class="total-hours">${totalAllHours.toFixed(
        1
    )}h</td></tr>`;

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Grafik pracy - ${format(startDate, "d MMMM", {
      locale: pl,
  })} - ${format(endDate, "d MMMM yyyy", { locale: pl })}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    
    .header p {
      font-size: 12px;
      color: #666;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: 600;
      font-size: 10px;
    }
    
    .day-header {
      min-width: 70px;
    }
    
    .day-header .day-name {
      font-weight: bold;
    }
    
    .day-header .day-date {
      font-size: 9px;
      color: #666;
    }
    
    .employee-name {
      text-align: left;
      font-weight: 500;
      min-width: 120px;
    }
    
    .employee-position {
      text-align: left;
      color: #666;
      font-size: 10px;
      min-width: 80px;
    }
    
    .weekend {
      background-color: #f9f9f9;
    }
    
    .has-shift {
      background-color: #e8f5e9;
      font-weight: 500;
    }
    
    .total-hours {
      font-weight: bold;
      background-color: #fff3e0;
    }
    
    .summary-row {
      font-weight: bold;
      background-color: #f5f5f5;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Grafik pracy</h1>
    <p>${format(startDate, "d MMMM", { locale: pl })} - ${format(
        endDate,
        "d MMMM yyyy",
        { locale: pl }
    )}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Pracownik</th>
        <th>Stanowisko</th>
        ${days
            .map(
                (day) => `
          <th class="day-header">
            <div class="day-name">${dayNames[day.getDay()]}</div>
            <div class="day-date">${format(day, "d.MM")}</div>
          </th>
        `
            )
            .join("")}
        <th>Suma</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      ${summaryRow}
    </tbody>
  </table>
  
  <div class="footer">
    <span>Wygenerowano: ${format(new Date(), "d MMMM yyyy, HH:mm", {
        locale: pl,
    })}</span>
    <span>Grafiki SaaS</span>
  </div>
</body>
</html>
  `;
}

// ============ CSV EXPORT ============

export function exportScheduleToCSV(
    shifts: Shift[],
    employees: Employee[],
    startDate?: Date,
    endDate?: Date
) {
    const now = new Date();
    const start = startDate || startOfWeek(now, { weekStartsOn: 1 });
    const end = endDate || endOfWeek(now, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start, end });

    // CSV header
    const headers = [
        "Pracownik",
        "Stanowisko",
        ...days.map((d) => format(d, "yyyy-MM-dd")),
        "Suma godzin",
    ];

    // CSV rows
    const rows: string[][] = [headers];

    for (const employee of employees) {
        const row = [
            `${employee.first_name} ${employee.last_name}`,
            employee.position,
        ];
        let totalHours = 0;

        for (const day of days) {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter(
                (s) => s.employee_id === employee.id && s.date === dayStr
            );

            if (dayShifts.length === 0) {
                row.push("");
            } else {
                const shiftTexts = dayShifts.map((s) => {
                    const [startH, startM] = s.start_time
                        .split(":")
                        .map(Number);
                    const [endH, endM] = s.end_time.split(":").map(Number);
                    let mins =
                        endH * 60 +
                        endM -
                        (startH * 60 + startM) -
                        (s.break_duration || 0);
                    if (mins < 0) mins += 24 * 60;
                    totalHours += mins / 60;
                    return `${s.start_time}-${s.end_time}`;
                });
                row.push(shiftTexts.join("; "));
            }
        }

        row.push(totalHours.toFixed(1));
        rows.push(row);
    }

    // Convert to CSV string
    const csvContent = rows
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

    // Download
    const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8",
    });
    const fileName = `grafik_${format(start, "yyyy-MM-dd")}_${format(
        end,
        "yyyy-MM-dd"
    )}.csv`;
    saveAs(blob, fileName);
}
