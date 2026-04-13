import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "SCHEDULE_LEADER", "SECRETARY"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleFilter = searchParams.get("schedule");

  // ── Fetch data ──────────────────────────────────────────
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          tables: {
            orderBy: { name: "asc" },
            include: {
              facilitator: true,
              students: {
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
                include: {
                  attendance: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "No active course" }, { status: 404 });
  }

  // ── Translate schedule labels ───────────────────────────
  const translateLabel = (label: string) =>
    label.replace("Wednesday", "Miércoles").replace("Sunday", "Domingo");

  const sortedProfileKeys: string[] = [];

  // ── Build workbook ──────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Discipulado App";
  workbook.created = new Date();

  // Helper to compute attendance %
  const computePercent = (attendance: any[]) => {
    const total = attendance.length;
    if (total === 0) return 0;
    const effective = attendance.filter((a) =>
      ["PRESENT", "PREVIEWED", "RECOVERED"].includes(a.status)
    ).length;
    return Math.round((effective / total) * 100);
  };

  // ── Style helpers ───────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }, // dark gray
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

  // Build a sheet for a list of students
  function buildSheet(
    sheet: ExcelJS.Worksheet,
    students: Array<{
      firstName: string;
      lastName: string;
      cellPhone: string | null;
      neighborhood: string | null;
      birthdate: Date | null;
      scheduleLabel: string;
      facilitatorName: string;
      tableName: string;
      attendance: any[];
      status: string;
    }>
  ) {
    const baseHeaders = [
      "Nombre",
      "Apellido",
      "Teléfono",
      "Nacimiento",
      "Dirección",
      "Horario",
      "Facilitador",
      "Mesa",
      "Asistencia %",
      "Estado",
    ];
    const allHeaders = [...baseHeaders, ...sortedProfileKeys];

    // Header row
    const headerRow = sheet.addRow(allHeaders);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = borderStyle;
    });
    headerRow.height = 22;

    // Data rows
    for (const s of students) {
      const pct = computePercent(s.attendance);

      const row = sheet.addRow([
        s.firstName,
        s.lastName,
        s.cellPhone || "",
        s.birthdate ? new Date(s.birthdate).toLocaleDateString("es-MX") : "",
        s.neighborhood || "",
        translateLabel(s.scheduleLabel),
        s.facilitatorName,
        s.tableName,
        pct / 100,
        s.status === "QUIT" ? "Baja" : "Activo",
      ]);

      row.eachCell((cell) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });

      // Format % column
      const pctCell = row.getCell(9);
      pctCell.numFmt = "0%";
      pctCell.alignment = { horizontal: "center", vertical: "middle" };

      // Color status cell
      const statusCell = row.getCell(10);
      statusCell.alignment = { horizontal: "center", vertical: "middle" };
      if (s.status === "QUIT") {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
        statusCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      } else {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
        statusCell.font = { color: { argb: "FF065F46" }, bold: true };
      }
    }

    // Freeze header row
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Auto-width columns
    sheet.columns.forEach((col, idx) => {
      let maxLength = allHeaders[idx]?.length || 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const value = cell.value?.toString() || "";
        if (value.length > maxLength) maxLength = value.length;
      });
      col.width = Math.min(Math.max(maxLength + 2, 10), 40);
    });
  }

  // ── SUMMARY SHEET (all students) ────────────────────────
  const allStudentsList: any[] = [];
  for (const schedule of course.schedules) {
    for (const table of schedule.tables) {
      for (const student of table.students) {
        allStudentsList.push({
          ...student,
          scheduleLabel: schedule.label,
          facilitatorName: table.facilitator.name,
          tableName: table.name,
        });
      }
    }
  }

  const summarySheet = workbook.addWorksheet("Resumen", {
    properties: { tabColor: { argb: "FF1F2937" } },
  });
  buildSheet(summarySheet, allStudentsList);

  // ── ONE SHEET PER SCHEDULE ──────────────────────────────
  for (const schedule of course.schedules) {
    if (scheduleFilter && scheduleFilter !== "all" && schedule.label !== scheduleFilter) {
      continue;
    }

    const scheduleStudents: any[] = [];
    for (const table of schedule.tables) {
      for (const student of table.students) {
        scheduleStudents.push({
          ...student,
          scheduleLabel: schedule.label,
          facilitatorName: table.facilitator.name,
          tableName: table.name,
        });
      }
    }

    if (scheduleStudents.length === 0) continue;

    // Sheet name max 31 chars, no special chars
    const sheetName = translateLabel(schedule.label)
    .replace(/[*?:\\/\[\]]/g, "")
    .slice(0, 31);
    const scheduleSheet = workbook.addWorksheet(sheetName);
    buildSheet(scheduleSheet, scheduleStudents);
  }

  // ── Generate buffer ─────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  const date = new Date().toISOString().split("T")[0];
  const filename = `alumnos_${date}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}