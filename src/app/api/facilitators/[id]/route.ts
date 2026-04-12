import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — full profile with stats, students, and teaching data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = user.role;

  // Optional ?courseId=... filter — defaults to active course
  const { searchParams } = new URL(req.url);
  const requestedCourseId = searchParams.get("courseId");

  // Resolve which course to scope to
  let scopedCourseId = requestedCourseId;
  if (!scopedCourseId) {
    const activeCourse = await prisma.course.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    scopedCourseId = activeCourse?.id ?? null;
  }

  // Fetch the facilitator with ALL tables (we'll filter by course in code)
  const facilitator = await prisma.facilitator.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      tables: {
        include: {
          schedule: { select: { id: true, label: true, courseId: true } },
          students: {
            where: { status: "ACTIVE" },
            orderBy: { firstName: "asc" },
            include: { attendance: true },
          },
          _count: { select: { students: true } },
        },
      },
    },
  });

  if (!facilitator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorization
  const isSelf = facilitator.userId === user.id;
  const isAdmin = role === "ADMIN";
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Build the list of all courses this facilitator has been part of (for the dropdown)
  const allCourseIds = Array.from(
    new Set(facilitator.tables.map((t) => t.schedule.courseId))
  );
  const allCourses = await prisma.course.findMany({
    where: { id: { in: allCourseIds } },
    orderBy: [{ year: "desc" }, { semester: "desc" }],
    select: { id: true, name: true, isActive: true },
  });

  // Filter tables to the scoped course only
  const scopedTables = scopedCourseId
    ? facilitator.tables.filter((t) => t.schedule.courseId === scopedCourseId)
    : facilitator.tables;

  // Aggregate stats from scoped tables only
  let totalStudents = 0;
  let totalAttendanceRecords = 0;
  let totalPresent = 0;
  const allStudents: {
    id: string;
    firstName: string;
    lastName: string;
    scheduleLabel: string;
    tableName: string;
    attendancePct: number | null;
    totalClasses: number;
  }[] = [];

  for (const table of scopedTables) {
    totalStudents += table._count.students;
    for (const student of table.students) {
      const tot = student.attendance.length;
      const effective = student.attendance.filter(
        (a) => a.status === "PRESENT" || a.status === "PREVIEWED" || a.status === "RECOVERED"
      ).length;
      totalAttendanceRecords += tot;
      totalPresent += effective;
      allStudents.push({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        scheduleLabel: table.schedule.label,
        tableName: table.name,
        attendancePct: tot > 0 ? Math.round((effective / tot) * 100) : null,
        totalClasses: tot,
      });
    }
  }

  const averageAttendance = totalAttendanceRecords > 0
    ? Math.round((totalPresent / totalAttendanceRecords) * 100)
    : null;

  // Count classes scoped to this course's schedules only
  const scopedScheduleIds = scopedTables.map((t) => t.scheduleId);
  const classesCount = scopedScheduleIds.length > 0
    ? await prisma.class.count({ where: { scheduleId: { in: scopedScheduleIds } } })
    : 0;

  return NextResponse.json({
    id: facilitator.id,
    name: facilitator.name,
    role: facilitator.user?.role ?? "FACILITATOR",
    birthday: facilitator.birthday?.toISOString().split("T")[0] ?? null,
    phone: facilitator.phone ?? null,
    bio: facilitator.bio ?? null,
    createdAt: facilitator.createdAt.toISOString(),
    hasUser: !!facilitator.user,
    user: facilitator.user
      ? {
          id: facilitator.user.id,
          email: facilitator.user.email,
          role: facilitator.user.role,
          createdAt: facilitator.user.createdAt.toISOString(),
        }
      : null,
    // Course context for the UI dropdown
    currentCourseId: scopedCourseId,
    courses: allCourses,
    // Scoped data
    tables: scopedTables.map((t) => ({
      id: t.id,
      name: t.name,
      scheduleLabel: t.schedule.label,
      studentCount: t._count.students,
    })),
    stats: {
      totalStudents,
      averageAttendance,
      totalClasses: classesCount,
    },
    students: allStudents,
    canEdit: isAdmin || isSelf,
    canChangePassword: (isAdmin || isSelf) && !!facilitator.user,
    canCreateUser: isAdmin && !facilitator.user,
  });
}

// PATCH — update basic profile info (name, phone, bio, birthday)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const facilitator = await prisma.facilitator.findUnique({ where: { id } });
  if (!facilitator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = facilitator.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.bio !== undefined) data.bio = body.bio || null;
  if (body.birthday !== undefined) {
    data.birthday = body.birthday ? new Date(body.birthday + "T12:00:00Z") : null;
  }

  const updated = await prisma.facilitator.update({ where: { id }, data });
  return NextResponse.json(updated);
}