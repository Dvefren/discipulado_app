import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { redirect } from "next/navigation";

export default async function DashboardHome() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

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

  // Filter schedules by scope
  let schedules = course.schedules;
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    schedules = schedules.filter((s) => scope.scheduleIds.includes(s.id));
  }

  // For facilitators, also filter tables
  let totalStudents: number;
  let totalFacilitators: number;

  if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
    totalStudents = schedules.reduce(
      (sum, s) => sum + s.tables
        .filter((t) => scope.tableIds.includes(t.id))
        .reduce((ts, t) => ts + t._count.students, 0),
      0
    );
    totalFacilitators = schedules.reduce(
      (sum, s) => sum + s.tables.filter((t) => scope.tableIds.includes(t.id)).length,
      0
    );
  } else {
    totalStudents = schedules.reduce(
      (sum, s) => sum + s.tables.reduce((ts, t) => ts + t._count.students, 0),
      0
    );
    totalFacilitators = schedules.reduce(
      (sum, s) => sum + s.tables.length,
      0
    );
  }

  const startDate = course.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endDate = course.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const isAdmin = scope.role === "ADMIN";
  const pageTitle = isAdmin
    ? course.name
    : `${course.name} — ${schedules.map((s) => s.label).join(", ")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{isAdmin ? course.name : schedules[0]?.label || course.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {course.name} · {startDate} - {endDate}
          </p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-green-50 text-xs font-medium text-green-800">Active</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total students" value={totalStudents} />
        <StatCard label={scope.role === "FACILITATOR" ? "My tables" : "Facilitators"} value={totalFacilitators} />
        <StatCard label="Schedules" value={schedules.length} />
        <StatCard label="Avg. attendance" value="--" />
      </div>

      {/* Schedules (only show for admin and leaders) */}
      {(isAdmin || scope.role === "SCHEDULE_LEADER") && (
        <>
          <h2 className="text-[15px] font-medium text-gray-900 mb-3">
            {isAdmin ? "Schedules" : "My schedule"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schedules.map((schedule) => {
              const facilitatorNames = schedule.tables.map((t) => t.facilitator.name);
              const displayNames = facilitatorNames.slice(0, 2).join(", ");
              const remaining = facilitatorNames.length - 2;

              return (
                <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{schedule.label}</span>
                    <span className="text-xs text-gray-400">{schedule.tables.length} tables</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {displayNames}{remaining > 0 && `, +${remaining} more`}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Facilitator's own table info */}
      {scope.role === "FACILITATOR" && scope.tableIds.length > 0 && (
        <>
          <h2 className="text-[15px] font-medium text-gray-900 mb-3">My table</h2>
          {schedules.map((schedule) =>
            schedule.tables
              .filter((t) => scope.tableIds.includes(t.id))
              .map((table) => (
                <div key={table.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{table.name}</span>
                    <span className="text-xs text-gray-400">{table._count.students} students</span>
                  </div>
                  <p className="text-xs text-gray-500">{schedule.label}</p>
                </div>
              ))
          )}
        </>
      )}

      {/* Secretary's schedule info */}
      {scope.role === "SECRETARY" && (
        <>
          <h2 className="text-[15px] font-medium text-gray-900 mb-3">My schedule</h2>
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{schedule.label}</span>
                <span className="text-xs text-gray-400">{schedule.tables.length} tables</span>
              </div>
              <p className="text-xs text-gray-500">
                {schedule.tables.map((t) => t.facilitator.name).join(", ")}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-medium text-gray-900">{value}</p>
    </div>
  );
}