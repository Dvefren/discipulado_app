import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── Helpers ────────────────────────────────────────────

function parseDateOrNull(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  // Append noon UTC to avoid timezone day-shifting
  return new Date(value + "T12:00:00Z");
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

// Build the Prisma data object from a request body.
// Only includes fields that were actually provided (undefined = skip).
function buildStudentData(body: Record<string, any>) {
  const data: Record<string, any> = {};

  // Datos personales
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
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
  if (body.tableId !== undefined) data.tableId = body.tableId || null;

  return data;
}

// ─── POST: create student ───────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY" && role !== "SCHEDULE_LEADER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();

  if (!body.firstName || !body.lastName) {
    return NextResponse.json(
      { error: "Nombre y apellido son requeridos" },
      { status: 400 }
    );
  }

  const data = buildStudentData(body);

  // firstName and lastName are required at create time, ensure they're present
  data.firstName = body.firstName;
  data.lastName = body.lastName;

  const student = await prisma.student.create({ data: data as any });
  return NextResponse.json(student, { status: 201 });
}

// ─── PATCH: update student / bulk assign / quit / reactivate ───

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, action } = body;

  // ─── Bulk assign ──────────────────────────────────────
  if (action === "bulkAssign") {
    const { studentIds, tableId } = body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds requerido" }, { status: 400 });
    }
    if (!tableId) {
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

  if (!id) {
    return NextResponse.json({ error: "ID del alumno requerido" }, { status: 400 });
  }

  // ─── Mark as Baja (quit) ───────────────────────────────
  if (action === "quit") {
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: "QUIT",
        quitDate: body.quitDate
          ? new Date(body.quitDate + "T12:00:00Z")
          : new Date(),
        quitReason: body.quitReason || null,
      },
    });
    return NextResponse.json(student);
  }

  // ─── Reactivate student ────────────────────────────────
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

  // ─── Normal update ─────────────────────────────────────
  const data = buildStudentData(body);

  const student = await prisma.student.update({
    where: { id },
    data: data as any,
  });
  return NextResponse.json(student);
}

// ─── DELETE: remove student permanently ─────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID del alumno requerido" }, { status: 400 });
  }
  await prisma.attendance.deleteMany({ where: { studentId: id } });
  await prisma.student.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}