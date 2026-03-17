"use client";
import { useState, useRef } from "react";
import {
  X, Plus, Phone, MapPin, Calendar, ChevronLeft, Pencil,
  Download, Camera, Trash2, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
type AttendanceStatus = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
interface AttendanceRecord {
  id: string;
  status: string;
  classId: string;
  className: string;
  classDate: string;
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
  profileNotes: Record<string, string>;
  facilitatorName: string;
  tableName: string;
  scheduleLabel: string;
  scheduleId: string;
  tableId: string;
  createdAt: string;
  attendance: AttendanceRecord[];
}
interface ProfileQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
}
interface ScheduleOption {
  id: string;
  label: string;
  tables: { id: string; name: string }[];
}
interface Props {
  students: Student[];
  scheduleOptions: ScheduleOption[];
  profileQuestions: ProfileQuestion[];
  role: string;
}
const statusMeta: Record<AttendanceStatus, { color: string; label: string; light: string }> = {
  PRESENT:   { color: "bg-green-500",  label: "Present",   light: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ABSENT:    { color: "bg-red-400",    label: "Absent",    light: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PREVIEWED: { color: "bg-blue-400",   label: "Preview",   light: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  RECOVERED: { color: "bg-yellow-400", label: "Recovered", light: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
};
const ATTENDED: AttendanceStatus[] = ["PRESENT", "PREVIEWED", "RECOVERED"];
function isAttended(status: string) {
  return ATTENDED.includes(status as AttendanceStatus);
}
function getMeta(status: string) {
  return statusMeta[status as AttendanceStatus] ?? { color: "bg-gray-300", label: status, light: "bg-gray-100 text-gray-600" };
}
// ─── Attendance bar ──────────────────────────────────────
function AttendanceBar({ attendance }: { attendance: AttendanceRecord[] }) {
  const total = attendance.length;
  if (total === 0) return <p className="text-xs text-muted-foreground">No classes recorded yet.</p>;
  const counts = {
    PRESENT:   attendance.filter((a) => a.status === "PRESENT").length,
    ABSENT:    attendance.filter((a) => a.status === "ABSENT").length,
    PREVIEWED: attendance.filter((a) => a.status === "PREVIEWED").length,
    RECOVERED: attendance.filter((a) => a.status === "RECOVERED").length,
  };
  const effective = counts.PRESENT + counts.PREVIEWED + counts.RECOVERED;
  const pct = Math.round((effective / total) * 100);
  const order: AttendanceStatus[] = ["PRESENT", "PREVIEWED", "RECOVERED", "ABSENT"];
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {order.map((s) => {
          const w = (counts[s] / total) * 100;
          return w > 0 ? (
            <div key={s} className={statusMeta[s].color} style={{ width: `${w}%` }} />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{pct}% attendance</span>
        {order.map((s) =>
          counts[s] > 0 ? (
            <span key={s} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${statusMeta[s].color}`} />
              {counts[s]} {statusMeta[s].label}
            </span>
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {attendance.map((a) => {
          const meta = getMeta(a.status);
          return (
            <div
              key={a.id}
              title={`${a.className} — ${meta.label}`}
              className={`w-5 h-5 rounded-sm ${meta.color} cursor-help`}
            />
          );
        })}
      </div>
    </div>
  );
}
// ─── Edit Student Modal ──────────────────────────────────
function EditStudentModal({
  student,
  scheduleOptions,
  onClose,
  onUpdated,
}: {
  student: Student;
  scheduleOptions: ScheduleOption[];
  onClose: () => void;
  onUpdated: (updated: Student) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(student.scheduleId);
  const [selectedTableId, setSelectedTableId] = useState(student.tableId);
  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    phone: student.phone ?? "",
    address: student.address ?? "",
    birthdate: student.birthdate ? student.birthdate.split("T")[0] : "",
  });

  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !selectedTableId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          address: form.address || null,
          birthdate: form.birthdate || null,
          tableId: selectedTableId,
        }),
      });
      if (res.ok) {
        const selectedSchedule = scheduleOptions.find((s) => s.id === selectedScheduleId);
        const selectedTable = availableTables.find((t) => t.id === selectedTableId);
        onUpdated({
          ...student,
          ...form,
          phone: form.phone || null,
          address: form.address || null,
          birthdate: form.birthdate ? new Date(form.birthdate).toISOString() : null,
          scheduleId: selectedScheduleId,
          tableId: selectedTableId,
          scheduleLabel: selectedSchedule?.label ?? student.scheduleLabel,
          tableName: selectedTable?.name ?? student.tableName,
          facilitatorName: selectedTable?.name ?? student.facilitatorName,
        });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Edit Student</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">First name *</label>
              <input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Last name *</label>
              <input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Birthdate</label>
              <input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setField("address", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule *</label>
              <select value={selectedScheduleId} onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select schedule</option>
                {scheduleOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Facilitator *</label>
              <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} disabled={!selectedScheduleId}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                <option value="">Select facilitator</option>
                {availableTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!form.firstName || !form.lastName || !selectedTableId || saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Student profile ─────────────────────────────────────
function StudentProfile({
  student,
  profileQuestions,
  scheduleOptions,
  role,
  onBack,
  onUpdated,
}: {
  student: Student;
  profileQuestions: ProfileQuestion[];
  scheduleOptions: ScheduleOption[];
  role: string;
  onBack: () => void;
  onUpdated: (updated: Student) => void;
}) {
  const total = student.attendance.length;
  const present = student.attendance.filter((a) => a.status === "PRESENT").length;
  const absent  = student.attendance.filter((a) => a.status === "ABSENT").length;
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

  async function saveNotes() {
    setSavingNotes(true);
    await fetch("/api/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: student.id, profileNotes: notes }),
    });
    setSavingNotes(false);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
    onUpdated({ ...student, profileNotes: notes });
  }
  const enrolledDate = new Date(student.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ChevronLeft size={14} /> Back to students
      </button>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-base font-semibold text-purple-700 dark:text-purple-300 shrink-0">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {student.scheduleLabel} · {student.tableName} · {student.facilitatorName}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          {canEdit && (
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Pencil size={12} /> Edit
            </button>
          )}
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{pct}%</p>
            <p className="text-xs text-muted-foreground">attendance</p>
          </div>
        </div>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
          <p className="text-xs text-green-700 dark:text-green-400 mb-1">Present</p>
          <p className="text-xl font-semibold text-green-800 dark:text-green-300">{present}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-xs text-red-700 dark:text-red-400 mb-1">Absent</p>
          <p className="text-xl font-semibold text-red-800 dark:text-red-300">{absent}</p>
        </div>
        {preview > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Preview</p>
            <p className="text-xl font-semibold text-blue-800 dark:text-blue-300">{preview}</p>
          </div>
        )}
        {recovered > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Recovered</p>
            <p className="text-xl font-semibold text-yellow-800 dark:text-yellow-300">{recovered}</p>
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Total classes</p>
          <p className="text-xl font-semibold text-foreground">{total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Enrolled</p>
          <p className="text-sm font-semibold text-foreground">{enrolledDate}</p>
        </div>
      </div>
      {/* Attendance report */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex flex-col gap-2 mb-3">
          <h3 className="text-sm font-medium text-foreground">Attendance report</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Present</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Preview</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Recovered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Absent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" />No record</span>
          </div>
        </div>
        <AttendanceBar attendance={student.attendance} />
        <button
          onClick={() => setShowList(!showList)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showList ? "Hide" : "Show"} detailed list
        </button>
        {showList && (
          <div className="mt-3 space-y-1">
            {student.attendance.map((a) => {
              const meta = getMeta(a.status);
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/50">
                  <span className="text-foreground truncate min-w-0">{a.className}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground hidden sm:inline">
                      {new Date(a.classDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${meta.light}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Personal info */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {student.phone && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Phone size={12} className="text-muted-foreground" />
                {student.phone}
              </div>
            </div>
          )}
          {student.birthdate && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Birthdate</p>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Calendar size={12} className="text-muted-foreground" />
                {new Date(student.birthdate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          )}
          {student.address && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Address</p>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <MapPin size={12} className="text-muted-foreground" />
                {student.address}
              </div>
            </div>
          )}
          {!student.phone && !student.birthdate && !student.address && (
            <p className="text-sm text-muted-foreground col-span-2">No personal information recorded.</p>
          )}
        </div>
      </div>
      {/* Church questions */}
      {profileQuestions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Church Questions
            </h3>
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : savedNotes ? "Saved ✓" : "Save answers"}
            </button>
          </div>
          <div className="space-y-4">
            {profileQuestions.map((q) => (
              <div key={q.id}>
                <p className="text-sm text-foreground mb-1.5">{q.question}</p>
                {q.type === "boolean" || (q.options && q.options.length === 2) ? (
                  <div className="flex gap-2">
                    {(q.options ?? ["Sí", "No"]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setNotes((n) => ({ ...n, [q.id]: opt }))}
                        className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${
                          notes[q.id] === opt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.type === "select" && q.options ? (
                  <select
                    value={notes[q.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select...</option>
                    {q.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={notes[q.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Write your answer..."
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Edit modal */}
      {editOpen && (
        <EditStudentModal
          student={student}
          scheduleOptions={scheduleOptions}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => {
            onUpdated(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
// ─── Add Student Modal ────────────────────────────────────
function AddStudentModal({
  scheduleOptions,
  profileQuestions,
  onClose,
  onAdded,
}: {
  scheduleOptions: ScheduleOption[];
  profileQuestions: ProfileQuestion[];
  onClose: () => void;
  onAdded: (student: Student) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", address: "", birthdate: "",
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];
  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr/student", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          ...f,
          firstName: data.firstName ?? f.firstName,
          lastName:  data.lastName  ?? f.lastName,
          phone:     data.phone     ?? f.phone,
          address:   data.address   ?? f.address,
          birthdate: data.birthdate ?? f.birthdate,
        }));
        if (data.churchAnswers) {
          const mapped: Record<string, string> = {};
          for (const q of profileQuestions) {
            if (data.churchAnswers[q.question]) {
              mapped[q.id] = data.churchAnswers[q.question];
            }
          }
          if (Object.keys(mapped).length > 0) {
            setNotes((prev) => ({ ...prev, ...mapped }));
          }
        }
      }
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  async function handleSave() {
    if (!form.firstName || !form.lastName || !selectedTableId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          birthdate: form.birthdate || null,
          tableId: selectedTableId,
          profileNotes: notes,
        }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Add Student</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Scan registration form"
            >
              {scanning ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              {scanning ? "Scanning..." : "Scan form"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScan}
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">First name *</label>
              <input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} placeholder="María"
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Last name *</label>
              <input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} placeholder="García"
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+52 868 000 0000"
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Birthdate</label>
              <input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Street, Colony, City"
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule *</label>
              <select value={selectedScheduleId} onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select schedule</option>
                {scheduleOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Facilitator *</label>
              <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} disabled={!selectedScheduleId}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                <option value="">Select facilitator</option>
                {availableTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          {profileQuestions.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Church Questions</p>
              <div className="space-y-3">
                {profileQuestions.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm text-foreground mb-1.5">{q.question}</p>
                    {q.type === "boolean" || (q.options && q.options.length === 2) ? (
                      <div className="flex gap-2">
                        {(q.options ?? ["Sí", "No"]).map((opt) => (
                          <button key={opt} onClick={() => setNotes((n) => ({ ...n, [q.id]: opt }))}
                            className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${notes[q.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input type="text" value={notes[q.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Answer..." />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!form.firstName || !form.lastName || !selectedTableId || saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Saving..." : "Add student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Main list ───────────────────────────────────────────
export function StudentsClient({ students: initialStudents, scheduleOptions, profileQuestions, role }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canAdd    = role === "ADMIN" || role === "SECRETARY";
  const canDelete = role === "ADMIN" || role === "SECRETARY";
  const scheduleLabels = scheduleOptions.map((s) => s.label);
  const filtered = students.filter((s) => {
    const matchSchedule = filter === "all" || s.scheduleLabel === filter;
    const matchSearch = search.trim() === "" ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    return matchSchedule && matchSearch;
  });
  function exportCSV() {
    const headers = ["Name", "Schedule", "Facilitator", "Table", "Phone", "Birthdate", "Address", "Attendance %"];
    const rows = filtered.map((s) => {
      const total = s.attendance.length;
      const effective = s.attendance.filter((a) => isAttended(a.status)).length;
      const pct = total > 0 ? Math.round((effective / total) * 100) : 0;
      return [
        `${s.firstName} ${s.lastName}`,
        s.scheduleLabel,
        s.facilitatorName,
        s.tableName,
        s.phone ?? "",
        s.birthdate ? new Date(s.birthdate).toLocaleDateString() : "",
        s.address ?? "",
        `${pct}%`,
      ].map((v) => `"${v}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this student? This action cannot be undone.")) return;
    setDeletingId(id);
    const res = await fetch("/api/students", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedStudent?.id === id) setSelectedStudent(null);
    }
    setDeletingId(null);
  }
  if (selectedStudent) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Students</h1>
        <StudentProfile
          student={selectedStudent}
          profileQuestions={profileQuestions}
          scheduleOptions={scheduleOptions}
          role={role}
          onBack={() => setSelectedStudent(null)}
          onUpdated={(updated) => {
            setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
            setSelectedStudent(updated);
          }}
        />
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Students</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Download size={13} /> Export CSV
          </button>
          {canAdd && (
            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
              <Plus size={13} /> Add student
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" placeholder="Search students..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...scheduleLabels].map((label) => (
            <button key={label} onClick={() => setFilter(label)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${filter === label ? "bg-muted font-medium text-foreground border-border" : "text-muted-foreground border-border hover:text-foreground"}`}>
              {label === "all" ? "All" : label.replace("Wednesday", "Wed").replace("Sunday", "Sun")}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Schedule</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Facilitator</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Attendance</th>
              {canDelete && <th className="px-4 py-2.5 w-10" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No students found.
                </td>
              </tr>
            ) : (
              filtered.map((student) => {
                const total     = student.attendance.length;
                const effective = student.attendance.filter((a) => isAttended(a.status)).length;
                const pct       = total > 0 ? Math.round((effective / total) * 100) : null;
                return (
                  <tr key={student.id} onClick={() => setSelectedStudent(student)}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer">
                    <td className="px-4 py-2.5 text-sm text-foreground font-medium">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{student.scheduleLabel}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{student.facilitatorName}</td>
                    <td className="px-4 py-2.5">
                      {pct !== null ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : pct >= 60 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {pct}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleDelete(student.id, e)} disabled={deletingId === student.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                          {deletingId === student.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <AddStudentModal
          scheduleOptions={scheduleOptions}
          profileQuestions={profileQuestions}
          onClose={() => setModalOpen(false)}
          onAdded={(s) => { setStudents((prev) => [...prev, s]); setModalOpen(false); }}
        />
      )}
    </div>
  );
}