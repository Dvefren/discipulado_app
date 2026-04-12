"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCourse(data: {
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Deactivate all other courses
  await prisma.course.updateMany({
    data: { isActive: false },
  });

  const course = await prisma.course.create({
    data: {
      name: data.name,
      year: data.year,
      semester: data.semester,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: true,
    },
  });

  // Create the 4 default schedules
  const scheduleData = [
    { day: "WEDNESDAY" as const, time: "19:00", label: "Wednesday 7:00 PM" },
    { day: "SUNDAY" as const, time: "09:00", label: "Sunday 9:00 AM" },
    { day: "SUNDAY" as const, time: "11:00", label: "Sunday 11:00 AM" },
    { day: "SUNDAY" as const, time: "13:00", label: "Sunday 1:00 PM" },
  ];
  const createdSchedules = [];
  for (const s of scheduleData) {
    const created = await prisma.schedule.create({
      data: {
        day: s.day,
        time: s.time,
        label: s.label,
        courseId: course.id,
      },
    });
    createdSchedules.push({ id: created.id, label: created.label });
  }
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  return { success: true, courseId: course.id, schedules: createdSchedules };
}

export async function updateCourse(data: {
  courseId: string;
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.course.update({
    where: { id: data.courseId },
    data: {
      name: data.name,
      year: data.year,
      semester: data.semester,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });

  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setActiveCourse(courseId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.course.updateMany({
    data: { isActive: false },
  });

  await prisma.course.update({
    where: { id: courseId },
    data: { isActive: true },
  });

  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCourse(courseId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      schedules: {
        include: {
          tables: { include: { _count: { select: { students: true } } } },
          _count: { select: { classes: true } },
        },
      },
    },
  });

  if (!course) throw new Error("Course not found.");

  const totalStudents = course.schedules.reduce(
    (sum, s) => sum + s.tables.reduce((ts, t) => ts + t._count.students, 0), 0
  );

  if (totalStudents > 0) {
    throw new Error(
      `Cannot delete: this course has ${totalStudents} students enrolled. Remove students first.`
    );
  }

  if (course.isActive) {
    throw new Error("Cannot delete the active course. Set another course as active first.");
  }

  // Cascade: schedules → classes → attendance, and tables
  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  return { success: true };
}

// Get facilitators from past courses with their original table assignments,
// for the carry-over modal shown after creating a new course
export async function getCarryOverCandidates() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Find facilitators that have at least one table somewhere in the system,
  // grouped by their most recent table assignment (so we know which schedule
  // they used to be in).
  const facilitators = await prisma.facilitator.findMany({
    where: {
      tables: { some: {} },
    },
    include: {
      tables: {
        include: {
          schedule: { select: { label: true, courseId: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return facilitators.map((f) => ({
    id: f.id,
    name: f.name,
    lastTableName: f.tables[0]?.name ?? "",
    lastScheduleLabel: f.tables[0]?.schedule?.label ?? "",
  }));
}

// Carry over selected facilitators into a new course's schedules.
// For each selection, creates a new FacilitatorTable in the matching new schedule.
export async function carryOverFacilitators(data: {
  selections: Array<{
    facilitatorId: string;
    tableName: string;
    targetScheduleId: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  for (const sel of data.selections) {
    await prisma.facilitatorTable.create({
      data: {
        name: sel.tableName,
        facilitatorId: sel.facilitatorId,
        scheduleId: sel.targetScheduleId,
      },
    });
  }

  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true, count: data.selections.length };
}