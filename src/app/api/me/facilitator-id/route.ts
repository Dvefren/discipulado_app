import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const facilitator = await prisma.facilitator.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  return NextResponse.json({ facilitatorId: facilitator?.id ?? null });
}