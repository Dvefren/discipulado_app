import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get classes for this month
  const classes = await prisma.class.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      schedule: true,
    },
    orderBy: { date: "asc" },
  });

  // Get facilitator birthdays for this month
  const facilitators = await prisma.facilitator.findMany({
    where: {
      birthday: { not: null },
    },
    include: {
      tables: {
        include: { schedule: true },
      },
    },
  });

  const facilitatorBirthdays = facilitators
    .filter((f) => {
      if (!f.birthday) return false;
      return f.birthday.getUTCMonth() + 1 === month;
    })
    .map((f) => ({
      id: f.id,
      name: f.name,
      day: f.birthday!.getUTCDate(),
      type: "facilitator_birthday" as const,
      schedule: f.tables[0]?.schedule?.label || null,
    }));

  // Get student birthdays for this month
  const students = await prisma.student.findMany({
    where: {
      birthdate: { not: null },
    },
    include: {
      table: {
        include: {
          facilitator: true,
          schedule: true,
        },
      },
    },
  });

  const studentBirthdays = students
    .filter((s) => {
      if (!s.birthdate) return false;
      return s.birthdate.getUTCMonth() + 1 === month;
    })
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      day: s.birthdate!.getUTCDate(),
      type: "student_birthday" as const,
      facilitator: s.table.facilitator.name,
      schedule: s.table.schedule.label,
    }));

  // Get active course for start/end dates
  const course = await prisma.course.findFirst({
    where: { isActive: true },
  });

  const courseEvents: any[] = [];
  if (course) {
    const startMonth = course.startDate.getMonth() + 1;
    const startYear = course.startDate.getFullYear();
    const endMonth = course.endDate.getMonth() + 1;
    const endYear = course.endDate.getFullYear();

    if (startMonth === month && startYear === year) {
      courseEvents.push({
        id: `course-start-${course.id}`,
        name: `${course.name} starts`,
        day: course.startDate.getDate(),
        type: "course_start" as const,
      });
    }
    if (endMonth === month && endYear === year) {
      courseEvents.push({
        id: `course-end-${course.id}`,
        name: `${course.name} ends`,
        day: course.endDate.getDate(),
        type: "course_end" as const,
      });
    }
  }

  // Group classes by day and deduplicate topics
  const classEvents = new Map<number, { topics: Set<string>; schedules: string[] }>();
  classes.forEach((c) => {
    const day = c.date.getDate();
    if (!classEvents.has(day)) {
      classEvents.set(day, { topics: new Set(), schedules: [] });
    }
    const entry = classEvents.get(day)!;
    entry.topics.add(c.topic || c.name);
    if (!entry.schedules.includes(c.schedule.label)) {
      entry.schedules.push(c.schedule.label);
    }
  });

  const classEventsList = Array.from(classEvents.entries()).map(([day, data]) => ({
    day,
    topics: Array.from(data.topics),
    schedules: data.schedules,
    type: "class" as const,
  }));

  return NextResponse.json({
    year,
    month,
    classes: classEventsList,
    facilitatorBirthdays,
    studentBirthdays,
    courseEvents,
  });
}