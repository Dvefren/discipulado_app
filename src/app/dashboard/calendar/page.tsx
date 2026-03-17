import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "FACILITATOR";

  // Fetch calendar events
  const events = await prisma.calendarEvent.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { name: true } } },
  });

  const serialized = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    description: e.description ?? null,
    category: e.category as string,
    createdByName: e.createdBy.name,
  }));

  // Fetch students with birthdays and inject as BIRTHDAY events
  const studentsWithBirthdays = await prisma.student.findMany({
    where: { birthdate: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthdate: true,
    },
  });

  const currentYear = new Date().getFullYear();

  const birthdayEvents = studentsWithBirthdays.map((s) => {
    const bd = s.birthdate!;
    // Set birthday to current year at noon UTC to avoid timezone shift
    const thisYearBirthday = new Date(
      Date.UTC(currentYear, bd.getUTCMonth(), bd.getUTCDate(), 12, 0, 0)
    );

    return {
      id: `bday-${s.id}`,
      title: `🎂 ${s.firstName} ${s.lastName}`,
      date: thisYearBirthday.toISOString(),
      description: null,
      category: "BIRTHDAY" as string,
      createdByName: "Auto",
    };
  });

  const allEvents = [...serialized, ...birthdayEvents];

  return <CalendarClient initialEvents={allEvents as any} role={role} />;
}