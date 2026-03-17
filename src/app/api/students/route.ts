import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { firstName, lastName, phone, address, birthdate, tableId, profileNotes } = await req.json();

  if (!firstName || !lastName || !tableId) {
    return NextResponse.json({ error: "First name, last name, and table are required" }, { status: 400 });
  }

  const student = await prisma.student.create({
    data: {
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      birthdate: birthdate ? new Date(birthdate + "T12:00:00Z") : null,
      tableId,
      profileNotes: profileNotes ?? {},
    },
  });

  return NextResponse.json(student, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Student ID required" }, { status: 400 });
  }

  // Build update data — only include fields that were sent
  const data: Record<string, any> = {};

  if (updates.firstName !== undefined) data.firstName = updates.firstName;
  if (updates.lastName !== undefined) data.lastName = updates.lastName;
  if (updates.phone !== undefined) data.phone = updates.phone || null;
  if (updates.address !== undefined) data.address = updates.address || null;
  if (updates.profileNotes !== undefined) data.profileNotes = updates.profileNotes;
  if (updates.tableId !== undefined) data.tableId = updates.tableId;

  if (updates.birthdate !== undefined) {
    data.birthdate = updates.birthdate
      ? new Date(updates.birthdate + "T12:00:00Z")
      : null;
  }

  const student = await prisma.student.update({
    where: { id },
    data,
  });

  return NextResponse.json(student);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SECRETARY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Student ID required" }, { status: 400 });
  }

  // Delete attendance records first (foreign key constraint)
  await prisma.attendance.deleteMany({ where: { studentId: id } });
  await prisma.student.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}