import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "FACILITATOR";

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
                  include: {
                    attendance: { include: { class: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.profileQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const schedules = courseData?.schedules ?? [];

  const allStudents = schedules.flatMap((s) =>
    s.tables.flatMap((t) =>
      t.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone ?? null,
        address: student.address ?? null,
        birthdate: student.birthdate?.toISOString() ?? null,
        profileNotes: (student.profileNotes ?? {}) as Record<string, string>,
        facilitatorName: t.facilitator.name,
        tableName: t.name,
        scheduleLabel: s.label,
        scheduleId: s.id,
        tableId: t.id,
        createdAt: student.createdAt.toISOString(),
        attendance: student.attendance.map((a) => ({
          id: a.id,
          status: a.status as string,
          classId: a.classId,
          className: a.class.name,
          classDate: a.class.date.toISOString(),
        })),
      }))
    )
  );

  const scheduleOptions = schedules.map((s) => ({
    id: s.id,
    label: s.label,
    tables: s.tables.map((t) => ({ id: t.id, name: t.name })),
  }));

  return (
    <StudentsClient
      students={allStudents}
      scheduleOptions={scheduleOptions}
      profileQuestions={profileQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: (q.options ?? null) as string[] | null,
      }))}
      role={role}
    />
  );
}