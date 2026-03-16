import { prisma } from "@/lib/prisma";
import StudentsPageClient from "@/components/students-page-client";

export default async function StudentsPage() {
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

  // Flatten students for the table
  const allStudents = schedules.flatMap((s) =>
    s.tables.flatMap((t) =>
      t.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        scheduleLabel: s.label,
        facilitatorName: t.facilitator.name,
      }))
    )
  );

  // Prepare schedules with tables for the modal
  const schedulesForModal = schedules.map((s) => ({
    id: s.id,
    label: s.label,
    tables: s.tables.map((t) => ({
      id: t.id,
      name: t.name,
      facilitator: { id: t.facilitator.id, name: t.facilitator.name },
    })),
  }));

  return (
    <StudentsPageClient
      initialStudents={allStudents}
      schedules={schedulesForModal}
    />
  );
}