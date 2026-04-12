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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const facilitator = await prisma.facilitator.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!facilitator) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!facilitator.user) {
    return NextResponse.json({ error: "Este facilitador no tiene cuenta de usuario" }, { status: 400 });
  }

  // Only the facilitator themselves can change their own password
  // (Admins use a separate reset flow via the /dashboard/users page)
  const isSelf = facilitator.userId === user.id;
  if (!isSelf) {
    return NextResponse.json({ error: "Solo puedes cambiar tu propia contraseña" }, { status: 403 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, facilitator.user.password);
  if (!isValid) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  // Hash and update new password
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: facilitator.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}