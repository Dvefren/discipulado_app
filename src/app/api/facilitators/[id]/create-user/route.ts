import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const facilitator = await prisma.facilitator.findUnique({ where: { id } });

  if (!facilitator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (facilitator.userId) {
    return NextResponse.json(
      { error: "Este facilitador ya tiene una cuenta" },
      { status: 400 }
    );
  }

  const { email, password } = await req.json();

  // Validación de input
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email válido es requerido" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Contraseña es requerida" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }
  if (password.length > 128) {
    return NextResponse.json(
      { error: "La contraseña es demasiado larga" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
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