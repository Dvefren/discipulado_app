import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { NextResponse, NextRequest } from "next/server";

const EMPTY_RESPONSE = {
  schedules: [],
  allSchedules: [],
  classes: [],
  students: [],
  facilitators: [],
  classSummary: [],
  altFacilitators: [],
};

export async function GET(request: NextRequest) {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json(EMPTY_RESPONSE);

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const classId = searchParams.get("classId");
  const tableFilter = searchParams.get("tableId");
  const altScheduleIdParam = searchParams.get("altScheduleId");

  // 🛡️ Si tableFilter está, validar que sea uno de los permitidos
  if (
    tableFilter &&
    scope.role === "FACILITATOR" &&
    scope.tableIds.length > 0 &&
    !scope.tableIds.includes(tableFilter)
  ) {
    return NextResponse.json(EMPTY_RESPONSE);
  }

  // 🛡️ Si scheduleId está, validar que sea uno de los permitidos
  if (
    scheduleId &&
    scope.role !== "ADMIN" &&
    scope.scheduleIds.length > 0 &&
    !scope.scheduleIds.includes(scheduleId)
  ) {
    return NextResponse.json(EMPTY_RESPONSE);
  }

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: { classes: { orderBy: { date: "asc" } } },
      },
    },
  });

if (!course) return NextResponse.json(EMPTY_RESPONSE);
  // schedules = what the current user is allowed to pick as their working schedule
  let availableSchedules = course.schedules;
  if (scope.role !== "ADMIN" && scope.scheduleIds.length > 0) {
    availableSchedules = availableSchedules.filter((s) => scope.scheduleIds.includes(s.id));
  }
  const schedules = availableSchedules.map((s) => ({ id: s.id, label: s.label }));

  // allSchedules = every schedule in the course, unscoped.
  // Used by the client to populate the Adelantó/Recuperó alt schedule dropdown,
  // because a student can attend any schedule when catching up — not just the
  // caller's assigned one.
  const allSchedules = course.schedules.map((s) => ({ id: s.id, label: s.label }));

  const selectedSchedule = scheduleId ? availableSchedules.find((s) => s.id === scheduleId) : null;

  const classes = selectedSchedule
    ? selectedSchedule.classes
        .map((c) => ({
          id: c.id,
          name: c.name,
          date: c.date.toISOString().split("T")[0],
        }))
        .sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
          return numA - numB;
        })
    : [];

  // Get facilitators/tables for the selected schedule
  let facilitators: any[] = [];
  if (scheduleId) {
    const tableWhere: any = { scheduleId };
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      tableWhere.id = { in: scope.tableIds };
    }

    const tables = await prisma.facilitatorTable.findMany({
      where: tableWhere,
      include: { facilitator: true },
      orderBy: { name: "asc" },
    });

    facilitators = tables.map((t) => ({
      tableId: t.id,
      tableName: t.name,
      facilitatorName: t.facilitator.name,
    }));
  }

  // Get facilitators for an ALT schedule (used when marking Adelantó/Recuperó).
  // No role scoping here — any user marking attendance needs to see all
  // available facilitators in the schedule the student attended.
  let altFacilitators: any[] = [];
  if (altScheduleIdParam) {
    const altTables = await prisma.facilitatorTable.findMany({
      where: { scheduleId: altScheduleIdParam },
      include: { facilitator: true },
      orderBy: { name: "asc" },
    });
    altFacilitators = altTables.map((t) => ({
      tableId: t.id,
      tableName: t.name,
      facilitatorName: t.facilitator.name,
    }));
  }

  // Get students with attendance if class is selected
  let students: any[] = [];
  if (classId && scheduleId) {
    const studentTableWhere: any = { scheduleId };
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      studentTableWhere.id = { in: scope.tableIds };
    }
    if (tableFilter) {
      studentTableWhere.id = tableFilter;
    }

    const tables = await prisma.facilitatorTable.findMany({
      where: studentTableWhere,
      include: {
        facilitator: true,
        students: {
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          include: {
            attendance: {
              where: { classId },
              include: {
                altSchedule: true,
                altTable: { include: { facilitator: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    students = tables.flatMap((table) =>
      table.students.map((student) => {
        const record = student.attendance[0] || null;
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          tableName: table.name,
          tableId: table.id,
          facilitatorName: table.facilitator.name,
          status: record ? record.status : null,
          absentReason: record?.absentReason || null,
          absentNote: record?.absentNote || null,
          altScheduleId: record?.altScheduleId || null,
          altScheduleLabel: record?.altSchedule?.label || null,
          altTableId: record?.altTableId || null,
          altTableName: record?.altTable?.name || null,
          altTableFacilitatorName: record?.altTable?.facilitator?.name || null,
          hasRecord: !!record,
        };
      })
    );
  }

  let classSummary: any[] = [];
  if (scheduleId && selectedSchedule) {
    const classIds = selectedSchedule.classes.map((c) => c.id);
    const studentWhere: any = { table: { scheduleId } };
    if (scope.role === "FACILITATOR" && scope.tableIds.length > 0) {
      studentWhere.table.id = { in: scope.tableIds };
    }
    const totalStudents = await prisma.student.count({ where: studentWhere });

    if (totalStudents > 0) {
      const attendanceCounts = await prisma.attendance.groupBy({
        by: ["classId"],
        where: { classId: { in: classIds }, status: "PRESENT" },
        _count: { status: true },
      });
      const countMap = new Map(attendanceCounts.map((a) => [a.classId, a._count.status]));
      classSummary = selectedSchedule.classes.map((c) => ({
        classId: c.id, presentCount: countMap.get(c.id) || 0, totalStudents,
      }));
    }
  }

  return NextResponse.json({ schedules, allSchedules, classes, students, facilitators, classSummary, altFacilitators });
}