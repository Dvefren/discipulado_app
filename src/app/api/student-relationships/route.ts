import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";

const VALID_TYPES = ["Esposo/a", "Hermano/a", "Padre/Madre", "Hijo/a", "Otro"] as const;
type RelationType = typeof VALID_TYPES[number];

function isValidType(type: unknown): type is RelationType {
  return typeof type === "string" && (VALID_TYPES as readonly string[]).includes(type);
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId || typeof studentId !== "string") {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

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
  const { error } = await requireRole(["ADMIN", "SECRETARY"]);
  if (error) return error;

  const { studentAId, studentBId, type } = await req.json();

  // Validación de input
  if (!studentAId || typeof studentAId !== "string") {
    return NextResponse.json({ error: "studentAId requerido" }, { status: 400 });
  }
  if (!studentBId || typeof studentBId !== "string") {
    return NextResponse.json({ error: "studentBId requerido" }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json(
      { error: `Tipo inválido. Debe ser uno de: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (studentAId === studentBId) {
    return NextResponse.json(
      { error: "No puedes relacionar un alumno consigo mismo" },
      { status: 400 }
    );
  }

  // 🛡️ Verificar que ambos estudiantes existen
  const [studentA, studentB] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentAId }, select: { id: true } }),
    prisma.student.findUnique({ where: { id: studentBId }, select: { id: true } }),
  ]);
  if (!studentA || !studentB) {
    return NextResponse.json({ error: "Uno de los alumnos no existe" }, { status: 404 });
  }

  // Verificar que la relación no exista en ninguna dirección
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

  return NextResponse.json(
    {
      id: relationship.id,
      relatedStudent: relationship.studentB,
      type: relationship.type,
      createdAt: relationship.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "SECRETARY"]);
  if (error) return error;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  // Verificar existencia para mejor error
  const existing = await prisma.studentRelationship.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Relación no encontrada" }, { status: 404 });
  }

  await prisma.studentRelationship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Cuando se ve desde el lado B, invertimos los tipos direccionales
function inverseType(type: string): string {
  const inverses: Record<string, string> = {
    "Padre/Madre": "Hijo/a",
    "Hijo/a": "Padre/Madre",
  };
  return inverses[type] ?? type;
}