import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const events = await prisma.calendarEvent.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { title, date, description, category } = await req.json();
  if (!title || !date) return NextResponse.json({ error: "Title and date required" }, { status: 400 });

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      date: new Date(date),
      description: description ?? null,
      category: category ?? "OTHER",
      createdById: (session.user as any).id,
    },
  });
  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}