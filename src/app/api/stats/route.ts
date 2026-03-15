import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { NextResponse } from "next/server";

export async function GET() {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          tables: {
            include: {
              facilitator: true,
              _count: { select: { students: true } },
            },
          },
          classes: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ empty: true });

  // Filter schedules by scope
  let schedules = course.schedules;
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    schedules = schedules.filter((s) => scope.scheduleIds.includes(s.id));
  }

  // Filter tables for facilitators
  const getFilteredTables = (scheduleTables: typeof schedules[0]["tables"]) => {
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      return scheduleTables.filter((t) => scope.tableIds.includes(t.id));
    }
    return scheduleTables;
  };

  // --- 1. Basic counts ---
  const totalStudents = schedules.reduce((sum, s) => sum + getFilteredTables(s.tables).reduce((ts, t) => ts + t._count.students, 0), 0);
  const totalFacilitators = schedules.reduce((sum, s) => sum + getFilteredTables(s.tables).length, 0);

  // --- 2. Overall attendance percentage ---
  const allClassIds = schedules.flatMap((s) => s.classes.map((c) => c.id));

  let studentFilter: any = {};
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    studentFilter.table = { scheduleId: { in: scope.scheduleIds } };
  }
  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    studentFilter.tableId = { in: scope.tableIds };
  }

  const totalAttendanceRecords = await prisma.attendance.count({
    where: {
      classId: { in: allClassIds },
      student: studentFilter,
    },
  });

  const presentRecords = await prisma.attendance.count({
    where: {
      classId: { in: allClassIds },
      status: "PRESENT",
      student: studentFilter,
    },
  });

  const overallAttendance = totalAttendanceRecords > 0
    ? Math.round((presentRecords / totalAttendanceRecords) * 100)
    : null;

  // --- 3. Attendance trend (per class over time) ---
  const attendanceTrend: { className: string; date: string; present: number; total: number; percent: number }[] = [];

  for (const schedule of schedules) {
    // Use first schedule's classes for the trend line (they share topics)
    if (schedules.indexOf(schedule) > 0) continue;

    for (const cls of schedule.classes) {
      const totalMarked = await prisma.attendance.count({
        where: { classId: cls.id, student: studentFilter },
      });
      const presentInClass = await prisma.attendance.count({
        where: { classId: cls.id, status: "PRESENT", student: studentFilter },
      });

      if (totalMarked > 0) {
        attendanceTrend.push({
          className: cls.topic || cls.name,
          date: cls.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
          present: presentInClass,
          total: totalMarked,
          percent: Math.round((presentInClass / totalMarked) * 100),
        });
      }
    }
  }

  // --- 4. Students per schedule (bar chart) ---
  const studentsPerSchedule = schedules.map((s) => ({
    schedule: s.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
    students: getFilteredTables(s.tables).reduce((sum, t) => sum + t._count.students, 0),
  }));

  // --- 5. Top facilitators by attendance % ---
  const facilitatorStats: { name: string; schedule: string; students: number; percent: number }[] = [];

  for (const schedule of schedules) {
    for (const table of getFilteredTables(schedule.tables)) {
      if (table._count.students === 0) continue;

      const studentIds = await prisma.student.findMany({
        where: { tableId: table.id },
        select: { id: true },
      });
      const ids = studentIds.map((s) => s.id);

      const totalMarked = await prisma.attendance.count({
        where: { studentId: { in: ids }, classId: { in: allClassIds } },
      });
      const presentMarked = await prisma.attendance.count({
        where: { studentId: { in: ids }, classId: { in: allClassIds }, status: "PRESENT" },
      });

      facilitatorStats.push({
        name: table.facilitator.name,
        schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
        students: table._count.students,
        percent: totalMarked > 0 ? Math.round((presentMarked / totalMarked) * 100) : 0,
      });
    }
  }

  const topFacilitators = facilitatorStats
    .filter((f) => f.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  // --- 6. Recent classes with attendance ---
  const recentClasses: { name: string; date: string; schedule: string; present: number; total: number }[] = [];

  const now = new Date();
  for (const schedule of schedules) {
    const pastClasses = schedule.classes
      .filter((c) => c.date <= now)
      .slice(-3);

    for (const cls of pastClasses) {
      const totalMarked = await prisma.attendance.count({
        where: { classId: cls.id, student: studentFilter },
      });
      const presentInClass = await prisma.attendance.count({
        where: { classId: cls.id, status: "PRESENT", student: studentFilter },
      });

      if (totalMarked > 0) {
        recentClasses.push({
          name: cls.topic || cls.name,
          date: cls.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
          schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
          present: presentInClass,
          total: totalMarked,
        });
      }
    }
  }

  return NextResponse.json({
    courseName: course.name,
    startDate: course.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    endDate: course.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    totalStudents,
    totalFacilitators,
    scheduleCount: schedules.length,
    overallAttendance,
    attendanceTrend,
    studentsPerSchedule,
    topFacilitators,
    recentClasses,
    role: scope.role,
  });
}