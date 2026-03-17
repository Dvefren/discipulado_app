import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CalendarClient } from "./calendar-client";

// ─── Determine user's schedule based on role ─────────────
async function getUserScheduleId(
  userId: string,
  role: string
): Promise<string | null> {
  if (role === "ADMIN") return null;

  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({
      where: { userId },
    });
    return leader?.scheduleId ?? null;
  }

  if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({
      where: { userId },
    });
    return secretary?.scheduleId ?? null;
  }

  if (role === "FACILITATOR") {
    const facilitator = await prisma.facilitator.findFirst({
      where: { userId },
    });
    if (!facilitator) return null;
    const table = await prisma.facilitatorTable.findFirst({
      where: { facilitatorId: facilitator.id },
    });
    return table?.scheduleId ?? null;
  }

  return null;
}

export default async function CalendarPage() {
  const session = await auth();
  const user = session?.user as any;
  const role: string = user?.role ?? "FACILITATOR";
  const userId: string = user?.id ?? "";

  const userScheduleId = await getUserScheduleId(userId, role);
  const currentYear = new Date().getFullYear();

  // ─── 1. Custom calendar events ─────────────────────────
  let customEvents: any[] = [];

  if (role === "ADMIN") {
    // Admin sees NO custom schedule events (only birthdays, classes, course dates)
    // But still fetch global events (scheduleId is null) if any exist
    customEvents = await prisma.calendarEvent.findMany({
      where: { scheduleId: null },
      orderBy: { date: "asc" },
      include: { createdBy: { select: { name: true } } },
    });
  } else if (userScheduleId) {
    // Leader/Secretary/Facilitator: see their schedule's events
    customEvents = await prisma.calendarEvent.findMany({
      where: { scheduleId: userScheduleId },
      orderBy: { date: "asc" },
      include: { createdBy: { select: { name: true } } },
    });
  }

  const serializedEvents = customEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    description: e.description ?? null,
    category: e.category as string,
    createdByName: e.createdBy.name,
  }));

  // ─── 2. Student birthdays ──────────────────────────────
  let studentBirthdays: any[] = [];

  if (role === "ADMIN") {
    // Admin sees ALL student birthdays
    studentBirthdays = await prisma.student.findMany({
      where: { birthdate: { not: null } },
      select: { id: true, firstName: true, lastName: true, birthdate: true },
    });
  } else if (userScheduleId) {
    // Others see only their schedule's students
    studentBirthdays = await prisma.student.findMany({
      where: {
        birthdate: { not: null },
        table: { scheduleId: userScheduleId },
      },
      select: { id: true, firstName: true, lastName: true, birthdate: true },
    });
  }

  const studentBirthdayEvents = studentBirthdays.map((s) => {
    const bd = s.birthdate!;
    const thisYear = new Date(
      Date.UTC(currentYear, bd.getUTCMonth(), bd.getUTCDate(), 12, 0, 0)
    );
    return {
      id: `bday-s-${s.id}`,
      title: `🎂 ${s.firstName} ${s.lastName}`,
      date: thisYear.toISOString(),
      description: null,
      category: "BIRTHDAY",
      createdByName: "Auto",
    };
  });

  // ─── 3. Facilitator birthdays ──────────────────────────
  let facilitatorBirthdays: any[] = [];

  if (role === "ADMIN") {
    // Admin sees ALL facilitator birthdays
    facilitatorBirthdays = await prisma.facilitator.findMany({
      where: { birthday: { not: null } },
      select: { id: true, name: true, birthday: true },
    });
  } else if (userScheduleId) {
    // Others see only their schedule's facilitators
    facilitatorBirthdays = await prisma.facilitator.findMany({
      where: {
        birthday: { not: null },
        tables: { some: { scheduleId: userScheduleId } },
      },
      select: { id: true, name: true, birthday: true },
    });
  }

  const facilitatorBirthdayEvents = facilitatorBirthdays.map((f) => {
    const bd = f.birthday!;
    const thisYear = new Date(
      Date.UTC(currentYear, bd.getUTCMonth(), bd.getUTCDate(), 12, 0, 0)
    );
    return {
      id: `bday-f-${f.id}`,
      title: `🎂 ${f.name} (Facilitator)`,
      date: thisYear.toISOString(),
      description: null,
      category: "BIRTHDAY",
      createdByName: "Auto",
    };
  });

  // ─── 4. Class sessions ─────────────────────────────────
  let classes: any[] = [];

  if (role === "ADMIN") {
    // Admin sees all classes
    classes = await prisma.class.findMany({
      include: { schedule: { select: { label: true } } },
      orderBy: { date: "asc" },
    });
  } else if (userScheduleId) {
    // Others see only their schedule's classes
    classes = await prisma.class.findMany({
      where: { scheduleId: userScheduleId },
      include: { schedule: { select: { label: true } } },
      orderBy: { date: "asc" },
    });
  }

  const classEvents = classes.map((c) => ({
    id: `class-${c.id}`,
    title: c.name,
    date: new Date(
      Date.UTC(
        c.date.getUTCFullYear(),
        c.date.getUTCMonth(),
        c.date.getUTCDate(),
        12, 0, 0
      )
    ).toISOString(),
    description: c.topic ?? null,
    category: "CLASS",
    createdByName: role === "ADMIN" ? c.schedule.label : "Schedule",
  }));

  // ─── 5. Combine everything ─────────────────────────────
  const allEvents = [
    ...serializedEvents,
    ...studentBirthdayEvents,
    ...facilitatorBirthdayEvents,
    ...classEvents,
  ];

  // Can edit: only leaders and secretaries for their own schedule
  const canEdit =
    (role === "SCHEDULE_LEADER" || role === "SECRETARY") &&
    !!userScheduleId;

  return (
    <CalendarClient
      initialEvents={allEvents as any}
      role={role}
      canEdit={canEdit}
      userScheduleId={userScheduleId}
    />
  );
}