"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Pencil, Save, X, Lock, Loader2, Phone, Calendar,
  FileText, Users, UserPlus, AlertCircle, Mail, CheckCircle2,
} from "lucide-react";
import { t } from "@/lib/translate";

interface ProfileData {
  id: string;
  name: string;
  role: string;
  birthday: string | null;
  phone: string | null;
  bio: string | null;
  createdAt: string;
  hasUser: boolean;
  user: { id: string; email: string; role: string; createdAt: string } | null;
  currentCourseId: string | null;  // ← add
  courses: { id: string; name: string; isActive: boolean }[];  // ← add
  tables: { id: string; name: string; scheduleLabel: string; studentCount: number }[];
  stats: { totalStudents: number; averageAttendance: number | null; totalClasses: number };
  students: {
    id: string; firstName: string; lastName: string;
    scheduleLabel: string; tableName: string;
    attendancePct: number | null; totalClasses: number;
  }[];
  canEdit: boolean;
  canChangePassword: boolean;
  canCreateUser: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  SCHEDULE_LEADER: "Líder de horario",
  SECRETARY: "Secretario(a)",
  FACILITATOR: "Facilitador(a)",
};

const fmtLong = new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "long", day: "numeric" });
const fmtShort = new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "numeric" });

export function FacilitatorProfileClient({
  facilitatorId,
  currentUserRole,
}: {
  facilitatorId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Edit info form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", bio: "", birthday: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  // Password change
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Create user
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  async function loadProfile(courseIdOverride?: string) {
    setLoading(true);
    try {
      const params = courseIdOverride ? `?courseId=${courseIdOverride}` : "";
      const res = await fetch(`/api/facilitators/${facilitatorId}${params}`);
      if (res.status === 403) {
        setError("No tienes permiso para ver este perfil.");
        return;
      }
      if (!res.ok) {
        setError("Error al cargar el perfil.");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setSelectedCourseId(data.currentCourseId);
      setEditForm({
        name: data.name,
        phone: data.phone ?? "",
        bio: data.bio ?? "",
        birthday: data.birthday ?? "",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    loadProfile(courseId);
  }

  useEffect(() => { loadProfile(); }, [facilitatorId]);

  async function handleSaveInfo() {
    if (!editForm.name.trim()) return;
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/facilitators/${facilitatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await loadProfile();
        setEditing(false);
      }
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleChangePassword() {
    setPwdError(null);
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (pwdForm.next.length < 6) {
      setPwdError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch(`/api/facilitators/${facilitatorId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || "Error al cambiar la contraseña.");
        return;
      }
      setPwdSuccess(true);
      setPwdForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setPwdOpen(false); setPwdSuccess(false); }, 1500);
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleCreateUser() {
    setUserError(null);
    if (!userForm.email.trim() || !userForm.password) {
      setUserError("Email y contraseña son requeridos.");
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch(`/api/facilitators/${facilitatorId}/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || "Error al crear la cuenta.");
        return;
      }
      setCreateUserOpen(false);
      setUserForm({ email: "", password: "" });
      await loadProfile();
    } finally {
      setCreatingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        {currentUserRole === "ADMIN" && (
          <Link href="/dashboard/facilitators" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ChevronLeft size={14} /> Volver a facilitadores
          </Link>
        )}
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Perfil no encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/facilitators" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ChevronLeft size={14} /> Volver a facilitadores
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-lg font-semibold text-purple-700 dark:text-purple-300 shrink-0">
            {getInitials(profile.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{profile.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{roleLabels[profile.role] ?? "Facilitador(a)"}</p>
            {profile.user && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Mail size={11} /> {profile.user.email}
              </p>
            )}
          </div>
        </div>
        {profile.canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      {/* No user warning (admin only) */}
      {profile.canCreateUser && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Sin cuenta de usuario</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Este facilitador no puede iniciar sesión en el sistema. Crea una cuenta para darle acceso.
              </p>
              <Link
                href="/dashboard/users"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                <UserPlus size={12} /> Ir a Usuarios
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Alumnos activos</p>
          <p className="text-2xl font-semibold text-foreground">{profile.stats.totalStudents}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Asistencia promedio</p>
          <p className="text-2xl font-semibold text-foreground">
            {profile.stats.averageAttendance !== null ? `${profile.stats.averageAttendance}%` : "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Clases en su horario</p>
          <p className="text-2xl font-semibold text-foreground">{profile.stats.totalClasses}</p>
        </div>
      </div>

      {/* Personal information card */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Información personal</h3>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+52 868 000 0000"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de nacimiento</label>
                <input type="date" value={editForm.birthday} onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Biografía</label>
              <textarea value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3} placeholder="Breve descripción personal..."
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setEditing(false); setEditForm({ name: profile.name, phone: profile.phone ?? "", bio: profile.bio ?? "", birthday: profile.birthday ?? "" }); }}
                className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveInfo} disabled={!editForm.name.trim() || savingInfo}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {savingInfo ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Teléfono</p>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Phone size={12} className="text-muted-foreground" />
                {profile.phone || <span className="text-muted-foreground">Sin registrar</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Fecha de nacimiento</p>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Calendar size={12} className="text-muted-foreground" />
                {profile.birthday ? fmtLong.format(new Date(profile.birthday + "T12:00:00Z")) : <span className="text-muted-foreground">Sin registrar</span>}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Biografía</p>
              <div className="flex items-start gap-1.5 text-sm text-foreground">
                <FileText size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="whitespace-pre-wrap">{profile.bio || <span className="text-muted-foreground">Sin descripción</span>}</p>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Miembro desde</p>
              <p className="text-sm text-foreground">{fmtShort.format(new Date(profile.createdAt))}</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state for courses where this facilitator wasn't active */}
      {profile.tables.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4 text-center">
          <p className="text-sm text-muted-foreground">No participó como facilitador en este curso.</p>
        </div>
      )}

      {/* Assigned tables */}
      {profile.tables.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Mesa(s) asignada(s)</h3>
          <div className="space-y-2">
            {profile.tables.map((tbl) => (
              <div key={tbl.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
                <div>
                  <p className="text-sm font-medium text-foreground">{tbl.name}</p>
                  <p className="text-xs text-muted-foreground">{t(tbl.scheduleLabel)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{tbl.studentCount} alumnos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students list */}
      {profile.students.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sus alumnos</h3>
            <span className="text-xs text-muted-foreground">({profile.students.length})</span>
          </div>
          <div className="space-y-1">
            {profile.students.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/dashboard/students`)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-muted-foreground">{s.totalClasses} clases registradas</p>
                </div>
                {s.attendancePct !== null && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    s.attendancePct >= 80
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : s.attendancePct >= 60
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {s.attendancePct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account settings (self only) */}
      {profile.canChangePassword && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Configuración de cuenta</h3>
          <button
            onClick={() => setPwdOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Lock size={13} /> Cambiar contraseña
          </button>
        </div>
      )}

      {/* Password change modal */}
      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !savingPwd && setPwdOpen(false)} />
          <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
              <button onClick={() => !savingPwd && setPwdOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            {pwdSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm text-foreground">Contraseña actualizada</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña actual *</label>
                  <input type="password" value={pwdForm.current} onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nueva contraseña *</label>
                  <input type="password" value={pwdForm.next} onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Confirmar nueva contraseña *</label>
                  <input type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                {pwdError && (
                  <p className="text-xs text-red-500">{pwdError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setPwdOpen(false)} disabled={savingPwd}
                    className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleChangePassword}
                    disabled={!pwdForm.current || !pwdForm.next || !pwdForm.confirm || savingPwd}
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {savingPwd ? "Guardando..." : "Cambiar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create user modal (admin only) */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !creatingUser && setCreateUserOpen(false)} />
          <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Crear cuenta de usuario</h2>
              <button onClick={() => !creatingUser && setCreateUserOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Crear una cuenta para <span className="font-medium text-foreground">{profile.name}</span>. Podrá iniciar sesión con estos datos.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="facilitador@ejemplo.com"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña inicial *</label>
                <input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <p className="text-[10px] text-muted-foreground mt-1">Comparte esta contraseña con el facilitador. Podrá cambiarla en su perfil.</p>
              </div>
              {userError && (
                <p className="text-xs text-red-500">{userError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setCreateUserOpen(false)} disabled={creatingUser}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleCreateUser}
                  disabled={!userForm.email.trim() || !userForm.password || creatingUser}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {creatingUser ? "Creando..." : "Crear cuenta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}