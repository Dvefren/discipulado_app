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
    birthdate: student.birthdate?.toISOString() ?? null,
    gender: student.gender ?? null,
    maritalStatus: student.maritalStatus ?? null,
    isMother: student.isMother ?? null,
    isFather: student.isFather ?? null,
    email: student.email ?? null,
    placeOfBirth: student.placeOfBirth ?? null,
    street: student.street ?? null,
    streetNumber: student.streetNumber ?? null,
    neighborhood: student.neighborhood ?? null,
    cellPhone: student.cellPhone ?? null,
    landlinePhone: student.landlinePhone ?? null,
    educationLevel: student.educationLevel ?? null,
    workplace: student.workplace ?? null,
    livingSituation: student.livingSituation ?? null,
    emergencyContactName: student.emergencyContactName ?? null,
    emergencyContactPhone: student.emergencyContactPhone ?? null,
    acceptedChrist: student.acceptedChrist ?? null,
    isBaptized: student.isBaptized ?? null,
    baptismDate: student.baptismDate?.toISOString() ?? null,
    howArrivedToChurch: student.howArrivedToChurch ?? null,
    coursePurpose: student.coursePurpose ?? null,
    prayerAddiction: student.prayerAddiction ?? null,
    testimony: student.testimony ?? null,
    enrollmentDate: student.enrollmentDate?.toISOString() ?? null,
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

function serializeUnassignedStudent(student: any) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    birthdate: student.birthdate?.toISOString() ?? null,
    gender: student.gender ?? null,
    maritalStatus: student.maritalStatus ?? null,
    isMother: student.isMother ?? null,
    isFather: student.isFather ?? null,
    email: student.email ?? null,
    placeOfBirth: student.placeOfBirth ?? null,
    street: student.street ?? null,
    streetNumber: student.streetNumber ?? null,
    neighborhood: student.neighborhood ?? null,
    cellPhone: student.cellPhone ?? null,
    landlinePhone: student.landlinePhone ?? null,
    educationLevel: student.educationLevel ?? null,
    workplace: student.workplace ?? null,
    livingSituation: student.livingSituation ?? null,
    emergencyContactName: student.emergencyContactName ?? null,
    emergencyContactPhone: student.emergencyContactPhone ?? null,
    acceptedChrist: student.acceptedChrist ?? null,
    isBaptized: student.isBaptized ?? null,
    baptismDate: student.baptismDate?.toISOString() ?? null,
    howArrivedToChurch: student.howArrivedToChurch ?? null,
    coursePurpose: student.coursePurpose ?? null,
    prayerAddiction: student.prayerAddiction ?? null,
    testimony: student.testimony ?? null,
    enrollmentDate: student.enrollmentDate?.toISOString() ?? null,
    facilitatorName: "Por definir",
    tableName: "Por definir",
    scheduleLabel: "Por definir",
    scheduleId: "",
    tableId: "",
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

  const canSeeUnassigned = role !== "FACILITATOR";

  const [courseData, unassignedRaw] = await Promise.all([
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
    canSeeUnassigned
      ? prisma.student.findMany({
          where: { tableId: null },
          orderBy: { firstName: "asc" },
          include: { attendance: { include: { class: true } } },
        })
      : Promise.resolve([]),
  ]);

  const allSchedules = courseData?.schedules ?? [];
  const visibleSchedules = role === "ADMIN" || !userScheduleId
    ? allSchedules
    : allSchedules.filter((s) => s.id === userScheduleId);

  const activeStudents: any[] = [];
  const quitStudents: any[] = [];

  for (const s of visibleSchedules) {
    for (const tbl of s.tables) {
      // Facilitators only see students from their own tables
      if (role === "FACILITATOR" && !facilitatorTableIds.includes(tbl.id)) {
        continue;
      }
      for (const student of tbl.students) {
        const serialized = serializeStudent(student, tbl, s);
        if (student.status === "QUIT") quitStudents.push(serialized);
        else activeStudents.push(serialized);
      }
    }
  }

  for (const student of unassignedRaw) {
    const serialized = serializeUnassignedStudent(student);
    if (student.status === "QUIT") quitStudents.push(serialized);
    else activeStudents.push(serialized);
  }

  const scheduleOptions = visibleSchedules.map((s) => ({
    id: s.id,
    label: s.label,
    tables: s.tables.map((tbl) => ({ id: tbl.id, name: tbl.facilitator.name })),
  }));

  return (
    <StudentsClient
      students={activeStudents}
      quitStudents={quitStudents}
      scheduleOptions={scheduleOptions}
      role={role}
      userId={userId}
      facilitatorTableIds={facilitatorTableIds}
    />
  );
}