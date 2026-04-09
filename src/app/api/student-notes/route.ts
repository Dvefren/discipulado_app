import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const notes = await prisma.studentNote.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, role: true } } },
  });

  return NextResponse.json(notes.map((n) => ({
    id: n.id,
    content: n.content,
    authorName: n.author?.name ?? "Usuario eliminado",
    authorRole: n.author?.role ?? "DELETED",
    createdAt: n.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = user.role;
  const { studentId, content } = await req.json();

  if (!studentId || !content?.trim()) {
    return NextResponse.json({ error: "studentId y contenido son requeridos" }, { status: 400 });
  }

  // Check permissions: Admin, Secretary, or the student's facilitator
  if (role !== "ADMIN" && role !== "SECRETARY") {
    if (role === "FACILITATOR") {
      // Check if this facilitator owns the student's table
      const facilitator = await prisma.facilitator.findFirst({ where: { userId: user.id } });
      if (!facilitator) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { table: true },
      });
      if (!student || !student.table || student.table.facilitatorId !== facilitator.id) {
                return NextResponse.json({ error: "Solo puedes agregar notas a tus propios alumnos" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const note = await prisma.studentNote.create({
    data: {
      content: content.trim(),
      studentId,
      authorId: user.id,
    },
    include: { author: { select: { name: true, role: true } } },
  });

  return NextResponse.json({
    id: note.id,
    content: note.content,
    authorName: note.author?.name ?? "Usuario eliminado",
    authorRole: note.author?.role ?? "DELETED",
    createdAt: note.createdAt.toISOString(),  
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const note = await prisma.studentNote.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  // Only the author or admin can delete
  if (note.authorId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo puedes eliminar tus propias notas" }, { status: 403 });
  }

  await prisma.studentNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}