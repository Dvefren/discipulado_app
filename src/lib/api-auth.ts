import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

type Role = "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";

/**
 * Verifica que haya una sesión activa.
 * Uso:
 *   const { error, session } = await requireAuth();
 *   if (error) return error;
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  return { error: null, session };
}

/**
 * Verifica que haya sesión Y que el rol esté permitido.
 * Uso:
 *   const { error, session } = await requireRole(["ADMIN"]);
 *   if (error) return error;
 */
export async function requireRole(allowedRoles: Role[]) {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };

  const userRole = (session!.user as any).role as Role;

  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}