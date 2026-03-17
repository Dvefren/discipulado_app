import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["ADMIN", "SCHEDULE_LEADER", "SECRETARY"];

export async function GET() {
  const events = await prisma.calendarEvent.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  const role = user?.role;

  if (!user || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, date, description, category, scheduleId } = await req.json();

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }

  // Admin creates global events (no scheduleId)
  if (role === "ADMIN") {
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        date: new Date(date + "T12:00:00Z"),
        description: description ?? null,
        category: category ?? "OTHER",
        createdById: user.id,
        scheduleId: null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  }

  // Leader/Secretary must provide scheduleId
  if (!scheduleId) {
    return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
  }

  // Verify user belongs to this schedule
  let authorized = false;

  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({
      where: { userId: user.id, scheduleId },
    });
    authorized = !!leader;
  } else if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({
      where: { userId: user.id, scheduleId },
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
      title,
      date: new Date(date + "T12:00:00Z"),
      description: description ?? null,
      category: category ?? "OTHER",
      createdById: user.id,
      scheduleId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  const role = user?.role;

  if (!user || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();

  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Admin can only delete events they created
  if (role === "ADMIN") {
    if (event.createdById !== user.id) {
      return NextResponse.json(
        { error: "You can only delete events you created" },
        { status: 403 }
      );
    }
    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  // Leader/Secretary can delete events from their schedule
  if (!event.scheduleId) {
    return NextResponse.json({ error: "Cannot delete global events" }, { status: 403 });
  }

  let authorized = false;

  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({
      where: { userId: user.id, scheduleId: event.scheduleId },
    });
    authorized = !!leader;
  } else if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({
      where: { userId: user.id, scheduleId: event.scheduleId },
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