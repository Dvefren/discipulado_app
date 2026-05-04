import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();  
  if (error) return error;
  const courses = await prisma.course.findMany({
    include: {
      schedules: {
        include: {
          tables: {
            include: {
              _count: { select: { students: true } },
            },
          },
          _count: { select: { classes: true } },
        },
      },
    },
    orderBy: [{ year: "desc" }, { semester: "desc" }],
  });

  const data = courses.map((course) => {
    const totalStudents = course.schedules.reduce(
      (sum, s) => sum + s.tables.reduce((ts, t) => ts + t._count.students, 0), 0
    );
    const totalFacilitators = course.schedules.reduce(
      (sum, s) => sum + s.tables.length, 0
    );
    const totalClasses = course.schedules.reduce(
      (sum, s) => sum + s._count.classes, 0
    );

    return {
      id: course.id,
      name: course.name,
      year: course.year,
      semester: course.semester,
      startDate: course.startDate.toISOString().split("T")[0],
      endDate: course.endDate.toISOString().split("T")[0],
      startFormatted: course.startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      endFormatted: course.endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      isActive: course.isActive,
      scheduleCount: course.schedules.length,
      totalStudents,
      totalFacilitators,
      totalClasses,
    };
  });

  return NextResponse.json(data);
}