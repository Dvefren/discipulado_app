import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "FACILITATOR";

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

  return <CalendarClient initialEvents={serialized as any} role={role} />;
}