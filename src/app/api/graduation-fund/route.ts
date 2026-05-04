import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const entries = await prisma.graduationFundEntry.findMany({
    orderBy: { date: "desc" },
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      amount: e.amount,
      date: e.date.toISOString(),
    })),
    total,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { amount, date } = await req.json();

  // Validación de input
  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || numAmount <= 0) {
    return NextResponse.json(
      { error: "La cantidad debe ser un número mayor a 0" },
      { status: 400 }
    );
  }
  if (numAmount > 1_000_000) {
    return NextResponse.json(
      { error: "La cantidad parece demasiado alta. Verifica el valor." },
      { status: 400 }
    );
  }

  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 });
  }

  // Validar formato de fecha
  const parsedDate = new Date(date + "T12:00:00Z");
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  // No permitir fechas demasiado en el futuro (margen de 1 día por zonas horarias)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (parsedDate > tomorrow) {
    return NextResponse.json(
      { error: "La fecha no puede ser en el futuro" },
      { status: 400 }
    );
  }

  const entry = await prisma.graduationFundEntry.create({
    data: {
      amount: numAmount,
      date: parsedDate,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  // Verificar que existe antes de borrar (error claro al usuario)
  const existing = await prisma.graduationFundEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });
  }

  await prisma.graduationFundEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}