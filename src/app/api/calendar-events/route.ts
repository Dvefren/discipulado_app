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
  const user = session?.user as any;
  const role = user?.role;

  if (!user || (role !== "SCHEDULE_LEADER" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, date, description, category, scheduleId } = await req.json();

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }

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

  if (!user || (role !== "SCHEDULE_LEADER" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();

  // Verify the event belongs to the user's schedule
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event || !event.scheduleId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
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