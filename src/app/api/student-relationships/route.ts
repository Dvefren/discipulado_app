import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  // Fetch relationships where this student is either side
  const [asA, asB] = await Promise.all([
    prisma.studentRelationship.findMany({
      where: { studentAId: studentId },
      include: { studentB: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.studentRelationship.findMany({
      where: { studentBId: studentId },
      include: { studentA: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  const relationships = [
    ...asA.map((r) => ({
      id: r.id,
      relatedStudent: r.studentB,
      type: r.type,
      createdAt: r.createdAt.toISOString(),
    })),
    ...asB.map((r) => ({
      id: r.id,
      relatedStudent: r.studentA,
      type: inverseType(r.type),
      createdAt: r.createdAt.toISOString(),
    })),
  ];

  return NextResponse.json(relationships);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { studentAId, studentBId, type } = await req.json();
  if (!studentAId || !studentBId || !type) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  if (studentAId === studentBId) {
    return NextResponse.json({ error: "No puedes relacionar un alumno consigo mismo" }, { status: 400 });
  }

  // Check if relationship already exists in either direction
  const existing = await prisma.studentRelationship.findFirst({
    where: {
      OR: [
        { studentAId, studentBId },
        { studentAId: studentBId, studentBId: studentAId },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Esta relación ya existe" }, { status: 409 });
  }

  const relationship = await prisma.studentRelationship.create({
    data: { studentAId, studentBId, type },
    include: {
      studentB: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    id: relationship.id,
    relatedStudent: relationship.studentB,
    type: relationship.type,
    createdAt: relationship.createdAt.toISOString(),
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  await prisma.studentRelationship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// When viewing from the B side, invert directional types
function inverseType(type: string): string {
  const inverses: Record<string, string> = {
    "Padre/Madre": "Hijo/a",
    "Hijo/a": "Padre/Madre",
  };
  return inverses[type] ?? type;
}