"use client";
import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import {
  X, Plus, Phone, MapPin, Calendar, ChevronLeft, Pencil, UserMinus, UserPlus,
  Download, Camera, Trash2, Loader2, ChevronDown, ChevronUp, MessageSquare, Send,
  HelpCircle, CheckSquare, Square, Users, Mail, Briefcase, GraduationCap,
  Home, Heart, Church, BookOpen, AlertCircle, User,
} from "lucide-react";
import { t } from "@/lib/translate";
import { StudentFormFields, StudentFormState, emptyStudentForm, formToPayload, studentToForm } from "@/components/student-form-fields";

type AttendanceStatus = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
interface AttendanceRecord { id: string; status: string; classId: string; className: string; classDate: string; }
interface StudentNote { id: string; content: string; authorName: string; authorRole: string; createdAt: string; }
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  gender: "MALE" | "FEMALE" | null;
  maritalStatus: string | null;
  isMother: boolean | null;
  isFather: boolean | null;
  email: string | null;
  placeOfBirth: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  cellPhone: string | null;
  landlinePhone: string | null;
  educationLevel: string | null;
  workplace: string | null;
  livingSituation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  acceptedChrist: boolean | null;
  isBaptized: boolean | null;
  baptismDate: string | null;
  howArrivedToChurch: string | null;
  coursePurpose: string | null;
  prayerAddiction: string | null;
  testimony: string | null;
  enrollmentDate: string | null;
  facilitatorName: string;
  tableName: string;
  scheduleLabel: string;
  scheduleId: string;
  tableId: string;
  createdAt: string;
  status: string;
  quitDate: string | null;
  quitReason: string | null;
  attendance: AttendanceRecord[];
}
interface ScheduleOption { id: string; label: string; tables: { id: string; name: string }[]; }
interface Props {
  students: Student[]; quitStudents: Student[];
  scheduleOptions: ScheduleOption[];
  role: string; userId: string; facilitatorTableIds: string[];
}

const UNASSIGNED_LABEL = "Por definir";

// ─── Module-level formatters (created once, reused everywhere) ──
const fmtShort = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtLong = new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "long", day: "numeric" });
const fmtMonthDay = new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric" });
const fmtTime = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" });

const statusMeta: Record<AttendanceStatus, { color: string; label: string; light: string }> = {
  PRESENT:   { color: "bg-green-500",  label: "Presente",  light: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ABSENT:    { color: "bg-red-400",    label: "Ausente",   light: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PREVIEWED: { color: "bg-blue-400",   label: "Adelantó",  light: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  RECOVERED: { color: "bg-yellow-400", label: "Recuperó",  light: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
};
const ATTENDED: AttendanceStatus[] = ["PRESENT", "PREVIEWED", "RECOVERED"];
function isAttended(status: string) { return ATTENDED.includes(status as AttendanceStatus); }
function getMeta(status: string) { return statusMeta[status as AttendanceStatus] ?? { color: "bg-gray-300", label: status, light: "bg-gray-100 text-gray-600" }; }

// ─── Student Details Card ───────────────────────────────
function Field({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-start gap-1.5 text-sm text-foreground">
        <Icon size={12} className="text-muted-foreground mt-0.5 shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function BoolPill({ value }: { value: boolean | null }) {
  if (value === true) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sí</span>;
  if (value === false) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">No</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-border" />
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function StudentDetailsCard({ student }: { student: Student }) {
  const genderLabel = student.gender === "MALE" ? "Masculino" : student.gender === "FEMALE" ? "Femenino" : null;
  const fullAddress = [student.street, student.streetNumber].filter(Boolean).join(" ");

  // Count filled fields per section to decide whether to render a section at all
  const hasDatos = student.birthdate || student.gender || student.maritalStatus || student.isMother !== null || student.isFather !== null || student.email || student.placeOfBirth || student.enrollmentDate;
  const hasDomicilio = fullAddress || student.neighborhood || student.cellPhone || student.landlinePhone || student.educationLevel || student.workplace || student.livingSituation || student.emergencyContactName || student.emergencyContactPhone;
  const hasIglesia = student.acceptedChrist !== null || student.isBaptized !== null || student.baptismDate || student.howArrivedToChurch || student.coursePurpose || student.prayerAddiction;
  const hasTestimony = !!student.testimony;

  if (!hasDatos && !hasDomicilio && !hasIglesia && !hasTestimony) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-sm text-muted-foreground text-center py-2">Sin información registrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      {/* ─── Datos personales ─── */}
      {hasDatos && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {student.birthdate && (
              <Field icon={Calendar} label="Fecha de nacimiento" value={fmtLong.format(new Date(student.birthdate))} />
            )}
            {genderLabel && (
              <Field icon={User} label="Sexo" value={genderLabel} />
            )}
            {student.maritalStatus && (
              <Field icon={Heart} label="Estado civil" value={student.maritalStatus} />
            )}
            {student.placeOfBirth && (
              <Field icon={MapPin} label="Lugar de nacimiento" value={student.placeOfBirth} />
            )}
            {student.isMother !== null && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">¿Es madre?</p>
                <BoolPill value={student.isMother} />
              </div>
            )}
            {student.isFather !== null && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">¿Es padre?</p>
                <BoolPill value={student.isFather} />
              </div>
            )}
            {student.email && (
              <Field icon={Mail} label="Email" value={student.email} />
            )}
            {student.enrollmentDate && (
              <Field icon={Calendar} label="Fecha de ingreso" value={fmtShort.format(new Date(student.enrollmentDate))} />
            )}
          </div>
        </>
      )}

      {/* ─── Domicilio ─── */}
      {hasDomicilio && (
        <>
          {hasDatos && <SectionDivider label="Domicilio" />}
          {!hasDatos && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Domicilio</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {fullAddress && (
              <Field icon={Home} label="Calle y número" value={fullAddress} />
            )}
            {student.neighborhood && (
              <Field icon={MapPin} label="Colonia" value={student.neighborhood} />
            )}
            {student.cellPhone && (
              <Field icon={Phone} label="Celular" value={student.cellPhone} />
            )}
            {student.landlinePhone && (
              <Field icon={Phone} label="Teléfono fijo" value={student.landlinePhone} />
            )}
            {student.educationLevel && (
              <Field icon={GraduationCap} label="Escolaridad" value={student.educationLevel} />
            )}
            {student.workplace && (
              <Field icon={Briefcase} label="Lugar de trabajo" value={student.workplace} />
            )}
            {student.livingSituation && (
              <Field icon={Users} label="Vive con" value={student.livingSituation} />
            )}
            {(student.emergencyContactName || student.emergencyContactPhone) && (
              <div className="sm:col-span-2 mt-1 p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Contacto de emergencia
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {student.emergencyContactName && (
                    <p className="text-sm text-foreground">{student.emergencyContactName}</p>
                  )}
                  {student.emergencyContactPhone && (
                    <p className="text-sm text-foreground flex items-center gap-1.5">
                      <Phone size={12} className="text-muted-foreground" />
                      {student.emergencyContactPhone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Iglesia ─── */}
      {hasIglesia && (
        <>
          {(hasDatos || hasDomicilio) && <SectionDivider label="Iglesia" />}
          {!hasDatos && !hasDomicilio && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Iglesia</p>}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {student.acceptedChrist !== null && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Aceptó a Cristo</p>
                  <BoolPill value={student.acceptedChrist} />
                </div>
              )}
              {student.isBaptized !== null && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Bautizado</p>
                  <div className="flex items-center gap-2">
                    <BoolPill value={student.isBaptized} />
                    {student.baptismDate && (
                      <span className="text-xs text-muted-foreground">
                        {fmtShort.format(new Date(student.baptismDate))}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {student.howArrivedToChurch && (
              <Field icon={Church} label="¿Cómo llegó a la iglesia?" value={student.howArrivedToChurch} />
            )}
            {student.coursePurpose && (
              <Field icon={BookOpen} label="Propósito del curso" value={student.coursePurpose} />
            )}
            {student.prayerAddiction && (
              <Field icon={Heart} label="Oración por" value={student.prayerAddiction} />
            )}
          </div>
        </>
      )}

      {/* ─── Testimonio ─── */}
      {hasTestimony && (
        <>
          {(hasDatos || hasDomicilio || hasIglesia) && <SectionDivider label="Testimonio" />}
          {!hasDatos && !hasDomicilio && !hasIglesia && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Testimonio</p>}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{student.testimony}</p>
          </div>
        </>
      )}
    </div>
  );
}

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
      method: "POST", headers: { "Content-Type": "application/json" },
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
      method: "DELETE", headers: { "Content-Type": "application/json" },
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
      {loading ? (
        <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-muted-foreground mx-auto" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sin notas aún.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const noteDate = new Date(note.createdAt);
            return (
              <div key={note.id} className="group relative pl-4 border-l-2 border-border hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{note.authorName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{roleLabels[note.authorRole] ?? note.authorRole}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {fmtShort.format(noteDate)} {fmtTime.format(noteDate)}
                    </span>
                    <button onClick={() => handleDelete(note.id)} disabled={deletingId === note.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50">
                      {deletingId === note.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground/80">{note.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Relationships Section ───────────────────────────────
function RelationshipsSection({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const [relationships, setRelationships] = useState<{ id: string; relatedStudent: { id: string; firstName: string; lastName: string }; type: string; createdAt: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [relType, setRelType] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const relationshipTypes = ["Esposo/a", "Hermano/a", "Padre/Madre", "Hijo/a", "Otro"];

  useEffect(() => {
    fetch(`/api/student-relationships?studentId=${studentId}`)
      .then((r) => r.json())
      .then((data) => { setRelationships(Array.isArray(data) ? data : []); setLoading(false); });
  }, [studentId]);

  function handleSearch(query: string) {
    setSearchQuery(query);
    setSelectedStudent(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/students/list?search=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const existingIds = new Set([studentId, ...relationships.map((r) => r.relatedStudent.id)]);
          const filtered = (data.students || []).filter((s: any) => !existingIds.has(s.id));
          setSearchResults(filtered.slice(0, 5));
        }
      } finally { setSearching(false); }
    }, 300);
  }

  async function handleAdd() {
    if (!selectedStudent || !relType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/student-relationships", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentAId: studentId, studentBId: selectedStudent.id, type: relType }),
      });
      if (res.ok) {
        const rel = await res.json();
        setRelationships((prev) => [...prev, rel]);
        setAddOpen(false); setSearchQuery(""); setSelectedStudent(null); setRelType(""); setSearchResults([]);
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta relación?")) return;
    setDeletingId(id);
    const res = await fetch("/api/student-relationships", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setRelationships((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Familiares en el curso</h3>
          {!loading && <span className="text-xs text-muted-foreground">({relationships.length})</span>}
        </div>
        {canEdit && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={11} /> Agregar
          </button>
        )}
      </div>
      {loading ? (
        <div className="py-4 text-center"><Loader2 size={16} className="animate-spin text-muted-foreground mx-auto" /></div>
      ) : relationships.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Sin familiares registrados en el curso.</p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div key={rel.id} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px] font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                  {rel.relatedStudent.firstName[0]}{rel.relatedStudent.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{rel.relatedStudent.firstName} {rel.relatedStudent.lastName}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground shrink-0">{rel.type}</span>
              </div>
              {canEdit && (
                <button onClick={() => handleDelete(rel.id)} disabled={deletingId === rel.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50">
                  {deletingId === rel.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Agregar familiar</h2>
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Buscar alumno *</label>
                <input type="text"
                  value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => { if (selectedStudent) { setSelectedStudent(null); setSearchQuery(""); } }}
                  placeholder="Escribe el nombre..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                {searchQuery.length >= 2 && !selectedStudent && (
                  <div className="mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-center"><Loader2 size={14} className="animate-spin text-muted-foreground mx-auto" /></div>
                    ) : searchResults.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">No se encontraron alumnos.</p>
                    ) : (
                      searchResults.map((s) => (
                        <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(""); setSearchResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors">
                          {s.firstName} {s.lastName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Relación *</label>
                <div className="flex flex-wrap gap-1.5">
                  {relationshipTypes.map((rt) => (
                    <button key={rt} onClick={() => setRelType(rt)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${relType === rt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {rt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAddOpen(false)} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={handleAdd} disabled={!selectedStudent || !relType || saving}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
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
  const [tbd, setTbd] = useState(student.tableId === "");
  const [selectedScheduleId, setSelectedScheduleId] = useState(student.scheduleId);
  const [selectedTableId, setSelectedTableId] = useState(student.tableId);
  const [form, setForm] = useState<StudentFormState>(studentToForm(student));
  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    if (!tbd && !selectedTableId) return;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          ...payload,
          tableId: tbd ? null : selectedTableId,
        }),
      });
      if (res.ok) {
        const sel = scheduleOptions.find((s) => s.id === selectedScheduleId);
        const tbl = availableTables.find((tt) => tt.id === selectedTableId);
        onUpdated({
          ...student,
          firstName: payload.firstName,
          lastName: payload.lastName,
          cellPhone: payload.cellPhone,
          neighborhood: payload.neighborhood,
          birthdate: payload.birthdate ? new Date(payload.birthdate).toISOString() : null,
          scheduleId: tbd ? "" : selectedScheduleId,
          tableId: tbd ? "" : selectedTableId,
          scheduleLabel: tbd ? UNASSIGNED_LABEL : (sel?.label ?? student.scheduleLabel),
          tableName: tbd ? UNASSIGNED_LABEL : (tbl?.name ?? student.tableName),
          facilitatorName: tbd ? UNASSIGNED_LABEL : (tbl?.name ?? student.facilitatorName),
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
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-3 sticky top-0 bg-card border-b border-border/50">
          <h2 className="text-sm font-semibold text-foreground">Editar alumno</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6">
          <StudentFormFields form={form} setForm={setForm} />

          {/* Assignment */}
          <div className="mt-5 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-muted-foreground" />
                <span className="text-xs text-foreground">Por definir</span>
              </div>
              <button type="button"
                onClick={() => { setTbd((v) => !v); setSelectedScheduleId(""); setSelectedTableId(""); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tbd ? "bg-primary" : "bg-muted"}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${tbd ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Horario {!tbd && "*"}</label>
                <select value={selectedScheduleId}
                  onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }}
                  disabled={tbd}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                  <option value="">Seleccionar horario</option>
                  {scheduleOptions.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Facilitador {!tbd && "*"}</label>
                <select value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  disabled={tbd || !selectedScheduleId}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                  <option value="">Seleccionar facilitador</option>
                  {availableTables.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-5">
            <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleSave}
              disabled={!form.firstName.trim() || !form.lastName.trim() || (!tbd && !selectedTableId) || saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student profile ─────────────────────────────────────
function StudentProfile({ student, scheduleOptions, role, userId, facilitatorTableIds, onBack, onUpdated, onQuit }: {
  student: Student; scheduleOptions: ScheduleOption[];
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
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = role === "ADMIN" || role === "SECRETARY";
  const canWriteNotes = role === "ADMIN" || role === "SECRETARY" || (role === "FACILITATOR" && facilitatorTableIds.includes(student.tableId));

  const enrolledDate = fmtShort.format(new Date(student.createdAt));
  const isUnassigned = student.tableId === "";

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"><ChevronLeft size={14} /> Volver a alumnos</button>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-base font-semibold text-purple-700 dark:text-purple-300 shrink-0">{student.firstName[0]}{student.lastName[0]}</div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{student.firstName} {student.lastName}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {isUnassigned ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"><HelpCircle size={10} /> Por definir</span>
              ) : (
                `${t(student.scheduleLabel)} · ${student.tableName} · ${student.facilitatorName}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {canEdit && (<>
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"><Pencil size={12} /> Editar</button>
            <button onClick={() => onQuit(student)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><UserMinus size={12} /> Baja</button>
          </>)}
          <div className="text-right"><p className="text-2xl font-bold text-foreground">{pct}%</p><p className="text-xs text-muted-foreground">asistencia</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3"><p className="text-xs text-green-700 dark:text-green-400 mb-1">Presente</p><p className="text-xl font-semibold text-green-800 dark:text-green-300">{present}</p></div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3"><p className="text-xs text-red-700 dark:text-red-400 mb-1">Ausente</p><p className="text-xl font-semibold text-red-800 dark:text-red-300">{absent}</p></div>
        {preview > 0 && <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3"><p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Adelantó</p><p className="text-xl font-semibold text-blue-800 dark:text-blue-300">{preview}</p></div>}
        {recovered > 0 && <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3"><p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Recuperó</p><p className="text-xl font-semibold text-yellow-800 dark:text-yellow-300">{recovered}</p></div>}
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Total clases</p><p className="text-xl font-semibold text-foreground">{total}</p></div>
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Inscrito</p><p className="text-sm font-semibold text-foreground">{enrolledDate}</p></div>
      </div>
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
              <span className="text-muted-foreground hidden sm:inline">{fmtMonthDay.format(new Date(a.classDate))}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${meta.light}`}>{meta.label}</span>
            </div>
          </div>); })}</div>}
      </div>
      <NotesTimeline studentId={student.id} canWrite={canWriteNotes} />
      <RelationshipsSection studentId={student.id} canEdit={canEdit} />
      <StudentDetailsCard student={student} />
      {editOpen && <EditStudentModal student={student} scheduleOptions={scheduleOptions} onClose={() => setEditOpen(false)} onUpdated={(u) => { onUpdated(u); setEditOpen(false); }} />}
    </div>
  );
}

// ─── Add Student Modal ────────────────────────────────────
function AddStudentModal({ scheduleOptions, onClose, onAdded }: { scheduleOptions: ScheduleOption[]; onClose: () => void; onAdded: (s: Student) => void }) {
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tbd, setTbd] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const availableTables = scheduleOptions.find((s) => s.id === selectedScheduleId)?.tables ?? [];

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr/student", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        // Phase 2c will rewrite the OCR parser. For now, fill whatever matches.
        setForm((f) => ({
          ...f,
          firstName: data.firstName ?? f.firstName,
          lastName: data.lastName ?? f.lastName,
          birthdate: data.birthdate ?? f.birthdate,
          maritalStatus: data.maritalStatus ?? f.maritalStatus,
          isMother: data.isMother ?? f.isMother,
          isFather: data.isFather ?? f.isFather,
          email: data.email ?? f.email,
          placeOfBirth: data.placeOfBirth ?? f.placeOfBirth,
          street: data.street ?? f.street,
          streetNumber: data.streetNumber ?? f.streetNumber,
          neighborhood: data.neighborhood ?? f.neighborhood,
          cellPhone: data.cellPhone ?? f.cellPhone,
          landlinePhone: data.landlinePhone ?? f.landlinePhone,
          educationLevel: data.educationLevel ?? f.educationLevel,
          workplace: data.workplace ?? f.workplace,
          livingSituation: data.livingSituation ?? f.livingSituation,
          emergencyContactName: data.emergencyContactName ?? f.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone ?? f.emergencyContactPhone,
          howArrivedToChurch: data.howArrivedToChurch ?? f.howArrivedToChurch,
          coursePurpose: data.coursePurpose ?? f.coursePurpose,
          prayerAddiction: data.prayerAddiction ?? f.prayerAddiction,
          testimony: data.testimony ?? f.testimony,
          enrollmentDate: data.enrollmentDate ?? f.enrollmentDate,
        }));
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    if (!tbd && !selectedTableId) return;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          tableId: tbd ? null : selectedTableId,
        }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-3 sticky top-0 bg-card border-b border-border/50 z-10">
          <h2 className="text-sm font-semibold text-foreground">Agregar alumno</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6">
          <StudentFormFields form={form} setForm={setForm} onScan={handleScan} scanning={scanning} showScan />

          {/* Assignment */}
          <div className="mt-5 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">Por definir</span>
                  <span className="text-[10px] text-muted-foreground">Asignar horario y facilitador después</span>
                </div>
              </div>
              <button type="button"
                onClick={() => { setTbd((v) => !v); setSelectedScheduleId(""); setSelectedTableId(""); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tbd ? "bg-primary" : "bg-muted"}`}
                aria-pressed={tbd}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${tbd ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Horario {!tbd && "*"}</label>
                <select value={selectedScheduleId}
                  onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }}
                  disabled={tbd}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                  <option value="">Seleccionar horario</option>
                  {scheduleOptions.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Facilitador {!tbd && "*"}</label>
                <select value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  disabled={tbd || !selectedScheduleId}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                  <option value="">Seleccionar facilitador</option>
                  {availableTables.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-5">
            <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleSave}
              disabled={!form.firstName.trim() || !form.lastName.trim() || (!tbd && !selectedTableId) || saving}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Guardando..." : "Agregar alumno"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Assign Modal ───────────────────────────────────
function BulkAssignModal({ count, scheduleOptions, onClose, onConfirm }: {
  count: number; scheduleOptions: ScheduleOption[];
  onClose: () => void;
  onConfirm: (tableId: string, scheduleLabel: string, tableName: string) => void;
}) {
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedSchedule = scheduleOptions.find((s) => s.id === selectedScheduleId);
  const availableTables = selectedSchedule?.tables ?? [];

  function handleSave() {
    if (!selectedTableId || !selectedSchedule) return;
    const tbl = availableTables.find((tt) => tt.id === selectedTableId);
    if (!tbl) return;
    setSaving(true);
    onConfirm(selectedTableId, selectedSchedule.label, tbl.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Asignar horario</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Asignar <span className="font-medium text-foreground">{count} alumno{count !== 1 ? "s" : ""}</span> al mismo horario y facilitador.
        </p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Horario *</label>
            <select value={selectedScheduleId}
              onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedTableId(""); }}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Seleccionar horario</option>
              {scheduleOptions.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Facilitador *</label>
            <select value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              disabled={!selectedScheduleId}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
              <option value="">Seleccionar facilitador</option>
              {availableTables.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={!selectedTableId || saving}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Memoized Student Row (KEY PERF OPTIMIZATION) ────────
interface StudentRowProps {
  student: Student;
  isSelected: boolean;
  activeTab: "active" | "bajas";
  canBulkAssign: boolean;
  canDelete: boolean;
  deletingId: string | null;
  reactivatingId: string | null;
  onRowClick: (student: Student) => void;
  onToggle: (id: string) => void;
  onQuit: (student: Student) => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const StudentRow = memo(function StudentRow({
  student, isSelected, activeTab, canBulkAssign, canDelete,
  deletingId, reactivatingId, onRowClick, onToggle, onQuit, onReactivate, onDelete,
}: StudentRowProps) {
  const tot = student.attendance.length;
  const eff = student.attendance.filter((a) => isAttended(a.status)).length;
  const pct = tot > 0 ? Math.round((eff / tot) * 100) : null;
  const isUnassigned = student.tableId === "";

  return (
    <tr
      onClick={() => activeTab === "active" && onRowClick(student)}
      className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${activeTab === "active" ? "cursor-pointer" : ""} ${isSelected ? "bg-muted/60" : ""}`}
    >
      {canBulkAssign && activeTab === "active" && (
        <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); onToggle(student.id); }}>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
          </button>
        </td>
      )}
      <td className="px-4 py-2.5 text-sm text-foreground font-medium">
        {student.firstName} {student.lastName}
        {isUnassigned && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground align-middle">
            <HelpCircle size={9} /> Por definir
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{isUnassigned ? <span className="text-muted-foreground/60">—</span> : t(student.scheduleLabel)}</td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{isUnassigned ? <span className="text-muted-foreground/60">—</span> : student.facilitatorName}</td>
      {activeTab === "active" && (
        <td className="px-4 py-2.5">
          {pct !== null ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : pct >= 60 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>{pct}%</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}
      {activeTab === "bajas" && (
        <td className="px-4 py-2.5 text-xs text-muted-foreground">
          {student.quitDate ? fmtShort.format(new Date(student.quitDate)) : "—"}
        </td>
      )}
      {activeTab === "bajas" && (
        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{student.quitReason || "—"}</td>
      )}
      {canDelete && (
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 justify-end">
            {activeTab === "bajas" && (
              <button onClick={() => onReactivate(student.id)} disabled={reactivatingId === student.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50" title="Reactivar">
                {reactivatingId === student.id ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              </button>
            )}
            {activeTab === "active" && (
              <button onClick={() => onQuit(student)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Dar de baja">
                <UserMinus size={13} />
              </button>
            )}
            <button onClick={(e) => onDelete(student.id, e)} disabled={deletingId === student.id}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50" title="Eliminar">
              {deletingId === student.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </td>
      )}
    </tr>
  );
});

// ─── Main list ───────────────────────────────────────────
export function StudentsClient({ students: initialStudents, quitStudents: initialQuit, scheduleOptions, role, userId, facilitatorTableIds }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [quitStudents, setQuitStudents] = useState(initialQuit);
  const [activeTab, setActiveTab] = useState<"active" | "bajas">("active");
  const [filter, setFilter] = useState("all");

  // Debounced search: searchInput = what user types (fast), search = what actually filters (debounced)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quitModalStudent, setQuitModalStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const canAdd = role === "ADMIN" || role === "SECRETARY";
  const canDelete = role === "ADMIN" || role === "SECRETARY";
  const canBulkAssign = role === "ADMIN" || role === "SECRETARY";

  const scheduleLabels = useMemo(() => scheduleOptions.map((s) => s.label), [scheduleOptions]);
  const hasUnassigned = useMemo(
    () => students.some((s) => s.tableId === "") || quitStudents.some((s) => s.tableId === ""),
    [students, quitStudents]
  );

  // ─── MEMOIZED FILTERING (critical INP fix) ──────────────
  const filtered = useMemo(() => {
    const currentList = activeTab === "active" ? students : quitStudents;
    const searchLower = search.trim().toLowerCase();
    return currentList.filter((s) => {
      const matchSchedule =
        filter === "all" ||
        (filter === UNASSIGNED_LABEL ? s.tableId === "" : s.scheduleLabel === filter);
      if (!matchSchedule) return false;
      if (searchLower === "") return true;
      return `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower);
    });
  }, [activeTab, students, quitStudents, filter, search]);

  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, filter, search]);

  const filteredIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const allVisibleSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = filteredIds.some((id) => selectedIds.has(id));

  // ─── STABLE CALLBACKS for memoized rows ────────────────
  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allVisibleSelected, filteredIds]);

  const handleRowClick = useCallback((student: Student) => {
    setSelectedStudent(student);
  }, []);

  const handleQuitClick = useCallback((student: Student) => {
    setQuitModalStudent(student);
  }, []);

  const handleReactivate = useCallback(async (id: string) => {
    if (!confirm("¿Reactivar este alumno? Volverá a la lista activa.")) return;
    setReactivatingId(id);
    const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "reactivate" }) });
    if (res.ok) {
      setQuitStudents((prev) => {
        const st = prev.find((s) => s.id === id);
        if (!st) return prev;
        setStudents((curr) => [...curr, { ...st, status: "ACTIVE", quitDate: null, quitReason: null }]);
        return prev.filter((s) => s.id !== id);
      });
    }
    setReactivatingId(null);
  }, []);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este alumno permanentemente? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    const res = await fetch("/api/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setQuitStudents((prev) => prev.filter((s) => s.id !== id));
      setSelectedStudent((curr) => curr?.id === id ? null : curr);
    }
    setDeletingId(null);
  }, []);

  async function exportXLSX() {
    const params = filter !== "all" ? `?schedule=${encodeURIComponent(filter)}` : "";
    const res = await fetch(`/api/students/export${params}`);
    if (!res.ok) { alert("Error al exportar."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `alumnos_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleQuitConfirm(date: string, reason: string) {
    if (!quitModalStudent) return;
    const res = await fetch("/api/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: quitModalStudent.id, action: "quit", quitDate: date, quitReason: reason }) });
    if (res.ok) {
      const updated = { ...quitModalStudent, status: "QUIT", quitDate: new Date(date).toISOString(), quitReason: reason || null };
      setStudents((prev) => prev.filter((s) => s.id !== quitModalStudent.id));
      setQuitStudents((prev) => [...prev, updated]);
      if (selectedStudent?.id === quitModalStudent.id) setSelectedStudent(null);
    }
    setQuitModalStudent(null);
  }

  async function handleBulkAssignConfirm(tableId: string, scheduleLabel: string, tableName: string) {
    const ids = Array.from(selectedIds);
    setBulkAssigning(true);
    try {
      const res = await fetch("/api/students", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkAssign", studentIds: ids, tableId }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            ids.includes(s.id)
              ? { ...s, tableId, scheduleLabel, tableName, facilitatorName: tableName, scheduleId: scheduleOptions.find((o) => o.label === scheduleLabel)?.id ?? s.scheduleId }
              : s
          )
        );
        setSelectedIds(new Set());
        setBulkAssignOpen(false);
      } else {
        alert("Error al asignar alumnos. Intenta de nuevo.");
      }
    } finally {
      setBulkAssigning(false);
    }
  }

  if (selectedStudent) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Alumnos</h1>
        <StudentProfile student={selectedStudent} scheduleOptions={scheduleOptions} role={role} userId={userId} facilitatorTableIds={facilitatorTableIds}
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
          <button onClick={exportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Download size={13} /> Exportar Excel
          </button>
          {canAdd && <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"><Plus size={13} /> Agregar alumno</button>}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 border-b border-border">
        <button onClick={() => setActiveTab("active")} className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "active" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Activos <span className="ml-1 text-xs text-muted-foreground">({students.length})</span></button>
        <button onClick={() => setActiveTab("bajas")} className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "bajas" ? "border-red-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Bajas <span className="ml-1 text-xs text-red-400">({quitStudents.length})</span></button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" placeholder="Buscar alumnos..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...scheduleLabels, ...(hasUnassigned ? [UNASSIGNED_LABEL] : [])].map((label) => (
            <button key={label} onClick={() => setFilter(label)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${filter === label ? "bg-muted font-medium text-foreground border-border" : "text-muted-foreground border-border hover:text-foreground"}`}>
              {label === "all" ? "Todos" : label === UNASSIGNED_LABEL ? UNASSIGNED_LABEL : t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {canBulkAssign && activeTab === "active" && (
              <th className="w-10 px-3 py-2.5">
                <button onClick={toggleAllVisible}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={allVisibleSelected ? "Deseleccionar todo" : "Seleccionar todo"}>
                  {allVisibleSelected ? <CheckSquare size={15} /> : someVisibleSelected ? <CheckSquare size={15} className="opacity-60" /> : <Square size={15} />}
                </button>
              </th>
            )}
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
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">{activeTab === "bajas" ? "No hay alumnos dados de baja." : "No se encontraron alumnos."}</td></tr>
            ) : filtered.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                isSelected={selectedIds.has(student.id)}
                activeTab={activeTab}
                canBulkAssign={canBulkAssign}
                canDelete={canDelete}
                deletingId={deletingId}
                reactivatingId={reactivatingId}
                onRowClick={handleRowClick}
                onToggle={toggleOne}
                onQuit={handleQuitClick}
                onReactivate={handleReactivate}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {activeTab === "bajas" && filtered.length > 0 && (() => {
        const filteredActive = students.filter((s) => filter === "all" || (filter === UNASSIGNED_LABEL ? s.tableId === "" : s.scheduleLabel === filter));
        const filteredQuit = filtered;
        const totalEnrolled = filteredActive.length + filteredQuit.length;
        return (
        <div className="mt-4 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Resumen de bajas{filter !== "all" ? ` — ${filter === UNASSIGNED_LABEL ? UNASSIGNED_LABEL : t(filter)}` : ""}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Total bajas</p><p className="text-xl font-semibold text-foreground">{filteredQuit.length}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Activos</p><p className="text-xl font-semibold text-foreground">{filteredActive.length}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Total inscriptos</p><p className="text-xl font-semibold text-foreground">{totalEnrolled}</p></div>
            <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Retención</p><p className="text-xl font-semibold text-emerald-500">{totalEnrolled > 0 ? Math.round((filteredActive.length / totalEnrolled) * 100) : 0}%</p></div>
          </div>
        </div>);
      })()}

      {modalOpen && <AddStudentModal scheduleOptions={scheduleOptions} onClose={() => setModalOpen(false)} onAdded={(s) => { setStudents((prev) => [...prev, s]); setModalOpen(false); }} />}
      {quitModalStudent && <QuitModal student={quitModalStudent} onClose={() => setQuitModalStudent(null)} onConfirm={handleQuitConfirm} />}
      {bulkAssignOpen && (
        <BulkAssignModal count={selectedIds.size} scheduleOptions={scheduleOptions} onClose={() => setBulkAssignOpen(false)} onConfirm={handleBulkAssignConfirm} />
      )}
      {canBulkAssign && selectedIds.size > 0 && activeTab === "active" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-full px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <span className="text-xs font-medium text-foreground">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setBulkAssignOpen(true)} disabled={bulkAssigning}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {bulkAssigning ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Asignar horario
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}