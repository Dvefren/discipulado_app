"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Phone, MapPin, Calendar, ChevronLeft, Pencil, UserMinus, UserPlus,
  Download, Camera, Trash2, Loader2, ChevronDown, ChevronUp, MessageSquare, Send,
} from "lucide-react";
import { t } from "@/lib/translate";

type AttendanceStatus = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
interface AttendanceRecord { id: string; status: string; classId: string; className: string; classDate: string; }
interface StudentNote { id: string; content: string; authorName: string; authorRole: string; createdAt: string; }
interface Student {
  id: string; firstName: string; lastName: string; phone: string | null;
  address: string | null; birthdate: string | null; profileNotes: Record<string, string>;
  facilitatorName: string; tableName: string; scheduleLabel: string; scheduleId: string;
  tableId: string; createdAt: string; status: string;
  quitDate: string | null; quitReason: string | null;
  attendance: AttendanceRecord[];
}
interface ProfileQuestion { id: string; question: string; type: string; options: string[] | null; }
interface ScheduleOption { id: string; label: string; tables: { id: string; name: string }[]; }
interface Props {
  students: Student[]; quitStudents: Student[];
  scheduleOptions: ScheduleOption[]; profileQuestions: ProfileQuestion[];
  role: string; userId: string; facilitatorTableIds: string[];
}

const statusMeta: Record<AttendanceStatus, { color: string; label: string; light: string }> = {
  PRESENT:   { color: "bg-green-500",  label: "Presente",  light: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ABSENT:    { color: "bg-red-400",    label: "Ausente",   light: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PREVIEWED: { color: "bg-blue-400",   label: "Adelantó",  light: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  RECOVERED: { color: "bg-yellow-400", label: "Recuperó",  light: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
};
const ATTENDED: AttendanceStatus[] = ["PRESENT", "PREVIEWED", "RECOVERED"];
function isAttended(status: string) { return ATTENDED.includes(status as AttendanceStatus); }
function getMeta(status: string) { return statusMeta[status as AttendanceStatus] ?? { color: "bg-gray-300", label: status, light: "bg-gray-100 text-gray-600" }; }

const roleLabels: Record<string, string> = {
  ADMIN: "Admin", SCHEDULE_LEADER: "Líder", SECRETARY: "Secretario(a)", FACILITATOR: "Facilitador(a)",
};

// ─── Quit Modal ──────────────────────────────────────────
function QuitModal({ student, onClose, onConfirm }: { student: Student; onClose: () => void; onConfirm: (date: string, reason: string) => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Dar de baja</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          ¿Estás seguro de dar de baja a <span className="font-medium text-foreground">{student.firstName} {student.lastName}</span>?
          El alumno será removido de la lista activa pero su información se conservará.
        </p>
        <div className="space-y-3 mb-5">
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de baja</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Razón (opcional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ej. Cambio de ciudad, problemas personales..."
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" /></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(date, reason)} className="flex-1 px-3 py-2 rounded-lg text-sm bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Confirmar baja</button>
        </div>
      </div>
    </div>
  );
}

// ─── Notes Timeline ──────────────────────────────────────
function NotesTimeline({ studentId, canWrite }: { studentId: string; canWrite: boolean }) {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/student-notes?studentId=${studentId}`)
      .then((r) => r.json())
      .then((data) => { setNotes(Array.isArray(data) ? data : []); setLoading(false); });
  }, [studentId]);

  async function handleSend() {
    if (!newNote.trim()) return;
    setSending(true);
    const res = await fetch("/api/student-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, content: newNote.trim() }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
    }
    setSending(false);
  }

  async function handleDelete(noteId: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    setDeletingId(noteId);
    const res = await fetch("/api/student-notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setDeletingId(null);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={14} className="text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas del alumno</h3>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      {/* Add note input */}
      {canWrite && (
        <div className="flex gap-2 mb-4">
          <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe una nota..."
            className="flex-1 px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={handleSend} disabled={!newNote.trim() || sending}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-muted-foreground mx-auto" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sin notas aún.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="group relative pl-4 border-l-2 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{note.authorName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{roleLabels[note.authorRole] ?? note.authorRole}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                    {" "}
                    {new Date(note.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button onClick={() => handleDelete(note.id)} disabled={deletingId === note.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50">
                    {deletingId === note.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground/80">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Attendance bar ──────────────────────────────────────
function AttendanceBar({ attendance }: { attendance: AttendanceRecord[] }) {
  const total = attendance.length;
  if (total === 0) return <p className="text-xs text-muted-foreground">Sin clases registradas aún.</p>;
  const counts = { PRESENT: attendance.filter((a) => a.status === "PRESENT").length, ABSENT: attendance.filter((a) => a.status === "ABSENT").length, PREVIEWED: attendance.filter((a) => a.status === "PREVIEWED").length, RECOVERED: attendance.filter((a) => a.status === "RECOVERED").length };
  const effective = counts.PRESENT + counts.PREVIEWED + counts.RECOVERED;
  const pct = Math.round((effective / total) * 100);
  const order: AttendanceStatus[] = ["PRESENT", "PREVIEWED", "RECOVERED", "ABSENT"];
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {order.map((s) => { const w = (counts[s] / total) * 100; return w > 0 ? <div key={s} className={statusMeta[s].color} style={{ width: `${w}%` }} /> : null; })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{pct}% asistencia</span>
        {order.map((s) => counts[s] > 0 ? <span key={s} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full inline-block ${statusMeta[s].color}`} />{counts[s]} {statusMeta[s].label}</span> : null)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {attendance.map((a) => { const meta = getMeta(a.status); return <div key={a.id} title={`${a.className} — ${meta.label}`} className={`w-5 h-5 rounded-sm ${meta.color} cursor-help`} />; })}
      </div>
    </div>
  );
}

// ─── Edit Student Modal ──────────────────────────────────
function EditStudentModal({ student, scheduleOptions, onClose, onUpdated }: { student: Student; scheduleOptions: ScheduleOption[]; onClose: () => void; onUpdated: (updated: Student) => void }) {
  const [saving, setSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(student.scheduleId);
  const [selectedTableId, setSelectedTableId] = useState(student.tableId);
  const [form, setForm] = useState({ firstName: student.firstName, lastName: student.lastName, phone: student.phone ?? "", address: student.address ?? "", birthdate: student.birthdate ? student.birthdate.split("T")[0] : "" });
  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];
  function setField(key: keyof typeof form, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  async function handleSave() {
    if (!form.firstName || !form.lastName || !selectedTableId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: student.id, ...form, phone: form.phone || null, address: form.address || null, birthdate: form.birthdate || null, tableId: selectedTableId }) });
      if (res.ok) {
        const sel = scheduleOptions.find((s) => s.id === selectedScheduleId);
        const tbl = availableTables.find((tt) => tt.id === selectedTableId);
        onUpdated({ ...student, ...form, phone: form.phone || null, address: form.address || null, birthdate: form.birthdate ? new Date(form.birthdate).toISOString() : null, scheduleId: selectedScheduleId, tableId: selectedTableId, scheduleLabel: sel?.label ?? student.scheduleLabel, tableName: tbl?.name ?? student.tableName, facilitatorName: tbl?.name ?? student.facilitatorName });
        onClose();
      }
    } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0"><h2 className="text-sm font-semibold text-foreground">Editar alumno</h2><button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button></div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label><input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Apellido *</label><input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label><input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de nacimiento</label><input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          </div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Dirección</label><input type="text" value={form.address} onChange={(e) => setField("address", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Horario *</label><select value={selectedScheduleId} onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"><option value="">Seleccionar horario</option>{scheduleOptions.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Facilitador *</label><select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} disabled={!selectedScheduleId} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"><option value="">Seleccionar facilitador</option>{availableTables.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}</select></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!form.firstName || !form.lastName || !selectedTableId || saving} className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{saving ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student profile ─────────────────────────────────────
function StudentProfile({ student, profileQuestions, scheduleOptions, role, userId, facilitatorTableIds, onBack, onUpdated, onQuit }: {
  student: Student; profileQuestions: ProfileQuestion[]; scheduleOptions: ScheduleOption[];
  role: string; userId: string; facilitatorTableIds: string[];
  onBack: () => void; onUpdated: (updated: Student) => void; onQuit: (student: Student) => void;
}) {
  const total = student.attendance.length;
  const present = student.attendance.filter((a) => a.status === "PRESENT").length;
  const absent = student.attendance.filter((a) => a.status === "ABSENT").length;
  const preview = student.attendance.filter((a) => a.status === "PREVIEWED").length;
  const recovered = student.attendance.filter((a) => a.status === "RECOVERED").length;
  const effective = present + preview + recovered;
  const pct = total > 0 ? Math.round((effective / total) * 100) : 0;
  const [showList, setShowList] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(student.profileNotes ?? {});
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = role === "ADMIN" || role === "SECRETARY";

  // Can write notes: admin, secretary, or facilitator who owns this student's table
  const canWriteNotes = role === "ADMIN" || role === "SECRETARY" || (role === "FACILITATOR" && facilitatorTableIds.includes(student.tableId));

  async function saveChurchNotes() {
    setSavingNotes(true);
    await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: student.id, profileNotes: notes }) });
    setSavingNotes(false); setSavedNotes(true); setTimeout(() => setSavedNotes(false), 2000);
    onUpdated({ ...student, profileNotes: notes });
  }

  const enrolledDate = new Date(student.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"><ChevronLeft size={14} /> Volver a alumnos</button>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-base font-semibold text-purple-700 dark:text-purple-300 shrink-0">{student.firstName[0]}{student.lastName[0]}</div>
          <div className="min-w-0"><h2 className="text-base font-semibold text-foreground truncate">{student.firstName} {student.lastName}</h2><p className="text-xs text-muted-foreground truncate">{t(student.scheduleLabel)} · {student.tableName} · {student.facilitatorName}</p></div>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {canEdit && (<>
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"><Pencil size={12} /> Editar</button>
            <button onClick={() => onQuit(student)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><UserMinus size={12} /> Baja</button>
          </>)}
          <div className="text-right"><p className="text-2xl font-bold text-foreground">{pct}%</p><p className="text-xs text-muted-foreground">asistencia</p></div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3"><p className="text-xs text-green-700 dark:text-green-400 mb-1">Presente</p><p className="text-xl font-semibold text-green-800 dark:text-green-300">{present}</p></div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3"><p className="text-xs text-red-700 dark:text-red-400 mb-1">Ausente</p><p className="text-xl font-semibold text-red-800 dark:text-red-300">{absent}</p></div>
        {preview > 0 && <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3"><p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Adelantó</p><p className="text-xl font-semibold text-blue-800 dark:text-blue-300">{preview}</p></div>}
        {recovered > 0 && <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3"><p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Recuperó</p><p className="text-xl font-semibold text-yellow-800 dark:text-yellow-300">{recovered}</p></div>}
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Total clases</p><p className="text-xl font-semibold text-foreground">{total}</p></div>
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Inscrito</p><p className="text-sm font-semibold text-foreground">{enrolledDate}</p></div>
      </div>
      {/* Attendance report */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex flex-col gap-2 mb-3">
          <h3 className="text-sm font-medium text-foreground">Reporte de asistencia</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Presente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Adelantó</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Recuperó</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Ausente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" />Sin registro</span>
          </div>
        </div>
        <AttendanceBar attendance={student.attendance} />
        <button onClick={() => setShowList(!showList)} className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{showList ? "Ocultar" : "Ver"} lista detallada
        </button>
        {showList && <div className="mt-3 space-y-1">{student.attendance.map((a) => { const meta = getMeta(a.status); return (
          <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/50">
            <span className="text-foreground truncate min-w-0">{a.className}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground hidden sm:inline">{new Date(a.classDate).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${meta.light}`}>{meta.label}</span>
            </div>
          </div>); })}</div>}
      </div>
      {/* Notes Timeline */}
      <NotesTimeline studentId={student.id} canWrite={canWriteNotes} />
      {/* Personal info */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Información personal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {student.phone && <div><p className="text-xs text-muted-foreground mb-0.5">Teléfono</p><div className="flex items-center gap-1.5 text-sm text-foreground"><Phone size={12} className="text-muted-foreground" />{student.phone}</div></div>}
          {student.birthdate && <div><p className="text-xs text-muted-foreground mb-0.5">Fecha de nacimiento</p><div className="flex items-center gap-1.5 text-sm text-foreground"><Calendar size={12} className="text-muted-foreground" />{new Date(student.birthdate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</div></div>}
          {student.address && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Dirección</p><div className="flex items-center gap-1.5 text-sm text-foreground"><MapPin size={12} className="text-muted-foreground" />{student.address}</div></div>}
          {!student.phone && !student.birthdate && !student.address && <p className="text-sm text-muted-foreground col-span-2">Sin información personal registrada.</p>}
        </div>
      </div>
      {/* Church questions */}
      {profileQuestions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preguntas de la iglesia</h3>
            <button onClick={saveChurchNotes} disabled={savingNotes} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{savingNotes ? "Guardando..." : savedNotes ? "Guardado ✓" : "Guardar respuestas"}</button>
          </div>
          <div className="space-y-4">{profileQuestions.map((q) => (
            <div key={q.id}><p className="text-sm text-foreground mb-1.5">{q.question}</p>
              {q.type === "boolean" || (q.options && q.options.length === 2) ? (
                <div className="flex gap-2">{(q.options ?? ["Sí", "No"]).map((opt) => (<button key={opt} onClick={() => setNotes((n) => ({ ...n, [q.id]: opt }))} className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${notes[q.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{opt}</button>))}</div>
              ) : q.type === "select" && q.options ? (
                <select value={notes[q.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"><option value="">Seleccionar...</option>{q.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>
              ) : (<input type="text" value={notes[q.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Escribe tu respuesta..." />)}
            </div>))}</div>
        </div>
      )}
      {editOpen && <EditStudentModal student={student} scheduleOptions={scheduleOptions} onClose={() => setEditOpen(false)} onUpdated={(u) => { onUpdated(u); setEditOpen(false); }} />}
    </div>
  );
}

// ─── Add Student Modal ────────────────────────────────────
function AddStudentModal({ scheduleOptions, profileQuestions, onClose, onAdded }: { scheduleOptions: ScheduleOption[]; profileQuestions: ProfileQuestion[]; onClose: () => void; onAdded: (s: Student) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false); const [saving, setSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(""); const [selectedTableId, setSelectedTableId] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", address: "", birthdate: "" });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];
  function setField(key: keyof typeof form, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; setScanning(true);
    try { const fd = new FormData(); fd.append("image", file); const res = await fetch("/api/ocr/student", { method: "POST", body: fd });
      if (res.ok) { const data = await res.json(); setForm((f) => ({ ...f, firstName: data.firstName ?? f.firstName, lastName: data.lastName ?? f.lastName, phone: data.phone ?? f.phone, address: data.address ?? f.address, birthdate: data.birthdate ?? f.birthdate }));
        if (data.churchAnswers) { const mapped: Record<string, string> = {}; for (const q of profileQuestions) { if (data.churchAnswers[q.question]) mapped[q.id] = data.churchAnswers[q.question]; } if (Object.keys(mapped).length > 0) setNotes((prev) => ({ ...prev, ...mapped })); }
    }} finally { setScanning(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }
  async function handleSave() {
    if (!form.firstName || !form.lastName || !selectedTableId) return; setSaving(true);
    try { const res = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, birthdate: form.birthdate || null, tableId: selectedTableId, profileNotes: notes }) }); if (res.ok) window.location.reload(); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Agregar alumno</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" title="Escanear formulario">
              {scanning ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}{scanning ? "Escaneando..." : "Escanear"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label><input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} placeholder="María" className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Apellido *</label><input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} placeholder="García" className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label><input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+52 868 000 0000" className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de nacimiento</label><input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          </div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Dirección</label><input type="text" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Calle, Colonia, Ciudad" className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Horario *</label><select value={selectedScheduleId} onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"><option value="">Seleccionar horario</option>{scheduleOptions.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Facilitador *</label><select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} disabled={!selectedScheduleId} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"><option value="">Seleccionar facilitador</option>{availableTables.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}</select></div>
          </div>
          {profileQuestions.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Preguntas de la iglesia</p>
              <div className="space-y-3">{profileQuestions.map((q) => (
                <div key={q.id}><p className="text-sm text-foreground mb-1.5">{q.question}</p>
                  {q.type === "boolean" || (q.options && q.options.length === 2) ? (
                    <div className="flex gap-2">{(q.options ?? ["Sí", "No"]).map((opt) => (<button key={opt} onClick={() => setNotes((n) => ({ ...n, [q.id]: opt }))} className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${notes[q.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{opt}</button>))}</div>
                  ) : (<input type="text" value={notes[q.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Respuesta..." />)}
                </div>))}</div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!form.firstName || !form.lastName || !selectedTableId || saving} className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{saving ? "Guardando..." : "Agregar alumno"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main list ───────────────────────────────────────────
export function StudentsClient({ students: initialStudents, quitStudents: initialQuit, scheduleOptions, profileQuestions, role, userId, facilitatorTableIds }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [quitStudents, setQuitStudents] = useState(initialQuit);
  const [activeTab, setActiveTab] = useState<"active" | "bajas">("active");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quitModalStudent, setQuitModalStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const canAdd = role === "ADMIN" || role === "SECRETARY";
  const canDelete = role === "ADMIN" || role === "SECRETARY";
  const scheduleLabels = scheduleOptions.map((s) => s.label);

  const currentList = activeTab === "active" ? students : quitStudents;
  const filtered = currentList.filter((s) => {
    const matchSchedule = filter === "all" || s.scheduleLabel === filter;
    const matchSearch = search.trim() === "" || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    return matchSchedule && matchSearch;
  });

  function exportCSV() {
    const headers = ["Nombre", "Horario", "Facilitador", "Mesa", "Teléfono", "Nacimiento", "Dirección", "Asistencia %", "Estado"];
    const rows = filtered.map((s) => {
      const tot = s.attendance.length; const eff = s.attendance.filter((a) => isAttended(a.status)).length; const pct = tot > 0 ? Math.round((eff / tot) * 100) : 0;
      return [`${s.firstName} ${s.lastName}`, t(s.scheduleLabel), s.facilitatorName, s.tableName, s.phone ?? "", s.birthdate ? new Date(s.birthdate).toLocaleDateString("es-MX") : "", s.address ?? "", `${pct}%`, s.status === "QUIT" ? "Baja" : "Activo"].map((v) => `"${v}"`).join(",");
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "alumnos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function handleQuitConfirm(date: string, reason: string) {
    if (!quitModalStudent) return;
    const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: quitModalStudent.id, action: "quit", quitDate: date, quitReason: reason }) });
    if (res.ok) { const updated = { ...quitModalStudent, status: "QUIT", quitDate: new Date(date).toISOString(), quitReason: reason || null }; setStudents((prev) => prev.filter((s) => s.id !== quitModalStudent.id)); setQuitStudents((prev) => [...prev, updated]); if (selectedStudent?.id === quitModalStudent.id) setSelectedStudent(null); }
    setQuitModalStudent(null);
  }

  async function handleReactivate(id: string) {
    if (!confirm("¿Reactivar este alumno? Volverá a la lista activa.")) return;
    setReactivatingId(id);
    const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "reactivate" }) });
    if (res.ok) { const st = quitStudents.find((s) => s.id === id); if (st) { setQuitStudents((prev) => prev.filter((s) => s.id !== id)); setStudents((prev) => [...prev, { ...st, status: "ACTIVE", quitDate: null, quitReason: null }]); } }
    setReactivatingId(null);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este alumno permanentemente? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    const res = await fetch("/api/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { setStudents((prev) => prev.filter((s) => s.id !== id)); setQuitStudents((prev) => prev.filter((s) => s.id !== id)); if (selectedStudent?.id === id) setSelectedStudent(null); }
    setDeletingId(null);
  }

  if (selectedStudent) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Alumnos</h1>
        <StudentProfile student={selectedStudent} profileQuestions={profileQuestions} scheduleOptions={scheduleOptions} role={role} userId={userId} facilitatorTableIds={facilitatorTableIds}
          onBack={() => setSelectedStudent(null)}
          onUpdated={(updated) => { setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s)); setSelectedStudent(updated); }}
          onQuit={(s) => setQuitModalStudent(s)} />
        {quitModalStudent && <QuitModal student={quitModalStudent} onClose={() => setQuitModalStudent(null)} onConfirm={handleQuitConfirm} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Alumnos</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"><Download size={13} /> Exportar CSV</button>
          {canAdd && <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"><Plus size={13} /> Agregar alumno</button>}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 border-b border-border">
        <button onClick={() => setActiveTab("active")} className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "active" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Activos <span className="ml-1 text-xs text-muted-foreground">({students.length})</span></button>
        <button onClick={() => setActiveTab("bajas")} className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "bajas" ? "border-red-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Bajas <span className="ml-1 text-xs text-red-400">({quitStudents.length})</span></button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" placeholder="Buscar alumnos..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...scheduleLabels].map((label) => (
            <button key={label} onClick={() => setFilter(label)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${filter === label ? "bg-muted font-medium text-foreground border-border" : "text-muted-foreground border-border hover:text-foreground"}`}>
              {label === "all" ? "Todos" : t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nombre</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Horario</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Facilitador</th>
            {activeTab === "active" && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Asistencia</th>}
            {activeTab === "bajas" && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Fecha de baja</th>}
            {activeTab === "bajas" && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Razón</th>}
            {canDelete && <th className="px-4 py-2.5 w-20" />}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">{activeTab === "bajas" ? "No hay alumnos dados de baja." : "No se encontraron alumnos."}</td></tr>
            ) : filtered.map((student) => {
              const tot = student.attendance.length; const eff = student.attendance.filter((a) => isAttended(a.status)).length; const pct = tot > 0 ? Math.round((eff / tot) * 100) : null;
              return (
                <tr key={student.id} onClick={() => activeTab === "active" ? setSelectedStudent(student) : null} className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${activeTab === "active" ? "cursor-pointer" : ""}`}>
                  <td className="px-4 py-2.5 text-sm text-foreground font-medium">{student.firstName} {student.lastName}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{t(student.scheduleLabel)}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{student.facilitatorName}</td>
                  {activeTab === "active" && <td className="px-4 py-2.5">{pct !== null ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : pct >= 60 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>{pct}%</span> : <span className="text-xs text-muted-foreground">—</span>}</td>}
                  {activeTab === "bajas" && <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.quitDate ? new Date(student.quitDate).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>}
                  {activeTab === "bajas" && <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{student.quitReason || "—"}</td>}
                  {canDelete && <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      {activeTab === "bajas" && <button onClick={() => handleReactivate(student.id)} disabled={reactivatingId === student.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50" title="Reactivar">{reactivatingId === student.id ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}</button>}
                      {activeTab === "active" && <button onClick={() => setQuitModalStudent(student)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Dar de baja"><UserMinus size={13} /></button>}
                      <button onClick={(e) => handleDelete(student.id, e)} disabled={deletingId === student.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50" title="Eliminar">{deletingId === student.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>
                    </div>
                  </td>}
                </tr>);
            })}
          </tbody>
        </table>
      </div>

      {activeTab === "bajas" && filtered.length > 0 && (() => {
        const filteredActive = students.filter((s) => filter === "all" || s.scheduleLabel === filter);
        const filteredQuit = filtered;
        const totalEnrolled = filteredActive.length + filteredQuit.length;
        return (
        <div className="mt-4 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Resumen de bajas{filter !== "all" ? ` — ${t(filter)}` : ""}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Total bajas</p><p className="text-xl font-semibold text-foreground">{filteredQuit.length}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Activos</p><p className="text-xl font-semibold text-foreground">{filteredActive.length}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Total inscriptos</p><p className="text-xl font-semibold text-foreground">{totalEnrolled}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Retención</p><p className="text-xl font-semibold text-emerald-500">{totalEnrolled > 0 ? Math.round((filteredActive.length / totalEnrolled) * 100) : 0}%</p></div>
          </div>
        </div>);
      })()}

      {modalOpen && <AddStudentModal scheduleOptions={scheduleOptions} profileQuestions={profileQuestions} onClose={() => setModalOpen(false)} onAdded={(s) => { setStudents((prev) => [...prev, s]); setModalOpen(false); }} />}
      {quitModalStudent && <QuitModal student={quitModalStudent} onClose={() => setQuitModalStudent(null)} onConfirm={handleQuitConfirm} />}
    </div>
  );
}