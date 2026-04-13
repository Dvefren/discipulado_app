"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus, AbsentReason } from "../../generated/prisma/client";

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
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  for (const record of data.records) {
    const needsAlt = record.status === "PREVIEWED" || record.status === "RECOVERED";
    const altScheduleId = needsAlt ? record.altScheduleId ?? null : null;
    const altTableId = needsAlt ? record.altTableId ?? null : null;

    // Validate: if marking Adelantó/Recuperó, both alt fields are required
    if (needsAlt && (!altScheduleId || !altTableId)) {
      throw new Error(
        `Adelantó/Recuperó requires both schedule and facilitator (student ${record.studentId})`
      );
    }

    await prisma.attendance.upsert({
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
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}