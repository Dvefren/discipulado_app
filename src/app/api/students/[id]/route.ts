import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      table: {
        include: {
          facilitator: true,
        },
      },
      attendance: {
        include: {
          class: true,
          altSchedule: true,
        },
        orderBy: { class: { date: "asc" } },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check scope access
  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    if (!scope.tableIds.includes(student.tableId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    if (!scope.scheduleIds.includes(student.table.scheduleId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  // Get schedule label
  const schedule = await prisma.schedule.findUnique({
    where: { id: student.table.scheduleId },
  });

  // Get all classes for this schedule to show full attendance history
  const allClasses = await prisma.class.findMany({
    where: { scheduleId: student.table.scheduleId },
    orderBy: { date: "asc" },
  });

  // Build attendance map
  const attendanceMap = new Map(
    student.attendance.map((a) => [a.classId, a])
  );

  const attendanceHistory = allClasses.map((cls) => {
    const record = attendanceMap.get(cls.id);
    return {
      classId: cls.id,
      className: cls.topic || cls.name,
      date: cls.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      status: record ? record.status : null,
      absentReason: record?.absentReason || null,
      absentNote: record?.absentNote || null,
      altScheduleLabel: record?.altSchedule?.label || null,
    };
  });

  // Calculate attendance stats
  const totalClasses = attendanceHistory.length;
  const markedClasses = attendanceHistory.filter((a) => a.status !== null).length;
  const presentClasses = attendanceHistory.filter((a) => a.status === "PRESENT").length;
  const absentClasses = attendanceHistory.filter((a) => a.status === "ABSENT").length;
  const previewedClasses = attendanceHistory.filter((a) => a.status === "PREVIEWED").length;
  const recoveredClasses = attendanceHistory.filter((a) => a.status === "RECOVERED").length;
  const attendancePercent = markedClasses > 0 ? Math.round((presentClasses / markedClasses) * 100) : null;

  return NextResponse.json({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    birthdate: student.birthdate ? student.birthdate.toISOString().split("T")[0] : null,
    birthdateFormatted: student.birthdate
      ? student.birthdate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
      : null,
    phone: student.phone,
    address: student.address,
    profileNotes: student.profileNotes || {},
    tableName: student.table.name,
    facilitatorName: student.table.facilitator.name,
    scheduleLabel: schedule?.label || "Unknown",
    attendanceHistory,
    stats: {
      totalClasses,
      markedClasses,
      presentClasses,
      absentClasses,
      previewedClasses,
      recoveredClasses,
      attendancePercent,
    },
  });
}