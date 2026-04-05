import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StudentsClient } from "./students-client";

async function getUserScheduleId(userId: string, role: string): Promise<string | null> {
  if (role === "ADMIN") return null;
  if (role === "SCHEDULE_LEADER") {
    const leader = await prisma.scheduleLeader.findFirst({ where: { userId } });
    return leader?.scheduleId ?? null;
  }
  if (role === "SECRETARY") {
    const secretary = await prisma.secretary.findFirst({ where: { userId } });
    return secretary?.scheduleId ?? null;
  }
  if (role === "FACILITATOR") {
    const facilitator = await prisma.facilitator.findFirst({ where: { userId } });
    if (!facilitator) return null;
    const table = await prisma.facilitatorTable.findFirst({ where: { facilitatorId: facilitator.id } });
    return table?.scheduleId ?? null;
  }
  return null;
}

async function getFacilitatorTableIds(userId: string): Promise<string[]> {
  const facilitator = await prisma.facilitator.findFirst({ where: { userId } });
  if (!facilitator) return [];
  const tables = await prisma.facilitatorTable.findMany({
    where: { facilitatorId: facilitator.id },
    select: { id: true },
  });
  return tables.map((t) => t.id);
}

function serializeStudent(student: any, table: any, schedule: any) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    phone: student.phone ?? null,
    address: student.address ?? null,
    birthdate: student.birthdate?.toISOString() ?? null,
    profileNotes: (student.profileNotes ?? {}) as Record<string, string>,
    facilitatorName: table.facilitator.name,
    tableName: table.name,
    scheduleLabel: schedule.label,
    scheduleId: schedule.id,
    tableId: table.id,
    createdAt: student.createdAt.toISOString(),
    status: student.status as string,
    quitDate: student.quitDate?.toISOString() ?? null,
    quitReason: student.quitReason ?? null,
    attendance: student.attendance.map((a: any) => ({
      id: a.id,
      status: a.status as string,
      classId: a.classId,
      className: a.class.name,
      classDate: a.class.date.toISOString(),
    })),
  };
}

export default async function StudentsPage() {
  const session = await auth();
  const user = session?.user as any;
  const role: string = user?.role ?? "FACILITATOR";
  const userId: string = user?.id ?? "";
  const userScheduleId = await getUserScheduleId(userId, role);
  const facilitatorTableIds = role === "FACILITATOR" ? await getFacilitatorTableIds(userId) : [];

  const [courseData, profileQuestions] = await Promise.all([
    prisma.course.findFirst({
      where: { isActive: true },
      include: {
        schedules: {
          include: {
            tables: {
              include: {
                facilitator: true,
                students: {
                  orderBy: { firstName: "asc" },
                  include: { attendance: { include: { class: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.profileQuestion.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  const allSchedules = courseData?.schedules ?? [];
  const visibleSchedules = role === "ADMIN" || !userScheduleId
    ? allSchedules
    : allSchedules.filter((s) => s.id === userScheduleId);

  const activeStudents: any[] = [];
  const quitStudents: any[] = [];

  for (const s of visibleSchedules) {
    for (const tbl of s.tables) {
      for (const student of tbl.students) {
        const serialized = serializeStudent(student, tbl, s);
        if (student.status === "QUIT") quitStudents.push(serialized);
        else activeStudents.push(serialized);
      }
    }
  }

  const scheduleOptions = visibleSchedules.map((s) => ({
    id: s.id, label: s.label,
    tables: s.tables.map((tbl) => ({ id: tbl.id, name: tbl.facilitator.name })),
  }));

  return (
    <StudentsClient
      students={activeStudents}
      quitStudents={quitStudents}
      scheduleOptions={scheduleOptions}
      profileQuestions={profileQuestions.map((q) => ({
        id: q.id, question: q.question, type: q.type,
        options: (q.options ?? null) as string[] | null,
      }))}
      role={role}
      userId={userId}
      facilitatorTableIds={facilitatorTableIds}
    />
  );
}