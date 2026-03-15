import { prisma } from "@/lib/prisma";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      _count: { select: { schedules: true } },
    },
    orderBy: { year: "desc" },
  });

  return (
    <div>
      <h1 className="text-lg font-medium text-gray-900 mb-5">Courses</h1>

      <div className="space-y-3">
        {courses.map((course) => {
          const startDate = course.startDate.toLocaleDateString("en-US", {
            month: "short",
          });
          const endDate = course.endDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });

          return (
            <div
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {course.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Semester {course.semester} · {startDate} - {endDate} ·{" "}
                    {course._count.schedules} schedules
                  </p>
                </div>
                {course.isActive && (
                  <div className="px-3 py-1 rounded-lg bg-green-50 text-xs font-medium text-green-800">
                    Active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}