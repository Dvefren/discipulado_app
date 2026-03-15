import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          classes: {
            orderBy: { date: "asc" },
            include: {
              _count: { select: { attendance: true } },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ classes: [], schedules: [] });
  }

  const schedules = course.schedules.map((s) => ({
    id: s.id,
    label: s.label,
  }));

  // If a schedule filter is provided, show only that schedule's classes
  // Otherwise show the first schedule's classes (they're all the same 21)
  const targetSchedule = scheduleId
    ? course.schedules.find((s) => s.id === scheduleId)
    : course.schedules[0];

  const classes = targetSchedule
    ? targetSchedule.classes.map((c, index) => ({
        id: c.id,
        number: index + 1,
        name: c.name,
        topic: c.topic,
        date: c.date.toISOString().split("T")[0],
        dateFormatted: c.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        attendanceCount: c._count.attendance,
        scheduleId: targetSchedule.id,
      }))
    : [];

  return NextResponse.json({ classes, schedules });
}