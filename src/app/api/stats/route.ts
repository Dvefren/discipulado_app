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
  if (allClassIds.length === 0) {
    return NextResponse.json({
      courseName: course.name,
      startDate: course.startDate.toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
      endDate: course.endDate.toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" }),
      totalStudents, totalFacilitators, scheduleCount: schedules.length,
      overallAttendance: null, attendanceTrend: [],
      studentsPerSchedule: schedules.map((s) => ({
        schedule: s.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
        students: getFilteredTables(s.tables).reduce((sum, t) => sum + t._count.students, 0),
      })),
      attendanceBySchedule: [], reasonsBreakdown: [],
      topFacilitators: [], bottomFacilitators: [],
      heatmapData: [], recentClasses: [], role: scope.role,
    });
  }

  // Build student filter for scoped queries
  let studentFilter: any = {};
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    studentFilter.table = { scheduleId: { in: scope.scheduleIds } };
  }
  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    studentFilter.tableId = { in: scope.tableIds };
  }

  // ─── BULK QUERIES (all in parallel) ────────────────────
  // Instead of 200+ sequential queries, we do ~6 bulk queries

  const [
    // 1. All attendance grouped by classId + status
    attendanceByClass,
    // 2. Absent reasons breakdown
    absentReasons,
    // 3. All students with their tableId (for facilitator stats)
    allStudentsWithTable,
    // 4. All attendance records with studentId (for facilitator stats)
    attendanceByStudent,
  ] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["classId", "status"],
      where: { classId: { in: allClassIds }, student: studentFilter },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["absentReason"],
      where: { classId: { in: allClassIds }, status: "ABSENT", student: studentFilter },
      _count: { _all: true },
    }),
    prisma.student.findMany({
      where: Object.keys(studentFilter).length > 0 ? studentFilter : { table: { scheduleId: { in: schedules.map((s) => s.id) } } },
      select: { id: true, tableId: true },
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { classId: { in: allClassIds }, student: studentFilter },
      _count: { _all: true },
    }),
  ]);

  // ─── BUILD LOOKUP MAPS ─────────────────────────────────

  // classId → { total, present }
  const classStatsMap = new Map<string, { total: number; present: number }>();
  for (const row of attendanceByClass) {
    const entry = classStatsMap.get(row.classId) || { total: 0, present: 0 };
    entry.total += row._count._all;
    if (row.status === "PRESENT") entry.present += row._count._all;
    classStatsMap.set(row.classId, entry);
  }

  // studentId → tableId
  const studentTableMap = new Map<string, string>();
  for (const s of allStudentsWithTable) {
    studentTableMap.set(s.id, s.tableId);
  }

  // tableId → { total, present }
  const tableStatsMap = new Map<string, { total: number; present: number }>();
  for (const row of attendanceByStudent) {
    const tableId = studentTableMap.get(row.studentId);
    if (!tableId) continue;
    const entry = tableStatsMap.get(tableId) || { total: 0, present: 0 };
    entry.total += row._count._all;
    if (row.status === "PRESENT") entry.present += row._count._all;
    tableStatsMap.set(tableId, entry);
  }

  // ─── COMPUTE STATS FROM MAPS (no more DB calls) ───────

  // Overall attendance
  let totalAttendanceRecords = 0;
  let totalPresentRecords = 0;
  for (const stats of classStatsMap.values()) {
    totalAttendanceRecords += stats.total;
    totalPresentRecords += stats.present;
  }
  const overallAttendance = totalAttendanceRecords > 0
    ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100)
    : null;

  // Attendance trend (first schedule only)
  const attendanceTrend: any[] = [];
  if (schedules.length > 0) {
    for (const cls of schedules[0].classes) {
      const stats = classStatsMap.get(cls.id);
      if (stats && stats.total > 0) {
        const classNum = parseInt(cls.name.match(/\d+/)?.[0] || "0");
        attendanceTrend.push({
          className: cls.topic || cls.name,
          label: `C${classNum}`,
          classNum,
          present: stats.present,
          total: stats.total,
          percent: Math.round((stats.present / stats.total) * 100),
        });
      }
    }
    attendanceTrend.sort((a, b) => a.classNum - b.classNum);
  }

  // Students per schedule
  const studentsPerSchedule = schedules.map((s) => ({
    schedule: s.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
    students: getFilteredTables(s.tables).reduce((sum, t) => sum + t._count.students, 0),
  }));

  // Attendance by schedule
  const attendanceBySchedule = schedules.map((schedule) => {
    const sClassIds = new Set(schedule.classes.map((c) => c.id));
    let sTotal = 0;
    let sPresent = 0;
    for (const [classId, stats] of classStatsMap) {
      if (sClassIds.has(classId)) {
        sTotal += stats.total;
        sPresent += stats.present;
      }
    }
    return {
      schedule: schedule.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
      percent: sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0,
      present: sPresent,
      total: sTotal,
    };
  });

  // Absent reasons
  const reasonsBreakdown = absentReasons
    .filter((r) => r.absentReason)
    .map((r) => ({
      reason: r.absentReason!.charAt(0) + r.absentReason!.slice(1).toLowerCase(),
      count: r._count._all,
    }));
  const noReasonCount = absentReasons
    .filter((r) => !r.absentReason)
    .reduce((sum, r) => sum + r._count._all, 0);
  if (noReasonCount > 0) reasonsBreakdown.push({ reason: "Sin razón", count: noReasonCount });

  // Facilitator rankings
  const allFacilitatorStats: any[] = [];
  for (const schedule of schedules) {
    for (const table of getFilteredTables(schedule.tables)) {
      if (table._count.students === 0) continue;
      const stats = tableStatsMap.get(table.id) || { total: 0, present: 0 };
      allFacilitatorStats.push({
        name: table.facilitator.name,
        schedule: schedule.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
        students: table._count.students,
        percent: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        present: stats.present,
        total: stats.total,
      });
    }
  }
  const topFacilitators = [...allFacilitatorStats].filter((f) => f.total > 0).sort((a, b) => b.percent - a.percent).slice(0, 5);
  const bottomFacilitators = [...allFacilitatorStats].filter((f) => f.total > 0).sort((a, b) => a.percent - b.percent).slice(0, 5);

  // Heatmap
  const heatmapData: any[] = [];
  for (const schedule of schedules) {
    for (const cls of schedule.classes) {
      const stats = classStatsMap.get(cls.id);
      if (stats && stats.total > 0) {
        const classNum = parseInt(cls.name.match(/\d+/)?.[0] || "0");
        heatmapData.push({
          schedule: schedule.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
          classNum,
          className: `C${classNum}`,
          percent: Math.round((stats.present / stats.total) * 100),
          present: stats.present,
          total: stats.total,
        });
      }
    }
  }

  // Recent classes
  const now = new Date();
  const recentClassesMap = new Map<string, { name: string; schedules: any[] }>();
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
      const stats = classStatsMap.get(cls.id);
      if (stats && stats.total > 0) {
        const key = cls.name;
        if (!recentClassesMap.has(key)) {
          recentClassesMap.set(key, { name: cls.name, schedules: [] });
        }
        recentClassesMap.get(key)!.schedules.push({
          schedule: schedule.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
          date: cls.date.toLocaleDateString("es-MX", { month: "short", day: "numeric", timeZone: "UTC" }),
          present: stats.present,
          total: stats.total,
          percent: Math.round((stats.present / stats.total) * 100),
        });
      }
    }
  }

  return NextResponse.json({
    courseName: course.name,
    startDate: course.startDate.toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
    endDate: course.endDate.toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" }),
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
    recentClasses: [...recentClassesMap.values()],
    role: scope.role,
  });
}