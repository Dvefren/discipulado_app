import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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
    return NextResponse.json([]);
  }

  const groups = course.schedules.map((schedule) => ({
    label: schedule.label,
    facilitators: schedule.tables.map((table) => ({
      id: table.facilitator.id,
      name: table.facilitator.name,
      tableName: table.name,
      studentCount: table._count.students,
      scheduleLabel: schedule.label,
    })),
  }));

  return NextResponse.json(groups);
}