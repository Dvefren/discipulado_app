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

  const facilitator = await prisma.facilitator.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      tables: {
        include: {
          schedule: { select: { id: true, label: true } },
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

  // Authorization: admin OR this facilitator's own user
  const isSelf = facilitator.userId === user.id;
  const isAdmin = role === "ADMIN";
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Aggregate stats across all tables owned by this facilitator
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

  for (const table of facilitator.tables) {
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

  // Count distinct classes across all schedules this facilitator teaches in
  const scheduleIds = facilitator.tables.map((t) => t.scheduleId);
  const classesCount = scheduleIds.length > 0
    ? await prisma.class.count({ where: { scheduleId: { in: scheduleIds } } })
    : 0;

  return NextResponse.json({
    id: facilitator.id,
    name: facilitator.name,
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
    tables: facilitator.tables.map((t) => ({
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
    // Flags for the UI
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