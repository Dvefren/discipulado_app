import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        include: {
          tables: {
            include: {
              facilitator: true,
              _count: { select: { students: true } },
            },
          },
          _count: { select: { classes: true } },
        },
      },
    },
  });

  if (!course) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">No active course found.</p>
      </div>
    );
  }

  const totalStudents = course.schedules.reduce(
    (sum, s) => sum + s.tables.reduce((ts, t) => ts + t._count.students, 0),
    0
  );
  const totalFacilitators = course.schedules.reduce(
    (sum, s) => sum + s.tables.length,
    0
  );

  const startDate = course.startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDate = course.endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      {/* Course Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{course.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {startDate} - {endDate}
          </p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-green-50 text-xs font-medium text-green-800">
          Active
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total students" value={totalStudents} />
        <StatCard label="Facilitators" value={totalFacilitators} />
        <StatCard label="Schedules" value={course.schedules.length} />
        <StatCard label="Avg. attendance" value="--" />
      </div>

      {/* Schedules */}
      <h2 className="text-[15px] font-medium text-gray-900 mb-3">Schedules</h2>
      <div className="grid grid-cols-2 gap-3">
        {course.schedules.map((schedule) => {
          const facilitatorNames = schedule.tables.map(
            (t) => t.facilitator.name
          );
          const displayNames = facilitatorNames.slice(0, 2).join(", ");
          const remaining = facilitatorNames.length - 2;

          return (
            <div
              key={schedule.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {schedule.label}
                </span>
                <span className="text-xs text-gray-400">
                  {schedule.tables.length} tables
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {displayNames}
                {remaining > 0 && `, +${remaining} more`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-medium text-gray-900">{value}</p>
    </div>
  );
}