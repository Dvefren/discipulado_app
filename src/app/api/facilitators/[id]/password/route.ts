import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const facilitator = await prisma.facilitator.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!facilitator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!facilitator.user) {
    return NextResponse.json(
      { error: "Este facilitador no tiene cuenta de usuario" },
      { status: 400 }
    );
  }

  // 🛡️ Solo el dueño puede cambiar su propia contraseña
  const isSelf = facilitator.userId === session!.user.id;
  if (!isSelf) {
    return NextResponse.json(
      { error: "Solo puedes cambiar tu propia contraseña" },
      { status: 403 }
    );
  }

  const { currentPassword, newPassword } = await req.json();

  // Validación de input
  if (!currentPassword || typeof currentPassword !== "string") {
    return NextResponse.json(
      { error: "Contraseña actual es requerida" },
      { status: 400 }
    );
  }
  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: "Nueva contraseña es requerida" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }
  if (newPassword.length > 128) {
    return NextResponse.json(
      { error: "La nueva contraseña es demasiado larga" },
      { status: 400 }
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "La nueva contraseña debe ser diferente a la actual" },
      { status: 400 }
    );
  }

  // Verificar contraseña actual
  const isValid = await bcrypt.compare(currentPassword, facilitator.user.password);
  if (!isValid) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  // Hashear y actualizar
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: facilitator.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}