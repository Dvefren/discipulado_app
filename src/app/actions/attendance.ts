"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus, AbsentReason } from "../../generated/prisma/client";

const MAX_RECORDS_PER_CALL = 200;
const VALID_STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "PREVIEWED", "RECOVERED"];
const VALID_ABSENT_REASONS: AbsentReason[] = ["SICK", "WORK", "PERSONAL", "TRAVEL", "OTHER"];

export async function saveAttendance(data: {
  classId: string;
  records: {
    studentId: string;
    status: AttendanceStatus;
    absentReason?: AbsentReason | null;
    absentNote?: string | null;
    altScheduleId?: string | null;
    altTableId?: string | null;
  }[];
}) {
  // ── 1. Auth ────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const scope = await getUserScope();
  if (!scope) {
    throw new Error("Unauthorized");
  }

  // 🛡️ Solo ciertos roles pueden marcar asistencia
  if (!["ADMIN", "SECRETARY", "FACILITATOR", "SCHEDULE_LEADER"].includes(scope.role)) {
    throw new Error("No tienes permiso para marcar asistencia");
  }

  // ── 2. Validación de input ─────────────────────────────
  if (!data.classId || typeof data.classId !== "string") {
    throw new Error("classId requerido");
  }
  if (!Array.isArray(data.records) || data.records.length === 0) {
    throw new Error("Records requeridos");
  }
  if (data.records.length > MAX_RECORDS_PER_CALL) {
    throw new Error(`Máximo ${MAX_RECORDS_PER_CALL} alumnos por operación`);
  }

  // ── 3. Verificar la clase y su horario ─────────────────
  const classRecord = await prisma.class.findUnique({
    where: { id: data.classId },
    select: { id: true, scheduleId: true },
  });
  if (!classRecord) {
    throw new Error("Clase no encontrada");
  }

  // 🛡️ El usuario solo puede marcar clases de horarios que tiene asignados
  if (
    scope.role !== "ADMIN" &&
    !scope.scheduleIds.includes(classRecord.scheduleId)
  ) {
    throw new Error("No puedes marcar asistencia en este horario");
  }

  // ── 4. Verificar que todos los alumnos pertenecen al usuario ─
  const studentIds = data.records.map((r) => r.studentId);

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      table: { select: { id: true, scheduleId: true, facilitatorId: true } },
    },
  });

  // Validar que todos los alumnos solicitados existen
  if (students.length !== studentIds.length) {
    throw new Error("Uno o más alumnos no existen");
  }

  // 🛡️ Cada alumno debe estar dentro del scope del usuario
  for (const student of students) {
    if (!student.table) {
      throw new Error(`Alumno ${student.id} no está asignado a una mesa`);
    }

    // El alumno debe pertenecer al horario de la clase
    if (student.table.scheduleId !== classRecord.scheduleId) {
      throw new Error(
        `Alumno ${student.id} no pertenece al horario de esta clase`
      );
    }

    // FACILITATOR: solo puede marcar alumnos de SUS mesas
    if (scope.role === "FACILITATOR") {
      if (!scope.tableIds.includes(student.table.id)) {
        throw new Error(
          `No puedes marcar asistencia de alumnos que no son tuyos`
        );
      }
    }
    // SECRETARY: ya validamos que la clase es de su horario;
    // dentro del horario puede marcar a todos.
  }

  // ── 5. Validar y procesar cada record ──────────────────
  const operations = data.records.map((record) => {
    // Validar status
    if (!VALID_STATUSES.includes(record.status)) {
      throw new Error(`Status inválido: ${record.status}`);
    }

    // Validar absentReason si aplica
    if (record.status === "ABSENT" && record.absentReason) {
      if (!VALID_ABSENT_REASONS.includes(record.absentReason)) {
        throw new Error(`Razón de ausencia inválida: ${record.absentReason}`);
      }
    }

    // Validar absentNote
    if (record.absentNote && typeof record.absentNote === "string") {
      if (record.absentNote.length > 500) {
        throw new Error("La nota de ausencia es demasiado larga (máx 500)");
      }
    }

    // Validar campos alt
    const needsAlt = record.status === "PREVIEWED" || record.status === "RECOVERED";
    const altScheduleId = needsAlt ? record.altScheduleId ?? null : null;
    const altTableId = needsAlt ? record.altTableId ?? null : null;

    if (needsAlt && (!altScheduleId || !altTableId)) {
      throw new Error(
        `Adelantó/Recuperó requiere horario y facilitador (alumno ${record.studentId})`
      );
    }

    return prisma.attendance.upsert({
      where: {
        studentId_classId: {
          studentId: record.studentId,
          classId: data.classId,
        },
      },
      create: {
        studentId: record.studentId,
        classId: data.classId,
        status: record.status,
        absentReason: record.status === "ABSENT" ? record.absentReason : null,
        absentNote: record.status === "ABSENT" ? record.absentNote : null,
        altScheduleId,
        altTableId,
        markedById: session.user.id,
      },
      update: {
        status: record.status,
        absentReason: record.status === "ABSENT" ? record.absentReason : null,
        absentNote: record.status === "ABSENT" ? record.absentNote : null,
        altScheduleId,
        altTableId,
        markedById: session.user.id,
      },
    });
  });

  // ── 6. Verificar IDs alt (si aplican) ──────────────────
  // Si algún record usa altScheduleId/altTableId, validamos que existen
  const altScheduleIds = [
    ...new Set(
      data.records
        .map((r) => r.altScheduleId)
        .filter((id): id is string => !!id)
    ),
  ];
  const altTableIds = [
    ...new Set(
      data.records
        .map((r) => r.altTableId)
        .filter((id): id is string => !!id)
    ),
  ];

  if (altScheduleIds.length > 0) {
    const found = await prisma.schedule.count({
      where: { id: { in: altScheduleIds } },
    });
    if (found !== altScheduleIds.length) {
      throw new Error("Uno o más horarios alternos no existen");
    }
  }
  if (altTableIds.length > 0) {
    const found = await prisma.facilitatorTable.count({
      where: { id: { in: altTableIds } },
    });
    if (found !== altTableIds.length) {
      throw new Error("Uno o más facilitadores alternos no existen");
    }
  }

  // ── 7. Ejecutar todo en una transacción ────────────────
  await prisma.$transaction(operations);

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}