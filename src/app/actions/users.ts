"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Role } from "../../generated/prisma/client";

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  // Only admins can create users
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
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

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}