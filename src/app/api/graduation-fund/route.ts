import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
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
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { amount, date } = await req.json();
  if (!amount || !date) {
    return NextResponse.json({ error: "Cantidad y fecha son requeridos" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "La cantidad debe ser mayor a 0" }, { status: 400 });
  }

  const entry = await prisma.graduationFundEntry.create({
    data: {
      amount: Number(amount),
      date: new Date(date + "T12:00:00Z"),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  await prisma.graduationFundEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}