"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2, Pencil, Loader2, Eye, EyeOff } from "lucide-react";

type Role = "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  facilitatorId: string | null;
  facilitatorName: string | null;
  facilitatorSchedule: string | null;
  scheduleIds: string[];
  scheduleLabels: string[];
}

interface ScheduleOption {
  id: string;
  label: string;
}

interface FacilitatorOption {
  id: string;
  name: string;
  scheduleLabel: string;
  linked: boolean;
}

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
  ADMIN:           "Administrador",
  SCHEDULE_LEADER: "Líder de horario",
  SECRETARY:       "Secretario(a)",
  FACILITATOR:     "Facilitador(a)",
};

const roleOrder: Role[] = ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function needsSchedule(role: string) {
  return role === "SCHEDULE_LEADER" || role === "SECRETARY";
}

function needsFacilitator(role: string) {
  return role === "FACILITATOR";
}

// ─── Create User Modal ──────────────────────────────────
function CreateUserModal({
  schedules,
  facilitators,
  onClose,
  onCreated,
}: {
  schedules: ScheduleOption[];
  facilitators: FacilitatorOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "FACILITATOR" as Role,
    scheduleId: "", facilitatorId: "",
  });

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  // Filter facilitators to show only unlinked ones
  const availableFacilitators = facilitators.filter((f) => !f.linked);

  async function handleSave() {
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required");
      return;
    }
    if (needsSchedule(form.role) && !form.scheduleId) {
      setError("Selecciona un horario");
      return;
    }
    if (needsFacilitator(form.role) && !form.facilitatorId) {
      setError("Selecciona un facilitador para vincular");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          scheduleId: needsSchedule(form.role) ? form.scheduleId : undefined,
          facilitatorId: needsFacilitator(form.role) ? form.facilitatorId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear usuario");
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Create User</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Juan Pérez"
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="juan@discipulado.app"
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {roleOrder.map((r) => (
                <button key={r} onClick={() => { setField("role", r); setField("scheduleId", ""); setField("facilitatorId", ""); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${form.role === r ? `${roleColors[r].badge} border-transparent` : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {roleLabel[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule selector for Leader/Secretary */}
          {needsSchedule(form.role) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Assign to Schedule *</label>
              <select value={form.scheduleId} onChange={(e) => setField("scheduleId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select schedule</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}

          {/* Facilitator selector */}
          {needsFacilitator(form.role) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Link to Facilitator *</label>
              <select value={form.facilitatorId} onChange={(e) => setField("facilitatorId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select facilitator</option>
                {availableFacilitators.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.scheduleLabel})</option>
                ))}
              </select>
              {availableFacilitators.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">All facilitators are already linked to users.</p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ─────────────────────────────────────
function EditUserModal({
  user,
  schedules,
  facilitators,
  onClose,
  onUpdated,
}: {
  user: UserData;
  schedules: ScheduleOption[];
  facilitators: FacilitatorOption[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role as Role,
    scheduleId: user.scheduleIds[0] ?? "",
    facilitatorId: user.facilitatorId ?? "",
  });

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  // For facilitators: show unlinked ones + the one currently linked to this user
  const availableFacilitators = facilitators.filter(
    (f) => !f.linked || f.id === user.facilitatorId
  );

  async function handleSave() {
    if (!form.name || !form.email) {
      setError("Nombre y correo son requeridos");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: form.name,
          email: form.email,
          role: form.role,
          scheduleId: needsSchedule(form.role) ? form.scheduleId || null : undefined,
          facilitatorId: needsFacilitator(form.role) ? form.facilitatorId || null : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al actualizar usuario");
        return;
      }
      onUpdated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Edit User</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {roleOrder.map((r) => (
                <button key={r} onClick={() => { setField("role", r); setField("scheduleId", ""); setField("facilitatorId", ""); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${form.role === r ? `${roleColors[r].badge} border-transparent` : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {roleLabel[r]}
                </button>
              ))}
            </div>
          </div>

          {needsSchedule(form.role) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Assign to Schedule</label>
              <select value={form.scheduleId} onChange={(e) => setField("scheduleId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select schedule</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}

          {needsFacilitator(form.role) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Link to Facilitator</label>
              <select value={form.facilitatorId} onChange={(e) => setField("facilitatorId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select facilitator</option>
                {availableFacilitators.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.scheduleLabel})</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Users Client ───────────────────────────────────
export function UsersClient() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchData() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users);
    setSchedules(data.schedules);
    setFacilitators(data.facilitators);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleDelete(user: UserData) {
    if (!confirm(`Eliminar usuario "${user.name}"? This action cannot be undone.`)) return;
    setDeletingId(user.id);
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    }
    setDeletingId(null);
  }

  const grouped = roleOrder
    .map((r) => ({ role: r, users: users.filter((u) => u.role === r) }))
    .filter((g) => g.users.length > 0);

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Usuarios</h1>
        <div className="bg-muted/30 rounded-xl p-10 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Usuarios</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{users.length} en total</span>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
            <Plus size={13} /> Add user
          </button>
        </div>
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
                <div key={user.id}
                  className="group bg-card border border-border rounded-xl p-3.5 hover:border-border/60 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full ${colors.avatar} flex items-center justify-center font-medium text-xs ${colors.avatarText} shrink-0`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {/* Show schedule assignment */}
                      {user.scheduleLabels.length > 0 && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          {user.scheduleLabels.join(", ")}
                        </p>
                      )}
                      {user.facilitatorName && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          Vinculado: {user.facilitatorName} {user.facilitatorSchedule ? `(${user.facilitatorSchedule})` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {roleLabel[r]}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditUser(user)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(user)} disabled={deletingId === user.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                          {deletingId === user.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {createOpen && (
        <CreateUserModal
          schedules={schedules}
          facilitators={facilitators}
          onClose={() => setCreateOpen(false)}
          onCreated={fetchData}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          schedules={schedules}
          facilitators={facilitators}
          onClose={() => setEditUser(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}