import { prisma } from "@/lib/prisma";

export default async function ClassesPage() {
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        include: {
          classes: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  // Use the first schedule's classes as they're all the same 21
  const classes = course?.schedules[0]?.classes || [];

  return (
    <div>
      <h1 className="text-lg font-medium text-gray-900 mb-5">Classes</h1>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-12">
                #
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Topic
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls, index) => (
              <tr
                key={cls.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5 text-sm text-gray-400">
                  {index + 1}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-900">
                  {cls.topic || cls.name}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500">
                  {cls.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}