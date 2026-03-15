"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfileNotes(studentId: string, profileNotes: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.student.update({
    where: { id: studentId },
    data: { profileNotes },
  });

  revalidatePath("/dashboard/students");
  return { success: true };
}