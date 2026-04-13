import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        include: {
          tables: {
            include: {
              facilitator: true,
              students: { orderBy: { firstName: "asc" } },
            },
          },
        },
      },
    },
  });

  const schedules = course?.schedules || [];

  const students = schedules.flatMap((s) =>
    s.tables.flatMap((t) =>
      t.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        cellPhone: student.cellPhone,
        scheduleLabel: s.label,
        facilitatorName: t.facilitator.name,
      }))
    )
  );

  return NextResponse.json({ students });
}