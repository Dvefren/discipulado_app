import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "SCHEDULE_LEADER", "SECRETARY"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: facilitatorId } = await params;

  // ── Fetch facilitator + their tables + students + attendance ──
  const facilitator = await prisma.facilitator.findUnique({
    where: { id: facilitatorId },
    include: {
      tables: {
        include: {
          schedule: {
            include: {
              classes: { orderBy: { date: "asc" } },
            },
          },
          students: {
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            include: {
              attendance: true,
            },
          },
        },
      },
    },
  });

  if (!facilitator) {
    return NextResponse.json({ error: "Facilitator not found" }, { status: 404 });
  }

  // ── Build workbook ──────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Discipulado App";
  workbook.created = new Date();

  const translateLabel = (label: string) =>
    label.replace("Wednesday", "Miércoles").replace("Sunday", "Domingo");

  // Status colors (matches the app UI)
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    PRESENT:   { bg: "FF22C55E", text: "FFFFFFFF", label: "Presente" },
    ABSENT:    { bg: "FFF87171", text: "FFFFFFFF", label: "Ausente" },
    PREVIEWED: { bg: "FF60A5FA", text: "FFFFFFFF", label: "Adelantó" },
    RECOVERED: { bg: "FFFACC15", text: "FF1F2937", label: "Recuperó" },
  };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };

  // Build a sheet for each table the facilitator owns
  for (const table of facilitator.tables) {
    const classes = table.schedule.classes;
    const students = table.students;

    if (students.length === 0) continue;

    const sheetName = `${translateLabel(table.schedule.label)} - ${table.name}`
     .replace(/[*?:\\/\[\]]/g, "")
     .slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: "FF1F2937" } },
    });

    // ── Header row: Nombre + Class 1, Class 2, ... + Total + % ──
    const headers = [
      "Alumno",
      ...classes.map((c) => {
        const num = c.name.match(/\d+/)?.[0] || "?";
        return `C${num}`;
      }),
      "Total",
      "Asistencia %",
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderStyle;
    });
    headerRow.height = 24;

    // ── Sub-header row with class dates (smaller text) ──────
    const dateRow = sheet.addRow([
      "",
      ...classes.map((c) =>
        new Date(c.date).toLocaleDateString("es-MX", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      ),
      "",
      "",
    ]);
    dateRow.eachCell((cell) => {
      cell.font = { size: 9, italic: true, color: { argb: "FF6B7280" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderStyle;
    });
    dateRow.height = 16;

    // ── Student rows ────────────────────────────────────────
    for (const student of students) {
      // Build attendance lookup by classId
      const attendanceMap = new Map<string, string>();
      for (const a of student.attendance) {
        attendanceMap.set(a.classId, a.status);
      }

      let presentCount = 0;
      let totalCount = 0;
      const attendanceCells = classes.map((c) => {
        const status = attendanceMap.get(c.id);
        if (status) {
          totalCount++;
          if (["PRESENT", "PREVIEWED", "RECOVERED"].includes(status)) {
            presentCount++;
          }
          return statusColors[status]?.label.charAt(0) || "?"; // P, A, Ad, R
        }
        return "";
      });

      const pct = totalCount > 0 ? presentCount / totalCount : 0;

      const row = sheet.addRow([
        `${student.firstName} ${student.lastName}`,
        ...attendanceCells,
        `${presentCount}/${totalCount}`,
        pct,
      ]);

      // Style each cell
      row.eachCell((cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", horizontal: "center" };

        // First column: student name (left-aligned, bold)
        if (colNumber === 1) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.font = { bold: true, size: 11 };
        }

        // Attendance columns: color-coded
        if (colNumber > 1 && colNumber <= classes.length + 1) {
          const classIdx = colNumber - 2;
          const cls = classes[classIdx];
          const status = attendanceMap.get(cls.id);
          if (status && statusColors[status]) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: statusColors[status].bg },
            };
            cell.font = {
              bold: true,
              color: { argb: statusColors[status].text },
            };
          }
        }

        // % column
        if (colNumber === classes.length + 3) {
          cell.numFmt = "0%";
          cell.font = { bold: true };
          if (pct >= 0.8) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
            cell.font = { bold: true, color: { argb: "FF065F46" } };
          } else if (pct >= 0.6) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            cell.font = { bold: true, color: { argb: "FF92400E" } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
            cell.font = { bold: true, color: { argb: "FFB91C1C" } };
          }
        }
      });
    }

    // ── Legend row at the bottom ────────────────────────────
    sheet.addRow([]);
    const legendRow = sheet.addRow(["Leyenda:", "P = Presente", "A = Ausente", "Ad = Adelantó", "R = Recuperó"]);
    legendRow.eachCell((cell, colNumber) => {
      cell.font = { size: 9, italic: true, color: { argb: "FF6B7280" } };
      if (colNumber === 1) cell.font = { size: 9, bold: true, color: { argb: "FF1F2937" } };
    });

    // ── Freeze first column and header rows ────────────────
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

    // ── Auto-width columns ──────────────────────────────────
    sheet.getColumn(1).width = 28; // student name
    for (let i = 2; i <= classes.length + 1; i++) {
      sheet.getColumn(i).width = 8; // attendance cells
    }
    sheet.getColumn(classes.length + 2).width = 10; // total
    sheet.getColumn(classes.length + 3).width = 14; // %
  }

  // If no sheets were added (no students), add an empty info sheet
  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Sin alumnos");
    sheet.addRow(["Este facilitador no tiene alumnos registrados."]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().split("T")[0];
  const safeName = facilitator.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `asistencia_${safeName}_${date}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}