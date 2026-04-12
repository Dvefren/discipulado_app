import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const facilitator = await prisma.facilitator.findUnique({ where: { id } });
  if (!facilitator) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (facilitator.userId) {
    return NextResponse.json({ error: "Este facilitador ya tiene una cuenta" }, { status: 400 });
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: facilitator.name,
      role: "FACILITATOR",
    },
  });

  await prisma.facilitator.update({
    where: { id },
    data: { userId: newUser.id },
  });

  return NextResponse.json({ ok: true, userId: newUser.id });
}