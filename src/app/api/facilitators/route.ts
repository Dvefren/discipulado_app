import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth"; 

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          tables: {
            orderBy: { name: "asc" },
            include: {
              facilitator: true,
              _count: { select: { students: true } },
            },
          },
        },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ groups: [], schedules: [] });
  }
  const groups = course.schedules.map((schedule) => ({
    id: schedule.id,
    label: schedule.label,
    facilitators: schedule.tables.map((table) => ({
      id: table.facilitator.id,
      name: table.facilitator.name,
      birthday: table.facilitator.birthday
        ? table.facilitator.birthday.toISOString().split("T")[0]
        : null,
      phone: table.facilitator.phone ?? null,
      bio: table.facilitator.bio ?? null,
      hasUser: !!table.facilitator.userId,
      tableId: table.id,
      tableName: table.name,
      studentCount: table._count.students,
      scheduleId: schedule.id,
      scheduleLabel: schedule.label,
    })),
  }));
  const schedules = course.schedules.map((s) => ({
    id: s.id,
    label: s.label,
  }));
  return NextResponse.json({ groups, schedules });
}