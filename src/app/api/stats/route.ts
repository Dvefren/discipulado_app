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

  let schedules = course.schedules;
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    schedules = schedules.filter((s) => scope.scheduleIds.includes(s.id));
  }

  const getFilteredTables = (tables: typeof schedules[0]["tables"]) => {
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      return tables.filter((t) => scope.tableIds.includes(t.id));
    }
    return tables;
  };

  const totalStudents = schedules.reduce((sum, s) => sum + getFilteredTables(s.tables).reduce((ts, t) => ts + t._count.students, 0), 0);
  const totalFacilitators = schedules.reduce((sum, s) => sum + getFilteredTables(s.tables).length, 0);

  const allClassIds = schedules.flatMap((s) => s.classes.map((c) => c.id));

  let studentFilter: any = {};
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    studentFilter.table = { scheduleId: { in: scope.scheduleIds } };
  }
  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    studentFilter.tableId = { in: scope.tableIds };
  }

  // Overall attendance
  const totalAttendanceRecords = await prisma.attendance.count({ where: { classId: { in: allClassIds }, student: studentFilter } });
  const presentRecords = await prisma.attendance.count({ where: { classId: { in: allClassIds }, status: "PRESENT", student: studentFilter } });
  const overallAttendance = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : null;

  // Attendance trend — sorted by class number
  const attendanceTrend: any[] = [];
  if (schedules.length > 0) {
    const firstSchedule = schedules[0];
    for (const cls of firstSchedule.classes) {
      const totalMarked = await prisma.attendance.count({ where: { classId: cls.id, student: studentFilter } });
      const presentInClass = await prisma.attendance.count({ where: { classId: cls.id, status: "PRESENT", student: studentFilter } });
      if (totalMarked > 0) {
        const classNum = parseInt(cls.name.match(/\d+/)?.[0] || "0");
        attendanceTrend.push({
          className: cls.topic || cls.name,
          label: `C${classNum}`,
          classNum,
          present: presentInClass,
          total: totalMarked,
          percent: Math.round((presentInClass / totalMarked) * 100),
        });
      }
    }
    attendanceTrend.sort((a, b) => a.classNum - b.classNum);
  }

  // Students per schedule
  const studentsPerSchedule = schedules.map((s) => ({
    schedule: s.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
    students: getFilteredTables(s.tables).reduce((sum, t) => sum + t._count.students, 0),
  }));

  // Attendance by schedule
  const attendanceBySchedule: any[] = [];
  for (const schedule of schedules) {
    const sClassIds = schedule.classes.map((c) => c.id);
    const sFilter: any = { ...studentFilter, table: { scheduleId: schedule.id } };
    const sTotal = await prisma.attendance.count({ where: { classId: { in: sClassIds }, student: sFilter } });
    const sPresent = await prisma.attendance.count({ where: { classId: { in: sClassIds }, status: "PRESENT", student: sFilter } });
    attendanceBySchedule.push({
      schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
      percent: sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0,
      present: sPresent,
      total: sTotal,
    });
  }

  // Absent reasons
  const absentReasons = await prisma.attendance.groupBy({
    by: ["absentReason"],
    where: { classId: { in: allClassIds }, status: "ABSENT", student: studentFilter },
    _count: { _all: true },
  });
  const reasonsBreakdown = absentReasons
    .filter((r) => r.absentReason)
    .map((r) => ({ reason: r.absentReason!.charAt(0) + r.absentReason!.slice(1).toLowerCase(), count: r._count._all }));
  const noReasonCount = absentReasons.filter((r) => !r.absentReason).reduce((sum, r) => sum + r._count._all, 0);
  if (noReasonCount > 0) reasonsBreakdown.push({ reason: "No reason", count: noReasonCount });

  // All facilitators ranked
  const allFacilitatorStats: any[] = [];
  for (const schedule of schedules) {
    for (const table of getFilteredTables(schedule.tables)) {
      if (table._count.students === 0) continue;
      const studentIds = await prisma.student.findMany({ where: { tableId: table.id }, select: { id: true } });
      const ids = studentIds.map((s) => s.id);
      const tTotal = await prisma.attendance.count({ where: { studentId: { in: ids }, classId: { in: allClassIds } } });
      const tPresent = await prisma.attendance.count({ where: { studentId: { in: ids }, classId: { in: allClassIds }, status: "PRESENT" } });
      allFacilitatorStats.push({
        name: table.facilitator.name,
        schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
        students: table._count.students,
        percent: tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : 0,
        present: tPresent,
        total: tTotal,
      });
    }
  }
  const topFacilitators = [...allFacilitatorStats].filter((f) => f.total > 0).sort((a, b) => b.percent - a.percent).slice(0, 5);
  const bottomFacilitators = [...allFacilitatorStats].filter((f) => f.total > 0).sort((a, b) => a.percent - b.percent).slice(0, 5);

  // Heatmap
  const heatmapData: any[] = [];
  for (const schedule of schedules) {
    for (const cls of schedule.classes) {
      const classNum = parseInt(cls.name.match(/\d+/)?.[0] || "0");
      const tTotal = await prisma.attendance.count({ where: { classId: cls.id, student: studentFilter } });
      const tPresent = await prisma.attendance.count({ where: { classId: cls.id, status: "PRESENT", student: studentFilter } });
      if (tTotal > 0) {
        heatmapData.push({
          schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
          classNum,
          className: `C${classNum}`,
          percent: Math.round((tPresent / tTotal) * 100),
          present: tPresent,
          total: tTotal,
        });
      }
    }
  }

  // Recent classes — grouped by class name, showing per-schedule breakdown
  const now = new Date();
  const recentClassesMap = new Map<string, { name: string; schedules: { schedule: string; date: string; present: number; total: number; percent: number }[] }>();

  for (const schedule of schedules) {
    const pastClasses = schedule.classes
      .filter((c) => c.date <= now && c.date.getUTCFullYear() !== 2099)
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
        return numA - numB;
      })
      .slice(-3);

    for (const cls of pastClasses) {
      const tTotal = await prisma.attendance.count({ where: { classId: cls.id, student: studentFilter } });
      const tPresent = await prisma.attendance.count({ where: { classId: cls.id, status: "PRESENT", student: studentFilter } });
      if (tTotal > 0) {
        const key = cls.name;
        if (!recentClassesMap.has(key)) {
          recentClassesMap.set(key, { name: cls.name, schedules: [] });
        }
        recentClassesMap.get(key)!.schedules.push({
          schedule: schedule.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
          date: cls.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
          present: tPresent,
          total: tTotal,
          percent: Math.round((tPresent / tTotal) * 100),
        });
      }
    }
  }
  const recentClasses = [...recentClassesMap.values()];

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
    attendanceBySchedule,
    reasonsBreakdown,
    topFacilitators,
    bottomFacilitators,
    heatmapData,
    recentClasses,
    role: scope.role,
  });
}