import { prisma } from "@/lib/prisma";
import StudentsTable from "@/components/students-table";

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

  const schedules = (course?.schedules || []).map((s) => ({
    id: s.id,
    label: s.label,
  }));

  const allStudents = (course?.schedules || []).flatMap((s) =>
    s.tables.flatMap((t) =>
      t.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        facilitatorName: t.facilitator.name,
        scheduleLabel: s.label,
      }))
    )
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Students</h1>
      </div>

      <StudentsTable students={allStudents} schedules={schedules} />
    </div>
  );
}