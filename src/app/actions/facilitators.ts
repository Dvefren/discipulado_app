"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createFacilitator(data: {
  name: string;
  birthday?: string;
  scheduleId: string;
  tableName: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const facilitator = await prisma.facilitator.create({
    data: {
      name: data.name,
      birthday: data.birthday ? new Date(data.birthday) : null,
    },
  });

  await prisma.facilitatorTable.create({
    data: {
      name: data.tableName,
      facilitatorId: facilitator.id,
      scheduleId: data.scheduleId,
    },
  });

  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateFacilitator(data: {
  facilitatorId: string;
  name: string;
  birthday?: string;
  tableId: string;
  tableName: string;
  scheduleId: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.facilitator.update({
    where: { id: data.facilitatorId },
    data: {
      name: data.name,
      birthday: data.birthday ? new Date(data.birthday) : null,
    },
  });

  await prisma.facilitatorTable.update({
    where: { id: data.tableId },
    data: {
      name: data.tableName,
      scheduleId: data.scheduleId,
    },
  });

  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteFacilitator(facilitatorId: string, tableId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Check if the table has students
  const studentCount = await prisma.student.count({
    where: { tableId },
  });

  if (studentCount > 0) {
    throw new Error(
      `Cannot delete: this facilitator has ${studentCount} students assigned. Reassign or remove students first.`
    );
  }

  await prisma.facilitatorTable.delete({ where: { id: tableId } });
  await prisma.facilitator.delete({ where: { id: facilitatorId } });

  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSchedules() {
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
      },
    },
  });

  return course?.schedules || [];
}