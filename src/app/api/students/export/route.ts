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
                include: { attendance: true },
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

  // ── Helpers ─────────────────────────────────────────────
  const translateLabel = (label: string) =>
    label.replace("Wednesday", "Miércoles").replace("Sunday", "Domingo");

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("es-MX") : "";

  const fmtBool = (b: boolean | null | undefined) =>
    b === true ? "Sí" : b === false ? "No" : "";

  const fmtGender = (g: string | null | undefined) =>
    g === "MALE" ? "Masculino" : g === "FEMALE" ? "Femenino" : "";

  const fmtAddress = (street: string | null, num: string | null) =>
    [street, num].filter(Boolean).join(" ");

  // Attendance helpers
  const countAttended = (attendance: any[]) =>
    attendance.filter((a) =>
      ["PRESENT", "PREVIEWED", "RECOVERED"].includes(a.status)
    ).length;

  const computePercent = (attendance: any[]) => {
    const total = attendance.length;
    if (total === 0) return 0;
    return Math.round((countAttended(attendance) / total) * 100);
  };

  // ── Workbook setup ──────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Discipulado App";
  workbook.created = new Date();

  // ── Style helpers ───────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  const sectionFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF374151" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };

  // ── Column definition ──────────────────────────────────
  // Grouped into sections: Identificación / Datos / Domicilio / Iglesia / Asistencia / Administrativo
  type Col = { header: string; width: number; section: string };
  const columns: Col[] = [
    // Identificación
    { header: "Nombre", width: 18, section: "Identificación" },
    { header: "Apellido", width: 18, section: "Identificación" },
    { header: "Horario", width: 16, section: "Identificación" },
    { header: "Facilitador", width: 18, section: "Identificación" },
    { header: "Mesa", width: 12, section: "Identificación" },
    { header: "Estado", width: 10, section: "Identificación" },
    // Datos personales
    { header: "Sexo", width: 12, section: "Datos" },
    { header: "Fecha de nacimiento", width: 16, section: "Datos" },
    { header: "Estado civil", width: 14, section: "Datos" },
    { header: "¿Es madre?", width: 10, section: "Datos" },
    { header: "¿Es padre?", width: 10, section: "Datos" },
    { header: "Email", width: 26, section: "Datos" },
    { header: "Lugar de nacimiento", width: 18, section: "Datos" },
    { header: "Fecha de ingreso", width: 14, section: "Datos" },
    // Domicilio
    { header: "Calle y número", width: 24, section: "Domicilio" },
    { header: "Colonia", width: 18, section: "Domicilio" },
    { header: "Celular", width: 14, section: "Domicilio" },
    { header: "Teléfono fijo", width: 14, section: "Domicilio" },
    { header: "Escolaridad", width: 16, section: "Domicilio" },
    { header: "Lugar de trabajo", width: 18, section: "Domicilio" },
    { header: "Vive con", width: 16, section: "Domicilio" },
    { header: "Contacto emergencia", width: 20, section: "Domicilio" },
    { header: "Tel. emergencia", width: 14, section: "Domicilio" },
    // Iglesia
    { header: "Aceptó a Cristo", width: 12, section: "Iglesia" },
    { header: "Bautizado", width: 10, section: "Iglesia" },
    { header: "Fecha de bautismo", width: 14, section: "Iglesia" },
    { header: "¿Cómo llegó?", width: 24, section: "Iglesia" },
    { header: "Propósito del curso", width: 28, section: "Iglesia" },
    { header: "Oración por", width: 24, section: "Iglesia" },
    { header: "Testimonio", width: 40, section: "Iglesia" },
    // Asistencia
    { header: "Asistencia %", width: 12, section: "Asistencia" },
    { header: "Asistencias", width: 12, section: "Asistencia" },
    // Administrativo
    { header: "Fecha de baja", width: 14, section: "Administrativo" },
    { header: "Razón de baja", width: 24, section: "Administrativo" },
  ];

  // ── Sheet builder ───────────────────────────────────────
  function buildSheet(
    sheet: ExcelJS.Worksheet,
    students: any[]
  ) {
    // Row 1 — section banner (merged across each section's columns)
    const sectionRow = sheet.addRow([]);
    let col = 1;
    const sectionGroups: { section: string; start: number; end: number }[] = [];
    let currentSection = "";
    let sectionStart = 1;

    columns.forEach((c, idx) => {
      if (c.section !== currentSection) {
        if (currentSection) {
          sectionGroups.push({ section: currentSection, start: sectionStart, end: idx });
        }
        currentSection = c.section;
        sectionStart = idx + 1;
      }
    });
    sectionGroups.push({ section: currentSection, start: sectionStart, end: columns.length });

    for (const group of sectionGroups) {
      sheet.mergeCells(1, group.start, 1, group.end);
      const cell = sheet.getCell(1, group.start);
      cell.value = group.section;
      cell.fill = sectionFill;
      cell.font = { ...headerFont, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderStyle;
    }
    sectionRow.height = 22;

    // Row 2 — column headers
    const headerRow = sheet.addRow(columns.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = borderStyle;
    });
    headerRow.height = 28;

    // Data rows
    for (const s of students) {
      const pct = computePercent(s.attendance);
      const attended = countAttended(s.attendance);
      const total = s.attendance.length;

      const row = sheet.addRow([
        // Identificación
        s.firstName,
        s.lastName,
        translateLabel(s.scheduleLabel),
        s.facilitatorName,
        s.tableName,
        s.status === "QUIT" ? "Baja" : "Activo",
        // Datos personales
        fmtGender(s.gender),
        fmtDate(s.birthdate),
        s.maritalStatus || "",
        fmtBool(s.isMother),
        fmtBool(s.isFather),
        s.email || "",
        s.placeOfBirth || "",
        fmtDate(s.enrollmentDate),
        // Domicilio
        fmtAddress(s.street, s.streetNumber),
        s.neighborhood || "",
        s.cellPhone || "",
        s.landlinePhone || "",
        s.educationLevel || "",
        s.workplace || "",
        s.livingSituation || "",
        s.emergencyContactName || "",
        s.emergencyContactPhone || "",
        // Iglesia
        fmtBool(s.acceptedChrist),
        fmtBool(s.isBaptized),
        fmtDate(s.baptismDate),
        s.howArrivedToChurch || "",
        s.coursePurpose || "",
        s.prayerAddiction || "",
        s.testimony || "",
        // Asistencia
        pct / 100,
        `${attended}/${total}`,
        // Administrativo
        fmtDate(s.quitDate),
        s.quitReason || "",
      ]);

      row.eachCell((cell) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      });

      // Format % column (find it by header index)
      const pctColIdx = columns.findIndex((c) => c.header === "Asistencia %") + 1;
      const pctCell = row.getCell(pctColIdx);
      pctCell.numFmt = "0%";
      pctCell.alignment = { horizontal: "center", vertical: "middle" };

      // Asistencias column center-aligned
      const attendColIdx = columns.findIndex((c) => c.header === "Asistencias") + 1;
      row.getCell(attendColIdx).alignment = { horizontal: "center", vertical: "middle" };

      // Color the status cell
      const statusColIdx = columns.findIndex((c) => c.header === "Estado") + 1;
      const statusCell = row.getCell(statusColIdx);
      statusCell.alignment = { horizontal: "center", vertical: "middle" };
      if (s.status === "QUIT") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        statusCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      } else {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
        statusCell.font = { color: { argb: "FF065F46" }, bold: true };
      }

      // Bold Sí pills for boolean columns
      const boolHeaders = ["¿Es madre?", "¿Es padre?", "Aceptó a Cristo", "Bautizado"];
      for (const h of boolHeaders) {
        const idx = columns.findIndex((c) => c.header === h) + 1;
        const cell = row.getCell(idx);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (cell.value === "Sí") {
          cell.font = { color: { argb: "FF065F46" }, bold: true };
        } else if (cell.value === "No") {
          cell.font = { color: { argb: "FF6B7280" } };
        }
      }
    }

    // Freeze top two rows (section banner + headers) and name column
    sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];

    // Apply column widths
    columns.forEach((c, idx) => {
      sheet.getColumn(idx + 1).width = c.width;
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