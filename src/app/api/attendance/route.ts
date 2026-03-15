import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const classId = searchParams.get("classId");

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          classes: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ schedules: [], classes: [], students: [] });
  }

  const schedules = course.schedules.map((s) => ({
    id: s.id,
    label: s.label,
  }));

  const selectedSchedule = scheduleId
    ? course.schedules.find((s) => s.id === scheduleId)
    : null;

  const classes = selectedSchedule
    ? selectedSchedule.classes.map((c) => ({
        id: c.id,
        name: c.name,
        topic: c.topic,
        date: c.date.toISOString().split("T")[0],
        dateFormatted: c.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }))
    : [];

  let students: any[] = [];
  if (classId && scheduleId) {
    const tables = await prisma.facilitatorTable.findMany({
      where: { scheduleId },
      include: {
        facilitator: true,
        students: {
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          include: {
            attendance: {
              where: { classId },
              include: { altSchedule: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    students = tables.flatMap((table) =>
      table.students.map((student) => {
        const record = student.attendance[0] || null;
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          tableName: table.name,
          facilitatorName: table.facilitator.name,
          status: record ? record.status : null,
          absentReason: record?.absentReason || null,
          absentNote: record?.absentNote || null,
          altScheduleId: record?.altScheduleId || null,
          altScheduleLabel: record?.altSchedule?.label || null,
          hasRecord: !!record,
        };
      })
    );
  }

  let classSummary: any[] = [];
  if (scheduleId && selectedSchedule) {
    const classIds = selectedSchedule.classes.map((c) => c.id);
    const totalStudents = await prisma.student.count({
      where: { table: { scheduleId } },
    });

    if (totalStudents > 0) {
      const attendanceCounts = await prisma.attendance.groupBy({
        by: ["classId"],
        where: {
          classId: { in: classIds },
          status: "PRESENT",
        },
        _count: { status: true },
      });

      const countMap = new Map(
        attendanceCounts.map((a) => [a.classId, a._count.status])
      );

      classSummary = selectedSchedule.classes.map((c) => ({
        classId: c.id,
        presentCount: countMap.get(c.id) || 0,
        totalStudents,
      }));
    }
  }

  return NextResponse.json({ schedules, classes, students, classSummary });
}