import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const rawSearch = searchParams.get("search")?.trim() ?? "";

  // 🛡️ Limitar longitud de búsqueda para evitar queries pesadas
  const search = rawSearch.slice(0, 100);

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ students: [] });
  }

  const tokens = search.length > 0
    ? search.split(/\s+/).filter(Boolean).slice(0, 5) // 🛡️ Máx 5 tokens
    : [];

  const students = await prisma.student.findMany({
    where: {
      table: { is: { schedule: { courseId: course.id } } },
      ...(tokens.length > 0 && {
        AND: tokens.map((token) => ({
          OR: [
            { firstName: { contains: token, mode: "insensitive" as const } },
            { lastName: { contains: token, mode: "insensitive" as const } },
          ],
        })),
      }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      cellPhone: true,
      table: {
        select: {
          facilitator: { select: { name: true } },
          schedule: { select: { label: true } },
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 20,
  });

  const flattened = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    cellPhone: s.cellPhone,
    scheduleLabel: s.table?.schedule.label ?? "",
    facilitatorName: s.table?.facilitator.name ?? "",
  }));

  return NextResponse.json({ students: flattened });
}