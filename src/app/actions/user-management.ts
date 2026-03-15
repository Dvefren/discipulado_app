"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "../../generated/prisma/client";

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: Role;
  facilitatorId?: string;
  scheduleIds?: string[];
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
    },
  });

  // Link to facilitator profile
  if (data.facilitatorId) {
    await prisma.facilitator.update({
      where: { id: data.facilitatorId },
      data: { userId: user.id },
    });
  }

  // Create schedule assignments for SCHEDULE_LEADER
  if (data.role === "SCHEDULE_LEADER" && data.scheduleIds?.length) {
    for (const scheduleId of data.scheduleIds) {
      await prisma.scheduleLeader.create({
        data: { userId: user.id, scheduleId },
      });
    }
  }

  // Create schedule assignments for SECRETARY
  if (data.role === "SECRETARY" && data.scheduleIds?.length) {
    for (const scheduleId of data.scheduleIds) {
      await prisma.secretary.create({
        data: { userId: user.id, scheduleId },
      });
    }
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function updateUser(data: {
  userId: string;
  email: string;
  name: string;
  role: Role;
  newPassword?: string;
  facilitatorId?: string;
  scheduleIds?: string[];
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Check email uniqueness (excluding current user)
  const existing = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: data.userId } },
  });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const updateData: any = {
    email: data.email,
    name: data.name,
    role: data.role,
  };

  if (data.newPassword) {
    updateData.password = await bcrypt.hash(data.newPassword, 10);
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: updateData,
  });

  // Clear old facilitator link
  await prisma.facilitator.updateMany({
    where: { userId: data.userId },
    data: { userId: null },
  });

  // Set new facilitator link
  if (data.facilitatorId) {
    await prisma.facilitator.update({
      where: { id: data.facilitatorId },
      data: { userId: data.userId },
    });
  }

  // Clear and reset schedule leader assignments
  await prisma.scheduleLeader.deleteMany({ where: { userId: data.userId } });
  if (data.role === "SCHEDULE_LEADER" && data.scheduleIds?.length) {
    for (const scheduleId of data.scheduleIds) {
      await prisma.scheduleLeader.create({
        data: { userId: data.userId, scheduleId },
      });
    }
  }

  // Clear and reset secretary assignments
  await prisma.secretary.deleteMany({ where: { userId: data.userId } });
  if (data.role === "SECRETARY" && data.scheduleIds?.length) {
    for (const scheduleId of data.scheduleIds) {
      await prisma.secretary.create({
        data: { userId: data.userId, scheduleId },
      });
    }
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot delete your own account.");
  }

  // Unlink facilitator
  await prisma.facilitator.updateMany({
    where: { userId },
    data: { userId: null },
  });

  // Remove role assignments
  await prisma.scheduleLeader.deleteMany({ where: { userId } });
  await prisma.secretary.deleteMany({ where: { userId } });

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/dashboard/users");
  return { success: true };
}