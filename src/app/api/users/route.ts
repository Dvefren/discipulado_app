import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      facilitator: {
        include: {
          tables: { include: { schedule: true } },
        },
      },
      scheduleLeaders: { include: { schedule: true } },
      secretaries: { include: { schedule: true } },
    },
  });

  const data = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    facilitatorId: u.facilitator?.id || null,
    facilitatorName: u.facilitator?.name || null,
    facilitatorSchedule: u.facilitator?.tables[0]?.schedule?.label || null,
    scheduleIds: [
      ...u.scheduleLeaders.map((sl) => sl.scheduleId),
      ...u.secretaries.map((s) => s.scheduleId),
    ],
    scheduleLabels: [
      ...u.scheduleLeaders.map((sl) => sl.schedule.label),
      ...u.secretaries.map((s) => s.schedule.label),
    ],
  }));

  // Get schedules for the active course
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
      },
    },
  });

  const schedules = course?.schedules.map((s) => ({ id: s.id, label: s.label })) || [];

  // Get facilitators with their link status
  const facilitators = await prisma.facilitator.findMany({
    include: {
      tables: { include: { schedule: true } },
    },
    orderBy: { name: "asc" },
  });

  const facilitatorOptions = facilitators.map((f) => ({
    id: f.id,
    name: f.name,
    scheduleLabel: f.tables[0]?.schedule?.label || "Unassigned",
    linked: !!f.userId,
  }));

  return NextResponse.json({ users: data, schedules, facilitators: facilitatorOptions });
}