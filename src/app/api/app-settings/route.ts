import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  // Compute graduation fund total from entries, inject into the response
  async function enrichGraduationFund(value: any) {
    const entries = await prisma.graduationFundEntry.findMany({ select: { amount: true } });
    const collected = entries.reduce((sum, e) => sum + e.amount, 0);
    return { ...(value || {}), collected };
  }

  if (key) {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    let value = setting ? setting.value : null;
    if (key === "graduation_fund") {
      value = await enrichGraduationFund(value);
    }
    return NextResponse.json(value);
  }

  const settings = await prisma.appSetting.findMany();
  const map: Record<string, any> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  // Always inject collected total for graduation_fund (even if no setting row exists)
  map.graduation_fund = await enrichGraduationFund(map.graduation_fund);

  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { key, value } = await req.json();
  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json(setting);
}