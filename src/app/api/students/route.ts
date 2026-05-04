import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

// ─── Helpers ────────────────────────────────────────────

function parseDateOrNull(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value + "T12:00:00Z");
  return isNaN(date.getTime()) ? null : date;
}

function strOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function boolOrNull(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function genderOrNull(value: unknown): "MALE" | "FEMALE" | null {
  if (value === "MALE" || value === "FEMALE") return value;
  return null;
}

// Validar que un string sea válido como nombre/apellido
function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 100;
}

function buildStudentData(body: Record<string, any>) {
  const data: Record<string, any> = {};

  // Datos personales
  if (body.firstName !== undefined) data.firstName = strOrNull(body.firstName);
  if (body.lastName !== undefined) data.lastName = strOrNull(body.lastName);
  if (body.birthdate !== undefined) data.birthdate = parseDateOrNull(body.birthdate);
  if (body.gender !== undefined) data.gender = genderOrNull(body.gender);
  if (body.maritalStatus !== undefined) data.maritalStatus = strOrNull(body.maritalStatus);
  if (body.isMother !== undefined) data.isMother = boolOrNull(body.isMother);
  if (body.isFather !== undefined) data.isFather = boolOrNull(body.isFather);
  if (body.email !== undefined) data.email = strOrNull(body.email);
  if (body.placeOfBirth !== undefined) data.placeOfBirth = strOrNull(body.placeOfBirth);

  // Domicilio
  if (body.street !== undefined) data.street = strOrNull(body.street);
  if (body.streetNumber !== undefined) data.streetNumber = strOrNull(body.streetNumber);
  if (body.neighborhood !== undefined) data.neighborhood = strOrNull(body.neighborhood);
  if (body.cellPhone !== undefined) data.cellPhone = strOrNull(body.cellPhone);
  if (body.landlinePhone !== undefined) data.landlinePhone = strOrNull(body.landlinePhone);
  if (body.educationLevel !== undefined) data.educationLevel = strOrNull(body.educationLevel);
  if (body.workplace !== undefined) data.workplace = strOrNull(body.workplace);
  if (body.livingSituation !== undefined) data.livingSituation = strOrNull(body.livingSituation);
  if (body.emergencyContactName !== undefined) data.emergencyContactName = strOrNull(body.emergencyContactName);
  if (body.emergencyContactPhone !== undefined) data.emergencyContactPhone = strOrNull(body.emergencyContactPhone);

  // Iglesia
  if (body.acceptedChrist !== undefined) data.acceptedChrist = boolOrNull(body.acceptedChrist);
  if (body.isBaptized !== undefined) data.isBaptized = boolOrNull(body.isBaptized);
  if (body.baptismDate !== undefined) data.baptismDate = parseDateOrNull(body.baptismDate);
  if (body.howArrivedToChurch !== undefined) data.howArrivedToChurch = strOrNull(body.howArrivedToChurch);
  if (body.coursePurpose !== undefined) data.coursePurpose = strOrNull(body.coursePurpose);
  if (body.prayerAddiction !== undefined) data.prayerAddiction = strOrNull(body.prayerAddiction);
  if (body.testimony !== undefined) data.testimony = strOrNull(body.testimony);

  // Metadata
  if (body.enrollmentDate !== undefined) data.enrollmentDate = parseDateOrNull(body.enrollmentDate);

  // Assignment
  if (body.tableId !== undefined) {
    data.tableId = body.tableId && typeof body.tableId === "string" ? body.tableId : null;
  }

  return data;
}

// ─── POST: create student ───────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "SECRETARY", "SCHEDULE_LEADER"]);
  if (error) return error;

  const body = await req.json();

  if (!isValidName(body.firstName) || !isValidName(body.lastName)) {
    return NextResponse.json(
      { error: "Nombre y apellido son requeridos (1-100 caracteres)" },
      { status: 400 }
    );
  }

  // Validar tableId si se provee
  if (body.tableId) {
    const table = await prisma.facilitatorTable.findUnique({ where: { id: body.tableId } });
    if (!table) {
      return NextResponse.json({ error: "Mesa/facilitador no encontrado" }, { status: 400 });
    }
  }

  const data = buildStudentData(body);
  data.firstName = body.firstName.trim();
  data.lastName = body.lastName.trim();

  const student = await prisma.student.create({ data: data as any });
  return NextResponse.json(student, { status: 201 });
}

// ─── PATCH ──────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "SECRETARY"]);
  if (error) return error;

  const body = await req.json();
  const { id, action } = body;

  // ─── Bulk assign ──────────────────────────────────────
  if (action === "bulkAssign") {
    const { studentIds, tableId } = body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds requerido" }, { status: 400 });
    }
    if (studentIds.length > 500) {
      return NextResponse.json(
        { error: "Demasiados alumnos en una sola operación (máx 500)" },
        { status: 400 }
      );
    }
    if (!tableId || typeof tableId !== "string") {
      return NextResponse.json({ error: "tableId requerido" }, { status: 400 });
    }
    const table = await prisma.facilitatorTable.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: "Facilitador no encontrado" }, { status: 404 });
    }
    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { tableId },
    });
    return NextResponse.json({ ok: true, count: result.count });
  }

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID del alumno requerido" }, { status: 400 });
  }

  // Verificar que el estudiante existe
  const existingStudent = await prisma.student.findUnique({ where: { id } });
  if (!existingStudent) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  // ─── Quit ─────────────────────────────────────────────
  if (action === "quit") {
    const quitDate = body.quitDate ? parseDateOrNull(body.quitDate) : new Date();
    if (body.quitDate && !quitDate) {
      return NextResponse.json({ error: "Fecha de baja inválida" }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        status: "QUIT",
        quitDate: quitDate || new Date(),
        quitReason: strOrNull(body.quitReason),
      },
    });
    return NextResponse.json(student);
  }

  // ─── Reactivate ───────────────────────────────────────
  if (action === "reactivate") {
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: "ACTIVE",
        quitDate: null,
        quitReason: null,
      },
    });
    return NextResponse.json(student);
  }

  // ─── Normal update ────────────────────────────────────
  // Validar tableId si se provee
  if (body.tableId) {
    const table = await prisma.facilitatorTable.findUnique({ where: { id: body.tableId } });
    if (!table) {
      return NextResponse.json({ error: "Mesa/facilitador no encontrado" }, { status: 400 });
    }
  }

  // Validar nombres si se cambian
  if (body.firstName !== undefined && !isValidName(body.firstName)) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (body.lastName !== undefined && !isValidName(body.lastName)) {
    return NextResponse.json({ error: "Apellido inválido" }, { status: 400 });
  }

  const data = buildStudentData(body);

  const student = await prisma.student.update({
    where: { id },
    data: data as any,
  });
  return NextResponse.json(student);
}

// ─── DELETE ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]); // 🛡️ Solo ADMIN puede borrar permanentemente
  if (error) return error;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID del alumno requerido" }, { status: 400 });
  }

  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  // Borrar en transacción para evitar inconsistencias
  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { studentId: id } }),
    prisma.studentNote.deleteMany({ where: { studentId: id } }),
    prisma.studentRelationship.deleteMany({
      where: { OR: [{ studentAId: id }, { studentBId: id }] },
    }),
    prisma.student.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}