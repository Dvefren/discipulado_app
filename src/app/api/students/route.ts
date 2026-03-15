import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { NextResponse } from "next/server";

export async function GET() {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json({ students: [], tables: [], schedules: [] });

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
              students: { orderBy: [{ firstName: "asc" }, { lastName: "asc" }] },
              _count: { select: { students: true } },
            },
          },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ students: [], tables: [], schedules: [] });

  let filteredSchedules = course.schedules;

  // Filter by scope
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    filteredSchedules = filteredSchedules.filter((s) => scope.scheduleIds.includes(s.id));
  }

  let students = filteredSchedules.flatMap((schedule) =>
    schedule.tables.flatMap((table) => {
      // Facilitators only see their own table
      if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
        if (!scope.tableIds.includes(table.id)) return [];
      }
      return table.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        birthdate: student.birthdate ? student.birthdate.toISOString().split("T")[0] : null,
        phone: student.phone,
        address: student.address,
        tableId: table.id,
        tableName: table.name,
        facilitatorName: table.facilitator.name,
        scheduleId: schedule.id,
        scheduleLabel: schedule.label,
      }));
    })
  );

  let tables = filteredSchedules.flatMap((schedule) => {
    let scheduleTables = schedule.tables;
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      scheduleTables = scheduleTables.filter((t) => scope.tableIds.includes(t.id));
    }
    return scheduleTables.map((table) => ({
      id: table.id,
      name: table.name,
      facilitatorName: table.facilitator.name,
      scheduleLabel: schedule.label,
    }));
  });

  const schedules = filteredSchedules.map((s) => ({ id: s.id, label: s.label }));

  return NextResponse.json({ students, tables, schedules });
}