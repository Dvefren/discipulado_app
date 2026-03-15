import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface UserScope {
  userId: string;
  role: "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";
  scheduleIds: string[];
  tableIds: string[];
  facilitatorId: string | null;
}

export async function getUserScope(): Promise<UserScope | null> {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as any).role as UserScope["role"];
  const userId = session.user.id;

  if (role === "ADMIN") {
    return { userId, role, scheduleIds: [], tableIds: [], facilitatorId: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      facilitator: {
        include: { tables: true },
      },
      scheduleLeaders: true,
      secretaries: true,
    },
  });

  if (!user) return null;

  let scheduleIds: string[] = [];
  let tableIds: string[] = [];
  let facilitatorId: string | null = null;

  if (role === "SCHEDULE_LEADER") {
    scheduleIds = user.scheduleLeaders.map((sl) => sl.scheduleId);
    if (user.facilitator) {
      facilitatorId = user.facilitator.id;
      tableIds = user.facilitator.tables.map((t) => t.id);
    }
  }

  if (role === "SECRETARY") {
    scheduleIds = user.secretaries.map((s) => s.scheduleId);
    if (user.facilitator) {
      facilitatorId = user.facilitator.id;
      tableIds = user.facilitator.tables.map((t) => t.id);
    }
  }

  if (role === "FACILITATOR") {
    if (user.facilitator) {
      facilitatorId = user.facilitator.id;
      tableIds = user.facilitator.tables.map((t) => t.id);
      // Facilitator sees data from their table's schedule
      scheduleIds = user.facilitator.tables.map((t) => t.scheduleId);
    }
  }

  return { userId, role, scheduleIds, tableIds, facilitatorId };
}