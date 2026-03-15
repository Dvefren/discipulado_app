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
              students: {
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
              },
              _count: { select: { students: true } },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ students: [], tables: [], schedules: [] });
  }

  const students = course.schedules.flatMap((schedule) =>
    schedule.tables.flatMap((table) =>
      table.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        birthdate: student.birthdate
          ? student.birthdate.toISOString().split("T")[0]
          : null,
        phone: student.phone,
        address: student.address,
        tableId: table.id,
        tableName: table.name,
        facilitatorName: table.facilitator.name,
        scheduleId: schedule.id,
        scheduleLabel: schedule.label,
      }))
    )
  );

  const tables = course.schedules.flatMap((schedule) =>
    schedule.tables.map((table) => ({
      id: table.id,
      name: table.name,
      facilitatorName: table.facilitator.name,
      scheduleLabel: schedule.label,
    }))
  );

  const schedules = course.schedules.map((s) => ({
    id: s.id,
    label: s.label,
  }));

  return NextResponse.json({ students, tables, schedules });
}