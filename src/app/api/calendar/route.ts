import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { NextResponse, NextRequest } from "next/server";

const EMPTY_RESPONSE = {
  classes: [],
  facilitatorBirthdays: [],
  studentBirthdays: [],
  courseEvents: [],
};

export async function GET(request: NextRequest) {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json(EMPTY_RESPONSE);

  const { searchParams } = new URL(request.url);

  // 🛡️ Validar year/month dentro de rangos razonables
  const yearRaw = parseInt(searchParams.get("year") || "");
  const monthRaw = parseInt(searchParams.get("month") || "");

  const year = isNaN(yearRaw) ? new Date().getFullYear() : yearRaw;
  const month = isNaN(monthRaw) ? new Date().getMonth() + 1 : monthRaw;

  if (year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get all schedules for label lookups
  const allSchedules = await prisma.schedule.findMany();
  const scheduleLabelMap = new Map(allSchedules.map((s) => [s.id, s.label]));

  // Classes for this month (filtered by scope)
  const classWhere: any = { date: { gte: startOfMonth, lte: endOfMonth } };
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    classWhere.scheduleId = { in: scope.scheduleIds };
  }

  const classes = await prisma.class.findMany({
    where: classWhere,
    orderBy: { date: "asc" },
  });

  // Group classes by day
  const classEvents = new Map<number, { topics: Set<string>; schedules: string[] }>();
  classes.forEach((c) => {
    const day = c.date.getUTCDate();
    if (!classEvents.has(day)) classEvents.set(day, { topics: new Set(), schedules: [] });
    const entry = classEvents.get(day)!;
    entry.topics.add(c.name);
    const label = scheduleLabelMap.get(c.scheduleId) || "Unknown";
    if (!entry.schedules.includes(label)) entry.schedules.push(label);
  });

  const classEventsList = Array.from(classEvents.entries()).map(([day, data]) => ({
    day, topics: Array.from(data.topics), schedules: data.schedules, type: "class" as const,
  }));

  // Facilitator birthdays
  const allFacilitators = await prisma.facilitator.findMany({
    where: { birthday: { not: null } },
    include: { tables: true },
  });

  const facilitatorBirthdays = allFacilitators
    .filter((f) => {
      if (!f.birthday) return false;
      if (f.birthday.getUTCMonth() + 1 !== month) return false;
      if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
        return f.tables.some((t) => scope.scheduleIds.includes(t.scheduleId));
      }
      return true;
    })
    .map((f) => ({
      id: f.id,
      name: f.name,
      day: f.birthday!.getUTCDate(),
      type: "facilitator_birthday" as const,
      schedule: f.tables[0] ? scheduleLabelMap.get(f.tables[0].scheduleId) || null : null,
    }));

  // Student birthdays
  const studentWhere: any = {
    birthdate: { not: null },
    tableId: { not: null },  // exclude "Por definir" students
  };
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    studentWhere.table = { scheduleId: { in: scope.scheduleIds } };
  }
  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    studentWhere.tableId = { in: scope.tableIds };
  }

  const allStudents = await prisma.student.findMany({
    where: studentWhere,
    include: {
      table: {
        include: { facilitator: true },
      },
    },
  });

  const studentBirthdays = allStudents
    .filter((s) => s.birthdate && s.table && s.birthdate.getUTCMonth() + 1 === month)
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      day: s.birthdate!.getUTCDate(),
      type: "student_birthday" as const,
      facilitator: s.table!.facilitator.name,
      schedule: scheduleLabelMap.get(s.table!.scheduleId) || null,
    }));

  // Course events (visible to all roles)
  const course = await prisma.course.findFirst({ where: { isActive: true } });
  const courseEvents: any[] = [];
  if (course) {
    const sm = course.startDate.getMonth() + 1;
    const sy = course.startDate.getFullYear();
    const em = course.endDate.getMonth() + 1;
    const ey = course.endDate.getFullYear();
    if (sm === month && sy === year) {
      courseEvents.push({ id: `course-start-${course.id}`, name: `${course.name} starts`, day: course.startDate.getDate(), type: "course_start" });
    }
    if (em === month && ey === year) {
      courseEvents.push({ id: `course-end-${course.id}`, name: `${course.name} ends`, day: course.endDate.getDate(), type: "course_end" });
    }
  }

  return NextResponse.json({ classes: classEventsList, facilitatorBirthdays, studentBirthdays, courseEvents });
}