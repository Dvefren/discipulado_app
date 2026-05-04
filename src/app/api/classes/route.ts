import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth"; 
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {

  const { error } = await requireAuth();
  if (error) return error;  

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          classes: {
            orderBy: { date: "asc" },
          },
          tables: {
            include: {
              _count: { select: { students: true } },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ classes: [], schedules: [] });
  }

  const schedules = course.schedules.map((s) => ({
    id: s.id,
    label: s.label,
  }));

  const targetSchedule = scheduleId
    ? course.schedules.find((s) => s.id === scheduleId)
    : course.schedules[0];

  if (!targetSchedule) {
    return NextResponse.json({ classes: [], schedules });
  }

  const totalStudents = targetSchedule.tables.reduce((sum, t) => sum + t._count.students, 0);

  // Get attendance counts for all classes in this schedule
  const classIds = targetSchedule.classes.map((c) => c.id);
  const attendanceCounts = await prisma.attendance.groupBy({
    by: ["classId"],
    where: { classId: { in: classIds } },
    _count: { _all: true },
  });
  const presentCounts = await prisma.attendance.groupBy({
    by: ["classId"],
    where: { classId: { in: classIds }, status: "PRESENT" },
    _count: { _all: true },
  });

  const totalMap = new Map(attendanceCounts.map((a) => [a.classId, a._count._all]));
  const presentMap = new Map(presentCounts.map((a) => [a.classId, a._count._all]));

  const classes = targetSchedule.classes
    .map((c) => {
      const totalMarked = totalMap.get(c.id) || 0;
      const presentCount = presentMap.get(c.id) || 0;
      const percent = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : null;
      const classNum = parseInt(c.name.match(/\d+/)?.[0] || "0");

      return {
        id: c.id,
        number: classNum,
        name: c.name,
        topic: c.topic || null,
        date: c.date.toISOString().split("T")[0],
        dateFormatted: c.date.getUTCFullYear() === 2099
          ? "TBD"
          : c.date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }),
        isTbd: c.date.getUTCFullYear() === 2099,
        totalMarked,
        presentCount,
        totalStudents,
        attendancePercent: percent,
        scheduleId: targetSchedule.id,
      };
    })
    .sort((a, b) => a.number - b.number);

  return NextResponse.json({ classes, schedules });
}