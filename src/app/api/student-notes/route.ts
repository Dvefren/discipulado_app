import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const MAX_NOTE_LENGTH = 5000;

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId || typeof studentId !== "string") {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const notes = await prisma.studentNote.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, role: true } } },
  });

  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.author?.name ?? "Usuario eliminado",
      authorRole: n.author?.role ?? "DELETED",
      createdAt: n.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;
  const role = (session!.user as any).role;

  const { studentId, content } = await req.json();

  // Validación de input
  if (!studentId || typeof studentId !== "string") {
    return NextResponse.json({ error: "studentId requerido" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Contenido es requerido" }, { status: 400 });
  }
  if (content.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `La nota no puede exceder ${MAX_NOTE_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  // Verificar que el estudiante existe
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { table: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  // 🛡️ Permisos: ADMIN y SECRETARY pueden a cualquier alumno;
  // FACILITATOR solo a los suyos; SCHEDULE_LEADER no.
  if (role !== "ADMIN" && role !== "SECRETARY") {
    if (role === "FACILITATOR") {
      const facilitator = await prisma.facilitator.findFirst({
        where: { userId },
      });
      if (!facilitator) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (!student.table || student.table.facilitatorId !== facilitator.id) {
        return NextResponse.json(
          { error: "Solo puedes agregar notas a tus propios alumnos" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const note = await prisma.studentNote.create({
    data: {
      content: content.trim(),
      studentId,
      authorId: userId,
    },
    include: { author: { select: { name: true, role: true } } },
  });

  return NextResponse.json(
    {
      id: note.id,
      content: note.content,
      authorName: note.author?.name ?? "Usuario eliminado",
      authorRole: note.author?.role ?? "DELETED",
      createdAt: note.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;
  const role = (session!.user as any).role;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const note = await prisma.studentNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  // 🛡️ Solo el autor o un admin pueden borrar
  if (note.authorId !== userId && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo puedes eliminar tus propias notas" },
      { status: 403 }
    );
  }

  await prisma.studentNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}