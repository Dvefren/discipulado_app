"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Shield, BookOpen, ClipboardCheck, UserCircle } from "lucide-react";
import { UserForm } from "@/components/user-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import { createUser, updateUser, deleteUser } from "@/app/actions/user-management";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  facilitatorId: string | null;
  facilitatorName: string | null;
  facilitatorSchedule: string | null;
  scheduleIds: string[];
  scheduleLabels: string[];
}

interface ScheduleOption { id: string; label: string; }
interface FacilitatorOption { id: string; name: string; scheduleLabel: string; linked: boolean; }

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ADMIN: { label: "Admin", icon: Shield, color: "text-red-600", bg: "bg-red-50" },
  SCHEDULE_LEADER: { label: "Schedule Leader", icon: BookOpen, color: "text-blue-700", bg: "bg-blue-50" },
  SECRETARY: { label: "Secretary", icon: ClipboardCheck, color: "text-teal-700", bg: "bg-teal-50" },
  FACILITATOR: { label: "Facilitator", icon: UserCircle, color: "text-amber-700", bg: "bg-amber-50" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);

  function fetchData() {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setSchedules(data.schedules || []);
        setFacilitators(data.facilitators || []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  function handleAdd() { setEditData(null); setFormOpen(true); }

  function handleEdit(u: UserData) {
    setEditData({
      userId: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      password: "",
      facilitatorId: u.facilitatorId || "",
      scheduleIds: u.scheduleIds,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(u: UserData) { setDeleteTarget(u); setDeleteOpen(true); }

  async function handleFormSubmit(data: any) {
    if (data.userId) {
      await updateUser({ ...data, newPassword: data.password || undefined });
    } else {
      await createUser(data);
    }
    fetchData();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Users</h1>
        <div className="bg-muted rounded-lg p-10 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Users</h1>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <Plus size={14} /> Create user
        </button>
      </div>

      {/* Role Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "all", label: "All roles" },
          { key: "ADMIN", label: "Admins" },
          { key: "SCHEDULE_LEADER", label: "Leaders" },
          { key: "SECRETARY", label: "Secretaries" },
          { key: "FACILITATOR", label: "Facilitators" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${filter === opt.key ? "bg-accent font-medium text-foreground border-border" : "text-muted-foreground border-border hover:border-border hover:text-foreground"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>

      {/* User Cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-muted rounded-lg p-10 text-center">
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          filtered.map((user) => {
            const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.FACILITATOR;
            const Icon = config.icon;

            return (
              <div key={user.id} className="bg-card border border-border rounded-xl p-4 hover:border-border transition-colors group">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={config.color} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                    {/* Role-specific details */}
                    {user.role === "FACILITATOR" && user.facilitatorName && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Linked to {user.facilitatorName} · {user.facilitatorSchedule}
                      </p>
                    )}
                    {(user.role === "SCHEDULE_LEADER" || user.role === "SECRETARY") && user.scheduleLabels.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {user.scheduleLabels.map((s) => s.replace("Wednesday", "Wed").replace("Sunday", "Sun")).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(user)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDeleteClick(user)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        schedules={schedules}
        facilitators={facilitators}
        initialData={editData}
      />

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete user"
        message={`Are you sure you want to delete ${deleteTarget?.name}'s account? They will no longer be able to log in.`}
      />
    </div>
  );
}