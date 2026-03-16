"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  Home, Users, CheckSquare, BookOpen, Monitor, Calendar,
  UserCircle, Shield, LogOut, Menu, X, Sun, Moon, Settings,
} from "lucide-react";

type Role = "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";

const allNavItems = [
  { label: "Home", href: "/dashboard", icon: Home, roles: ["ADMIN", "SCHEDULE_LEADER", "SECRETARY"] },
  { label: "Students", href: "/dashboard/students", icon: Users, roles: ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"] },
  { label: "Attendance", href: "/dashboard/attendance", icon: CheckSquare, roles: ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"] },
  { label: "Classes", href: "/dashboard/classes", icon: BookOpen, roles: ["ADMIN"] },
  { label: "Courses", href: "/dashboard/courses", icon: Monitor, roles: ["ADMIN"] },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, roles: ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"] },
  { label: "Facilitators", href: "/dashboard/facilitators", icon: UserCircle, roles: ["ADMIN"] },
  { label: "Users", href: "/dashboard/users", icon: Shield, roles: ["ADMIN"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN"] },
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null; role?: string; };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const role = (user.role || "FACILITATOR") as Role;
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (mobileOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const roleLabels: Record<Role, string> = {
    ADMIN: "Admin", SCHEDULE_LEADER: "Leader", SECRETARY: "Secretary", FACILITATOR: "Facilitator",
  };

  const sidebarContent = (
    <>
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Alianza Logo" width={32} height={32} className="shrink-0" />
          <span className="font-medium text-sm text-foreground">Discipulado</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors ${active ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-red-600 bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-[11px] font-medium shrink-0">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{roleLabels[role]}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Alianza Logo" width={28} height={28} />
          <span className="font-medium text-sm text-foreground">Discipulado</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[260px] bg-secondary border-r border-border flex flex-col transform transition-transform duration-200 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>

      <aside className="hidden lg:flex w-[210px] min-w-[210px] bg-secondary border-r border-border flex-col h-full">
        {sidebarContent}
      </aside>
    </>
  );
}