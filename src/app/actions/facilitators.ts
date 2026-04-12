"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createFacilitator(data: {
  existingFacilitatorId?: string;
  name: string;
  birthday?: string;
  scheduleId: string;
  tableName: string;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  let facilitatorId: string;

  if (data.existingFacilitatorId) {
    const existing = await prisma.facilitator.findUnique({
      where: { id: data.existingFacilitatorId },
    });
    if (!existing) throw new Error("Facilitador no encontrado");
    facilitatorId = existing.id;
  } else {
    const facilitator = await prisma.facilitator.create({
      data: {
        name: data.name,
        birthday: data.birthday ? new Date(data.birthday) : null,
      },
    });
    facilitatorId = facilitator.id;
  }

  await prisma.facilitatorTable.create({
    data: {
      name: data.tableName,
      facilitatorId,
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

  // Check if the table being deleted has students
  const studentCount = await prisma.student.count({
    where: { tableId },
  });
  if (studentCount > 0) {
    throw new Error(
      `No se puede eliminar: esta mesa tiene ${studentCount} alumnos asignados. Reasigna o elimina los alumnos primero.`
    );
  }

  // Delete only this table
  await prisma.facilitatorTable.delete({ where: { id: tableId } });

  // Check if the facilitator has any OTHER tables in the system
  const otherTablesCount = await prisma.facilitatorTable.count({
    where: { facilitatorId },
  });

  // Only delete the Facilitator record if they have no other tables AND no User account
  // (preserving facilitators with user accounts so they keep their profile)
  if (otherTablesCount === 0) {
    const facilitator = await prisma.facilitator.findUnique({
      where: { id: facilitatorId },
      select: { userId: true },
    });
    if (facilitator && !facilitator.userId) {
      await prisma.facilitator.delete({ where: { id: facilitatorId } });
    }
    // If they have a userId, keep the Facilitator record so their profile still exists
    // (just unassigned to any table — they become a "reusable" candidate for the next course)
  }

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

// Returns facilitators NOT currently running a table in the active course.
// Used by the FacilitatorForm "use existing" dropdown.
export async function getAvailableFacilitators() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const activeCourse = await prisma.course.findFirst({
    where: { isActive: true },
    include: { schedules: { select: { id: true } } },
  });

  if (!activeCourse) return [];

  const activeScheduleIds = activeCourse.schedules.map((s) => s.id);

  const facilitators = await prisma.facilitator.findMany({
    where: {
      tables: { none: { scheduleId: { in: activeScheduleIds } } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return facilitators;
}