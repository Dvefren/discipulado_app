import { prisma } from "@/lib/prisma";

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
  const allStudents = schedules.flatMap((s) =>
    s.tables.flatMap((t) =>
      t.students.map((student) => ({
        ...student,
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

      {/* Schedule Filters */}
      <div className="flex gap-2 mb-4">
        <div className="px-3.5 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-900 border border-gray-200 cursor-pointer">
          All schedules
        </div>
        {schedules.map((s) => (
          <div
            key={s.id}
            className="px-3.5 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 cursor-pointer hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Schedule
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Facilitator
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Phone
              </th>
            </tr>
          </thead>
          <tbody>
            {allStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No students enrolled yet. Add your first student to get
                  started.
                </td>
              </tr>
            ) : (
              allStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-sm text-gray-900">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.scheduleLabel}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.facilitatorName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.phone || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}