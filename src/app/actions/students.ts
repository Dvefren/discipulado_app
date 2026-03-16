"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteStudent(studentId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Delete attendance records first, then the student
  await prisma.attendance.deleteMany({
    where: { studentId },
  });

  await prisma.student.delete({
    where: { id: studentId },
  });

  revalidatePath("/dashboard/students");

  return { success: true };
}