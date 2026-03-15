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
  }[];
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  for (const record of data.records) {
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
        altScheduleId:
          record.status === "PREVIEWED" || record.status === "RECOVERED"
            ? record.altScheduleId
            : null,
        markedById: session.user.id,
      },
      update: {
        status: record.status,
        absentReason: record.status === "ABSENT" ? record.absentReason : null,
        absentNote: record.status === "ABSENT" ? record.absentNote : null,
        altScheduleId:
          record.status === "PREVIEWED" || record.status === "RECOVERED"
            ? record.altScheduleId
            : null,
        markedById: session.user.id,
      },
    });
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}