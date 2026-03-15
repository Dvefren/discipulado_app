import { getUserScope } from "@/lib/scope";
import { NextResponse } from "next/server";

export async function GET() {
  const scope = await getUserScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(scope);
}