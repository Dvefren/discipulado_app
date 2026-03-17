import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";

// Same palette as facilitators/page.tsx
const roleColors: Record<Role, { avatar: string; avatarText: string; badge: string }> = {
  ADMIN:           {
    avatar:     "bg-purple-100 dark:bg-purple-900/40",
    avatarText: "text-purple-800 dark:text-purple-300",
    badge:      "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  SCHEDULE_LEADER: {
    avatar:     "bg-blue-100 dark:bg-blue-900/40",
    avatarText: "text-blue-800 dark:text-blue-300",
    badge:      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  SECRETARY:       {
    avatar:     "bg-teal-100 dark:bg-teal-900/40",
    avatarText: "text-teal-800 dark:text-teal-300",
    badge:      "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  FACILITATOR:     {
    avatar:     "bg-orange-100 dark:bg-orange-900/40",
    avatarText: "text-orange-800 dark:text-orange-300",
    badge:      "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
};

const roleLabel: Record<Role, string> = {
  ADMIN:           "Admin",
  SCHEDULE_LEADER: "Schedule Leader",
  SECRETARY:       "Secretary",
  FACILITATOR:     "Facilitator",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default async function UsersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const order: Role[] = ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"];

  const grouped = order
    .map((r) => ({ role: r, users: users.filter((u) => u.role === r) }))
    .filter((g) => g.users.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Users</h1>
        <span className="text-xs text-muted-foreground">{users.length} total</span>
      </div>

      {grouped.map(({ role: r, users: roleUsers }) => {
        const colors = roleColors[r];
        return (
          <div key={r} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-foreground">{roleLabel[r]}</h2>
              <span className="text-xs text-muted-foreground">{roleUsers.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-card border border-border rounded-xl p-3.5 hover:border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full ${colors.avatar} flex items-center justify-center font-medium text-xs ${colors.avatarText} shrink-0`}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${colors.badge}`}
                    >
                      {roleLabel[r]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}