import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list all questions (active ones for non-admin, all for admin)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";

  const questions = await prisma.profileQuestion.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ questions });
}

// POST — create a new question (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { question, type = "text", options = null } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  }

  // Get the next order number
  const maxOrder = await prisma.profileQuestion.aggregate({
    _max: { order: true },
  });

  const newQuestion = await prisma.profileQuestion.create({
    data: {
      question: question.trim(),
      type,
      options,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ question: newQuestion }, { status: 201 });
}

// PUT — update a question (admin only)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, question, type, options, isActive, order } = body;

  if (!id) {
    return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
  }

  const updated = await prisma.profileQuestion.update({
    where: { id },
    data: {
      ...(question !== undefined && { question }),
      ...(type !== undefined && { type }),
      ...(options !== undefined && { options }),
      ...(isActive !== undefined && { isActive }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json({ question: updated });
}

// DELETE — delete a question (admin only)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
  }

  await prisma.profileQuestion.delete({ where: { id } });

  return NextResponse.json({ success: true });
}