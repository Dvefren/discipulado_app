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

export async function duplicateClassesForAllSchedules() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: { schedules: true },
  });
  if (!course) throw new Error("No active course found.");

  // The 21 standard discipleship class definitions
  const CLASS_TEMPLATES = [
    { name: "Clase 1: Introducción", topic: "Introducción" },
    { name: "Clase 2: El comienzo de una nueva vida en Cristo", topic: "El comienzo de una nueva vida en Cristo" },
    { name: "Clase 3: El arrepentimiento", topic: "El arrepentimiento" },
    { name: "Clase 4: La fe", topic: "La fe" },
    { name: "Clase 5: El perdón", topic: "El perdón" },
    { name: "Clase 6: La obediencia", topic: "La obediencia" },
    { name: "Clase 7: La familia", topic: "La familia" },
    { name: "Clase 8: El Espíritu Santo", topic: "El Espíritu Santo" },
    { name: "Clase 9: La Biblia", topic: "Los alimentos básicos del cristiano: La Biblia" },
    { name: "Clase 10: La oración y el ayuno", topic: "Los alimentos básicos del cristiano: La oración y el ayuno" },
    { name: "Clase 11: El bautismo", topic: "Los mandatos de Jesús: El bautismo" },
    { name: "Clase 12: La Santa Cena", topic: "Los mandatos de Jesús: La Santa Cena" },
    { name: "Clase 13: ¿Cómo compartir el mensaje?", topic: "Mi compromiso con Dios. ¿Cómo compartir el mensaje?" },
    { name: "Clase 14: La mayordomía del cristiano", topic: "Mi compromiso con Dios. La mayordomía del cristiano" },
    { name: "Clase 15: La iglesia", topic: "La iglesia" },
    { name: "Clase 16: Satanás", topic: "Los enemigos del cristiano: Satanás" },
    { name: "Clase 17: La vieja naturaleza", topic: "Los enemigos del cristiano: La vieja naturaleza" },
    { name: "Clase 18: El mundo", topic: "Los enemigos del cristiano: El mundo" },
    { name: "Clase 19: La armadura de Dios", topic: "La armadura de Dios" },
    { name: "Clase 20: Guiados por Dios", topic: "Guiados por Dios" },
    { name: "Clase 21: Resumen general", topic: "Resumen general" },
  ];

  const TBD_DATE = new Date("2099-12-31T12:00:00Z");

  for (const schedule of course.schedules) {
    for (const template of CLASS_TEMPLATES) {
      await prisma.class.create({
        data: {
          name: template.name,
          topic: template.topic,
          date: TBD_DATE,
          scheduleId: schedule.id,
        },
      });
    }
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
  await prisma.class.delete({ where: { id: classId } });
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function deleteAllClasses(scheduleId?: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  if (scheduleId) {
    await prisma.class.deleteMany({ where: { scheduleId } });
  } else {
    const course = await prisma.course.findFirst({
      where: { isActive: true },
      include: { schedules: true },
    });
    if (course) {
      const scheduleIds = course.schedules.map((s) => s.id);
      await prisma.class.deleteMany({
        where: { scheduleId: { in: scheduleIds } },
      });
    }
  }
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}