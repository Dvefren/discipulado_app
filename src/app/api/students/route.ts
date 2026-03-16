import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, phone, address, birthdate, tableId, profileNotes } = body;

    if (!firstName || !lastName || !tableId) {
      return NextResponse.json(
        { error: "firstName, lastName, and tableId are required" },
        { status: 400 }
      );
    }

    // Verify the table exists
    const table = await prisma.facilitatorTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        phone: phone || null,
        address: address || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        tableId,
        profileNotes: profileNotes || null,
      },
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error: any) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}