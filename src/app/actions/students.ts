"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createStudent(data: {
  firstName: string;
  lastName: string;
  birthdate?: string;
  phone?: string;
  address?: string;
  tableId: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await prisma.student.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
      phone: data.phone || null,
      address: data.address || null,
      tableId: data.tableId,
    },
  });

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStudent(data: {
  studentId: string;
  firstName: string;
  lastName: string;
  birthdate?: string;
  phone?: string;
  address?: string;
  tableId: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await prisma.student.update({
    where: { id: data.studentId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
      phone: data.phone || null,
      address: data.address || null,
      tableId: data.tableId,
    },
  });

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStudent(studentId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Delete attendance records first
  await prisma.attendance.deleteMany({
    where: { studentId },
  });

  await prisma.student.delete({
    where: { id: studentId },
  });

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/facilitators");
  revalidatePath("/dashboard");
  return { success: true };
}