import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  await prisma.student.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, profileNotes } = await req.json();
  const updated = await prisma.student.update({
    where: { id },
    data: { profileNotes },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { firstName, lastName, phone, address, birthdate, tableId, profileNotes } = await req.json();
  if (!firstName || !lastName || !tableId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const student = await prisma.student.create({
    data: {
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      tableId,
      profileNotes: profileNotes ?? {},
    },
  });
  return NextResponse.json(student, { status: 201 });
}