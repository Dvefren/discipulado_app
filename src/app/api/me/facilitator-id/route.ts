import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const facilitator = await prisma.facilitator.findFirst({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  return NextResponse.json({ facilitatorId: facilitator?.id ?? null });
}