"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createClass(data: {
  name: string;
  topic?: string;
  date: string;
  scheduleId: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.class.create({
    data: {
      name: data.name,
      topic: data.topic || null,
      date: new Date(data.date),
      scheduleId: data.scheduleId,
    },
  });

  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function createClassForAllSchedules(data: {
  name: string;
  topic?: string;
  date: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: { schedules: true },
  });

  if (!course) throw new Error("No active course found.");

  for (const schedule of course.schedules) {
    await prisma.class.create({
      data: {
        name: data.name,
        topic: data.topic || null,
        date: new Date(data.date),
        scheduleId: schedule.id,
      },
    });
  }

  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function updateClass(data: {
  classId: string;
  name: string;
  topic?: string;
  date: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.class.update({
    where: { id: data.classId },
    data: {
      name: data.name,
      topic: data.topic || null,
      date: new Date(data.date),
    },
  });

  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function deleteClass(classId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Attendance records cascade-delete with the class
  await prisma.class.delete({ where: { id: classId } });

  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}