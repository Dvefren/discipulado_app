import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";

const ALLOWED_ROLES: Array<"ADMIN" | "SCHEDULE_LEADER" | "SECRETARY"> = [
  "ADMIN",
  "SCHEDULE_LEADER",
  "SECRETARY",
];

const VALID_CATEGORIES = [
  "BIRTHDAY",
  "CLASS",
  "COURSE_DATE",
  "SNACK",
  "DYNAMICS",
  "OTHER",
] as const;

function isValidCategory(cat: unknown): boolean {
  return typeof cat === "string" && (VALID_CATEGORIES as readonly string[]).includes(cat);
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const events = await prisma.calendarEvent.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(ALLOWED_ROLES);
  if (error) return error;

  const userId = session!.user.id;
  const role = (session!.user as any).role;

  const { title, date, description, category, scheduleId } = await req.json();

  // Validación de input
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long (max 200)" }, { status: 400 });
  }
  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  const parsedDate = new Date(date + "T12:00:00Z");
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description" }, { status: 400 });
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: "Description too long (max 2000)" }, { status: 400 });
    }
  }

  if (category !== undefined && !isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Admin crea eventos globales
  if (role === "ADMIN") {
    const event = await prisma.calendarEvent.create({
      data: {
        title: title.trim(),
        date: parsedDate,
        description: description?.trim() ?? null,
        category: category ?? "OTHER",
        createdById: userId,
        scheduleId: null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  }

  // Leader/Secretary requieren scheduleId
  if (!scheduleId || typeof scheduleId !== "string") {
    return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
  }

  // Verificar permiso sobre el horario
  let authorized = false;
  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({
      where: { userId, scheduleId },
    });
    authorized = !!leader;
  } else if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({
      where: { userId, scheduleId },
    });
    authorized = !!secretary;
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "You can only add events to your own schedule" },
      { status: 403 }
    );
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: title.trim(),
      date: parsedDate,
      description: description?.trim() ?? null,
      category: category ?? "OTHER",
      createdById: userId,
      scheduleId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireRole(ALLOWED_ROLES);
  if (error) return error;

  const userId = session!.user.id;
  const role = (session!.user as any).role;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // ADMIN puede borrar cualquier evento (no solo los suyos)
  if (role === "ADMIN") {
    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  // Leader/Secretary solo eventos de su horario, no globales
  if (!event.scheduleId) {
    return NextResponse.json(
      { error: "Cannot delete global events" },
      { status: 403 }
    );
  }

  let authorized = false;
  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({
      where: { userId, scheduleId: event.scheduleId },
    });
    authorized = !!leader;
  } else if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({
      where: { userId, scheduleId: event.scheduleId },
    });
    authorized = !!secretary;
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "You can only delete events from your own schedule" },
      { status: 403 }
    );
  }

  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}