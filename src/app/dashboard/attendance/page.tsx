"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Save, Users, BookOpen, ChevronDown } from "lucide-react";
import { saveAttendance } from "@/app/actions/attendance";

interface Schedule { id: string; label: string; }
interface ClassItem { id: string; name: string; date: string; }
interface FacilitatorTable { tableId: string; tableName: string; facilitatorName: string; }
interface ClassSummary { classId: string; presentCount: number; totalStudents: number; }

interface StudentAttendance {
  id: string; firstName: string; lastName: string;
  tableName: string; tableId: string; facilitatorName: string;
  status: string | null; absentReason: string | null;
  absentNote: string | null; altScheduleId: string | null;
  altScheduleLabel: string | null;
  altTableId: string | null;
  altTableName: string | null;
  altTableFacilitatorName: string | null;
  hasRecord: boolean;
}

type Status = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
type AbsentReason = "SICK" | "WORK" | "PERSONAL" | "TRAVEL" | "OTHER";

interface AttendanceRecord {
  status: Status | null;
  absentReason: AbsentReason | null;
  absentNote: string;
  altScheduleId: string;
  altTableId: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  PRESENT: { label: "Presente", color: "text-green-700", bg: "bg-green-100" },
  ABSENT: { label: "Ausente", color: "text-red-700", bg: "bg-red-100" },
  PREVIEWED: { label: "Adelantó", color: "text-blue-700", bg: "bg-blue-100" },
  RECOVERED: { label: "Recuperó", color: "text-amber-700", bg: "bg-amber-100" },
};

const ABSENT_REASONS: { value: AbsentReason; label: string }[] = [
  { value: "SICK", label: "Enfermedad" }, { value: "WORK", label: "Trabajo" },
  { value: "PERSONAL", label: "Personal" }, { value: "TRAVEL", label: "Viaje" },
  { value: "OTHER", label: "Otro" },
];

export default function AttendancePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorTable[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTable, setSelectedTable] = useState("");

  // Cache of facilitators per alt schedule, keyed by scheduleId.
  // Populated on-demand when a user picks an alt schedule for Adelantó/Recuperó.
  // Cache of facilitators per alt schedule, keyed by scheduleId.
  // Populated on-demand when a user picks an alt schedule for Adelantó/Recuperó.
  const [altFacilitatorsCache, setAltFacilitatorsCache] = useState<Record<string, FacilitatorTable[]>>({});

  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance")
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data.schedules || []);
        setAllSchedules(data.allSchedules || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedSchedule) { setClasses([]); setFacilitators([]); setSelectedClass(""); setSelectedTable(""); return; }
    fetch(`/api/attendance?scheduleId=${selectedSchedule}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setFacilitators(data.facilitators || []);
        setClassSummary(data.classSummary || []);
        setSelectedClass(""); setSelectedTable(""); setStudents([]);
      });
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedClass || !selectedSchedule) { setStudents([]); return; }
    const tableParam = selectedTable ? `&tableId=${selectedTable}` : "";
    fetch(`/api/attendance?scheduleId=${selectedSchedule}&classId=${selectedClass}${tableParam}`)
      .then((res) => res.json())
      .then((data) => {
        const studentData: StudentAttendance[] = data.students || [];
        setStudents(studentData);
        const initial: Record<string, AttendanceRecord> = {};
        const prefetchScheduleIds = new Set<string>();
        studentData.forEach((s) => {
          initial[s.id] = {
            status: s.hasRecord ? (s.status as Status) : null,
            absentReason: (s.absentReason as AbsentReason) || null,
            absentNote: s.absentNote || "",
            altScheduleId: s.altScheduleId || "",
            altTableId: s.altTableId || "",
          };
          if (s.altScheduleId) prefetchScheduleIds.add(s.altScheduleId);
        });
        setRecords(initial);
        // Prefetch alt facilitators for any alt schedules already in use,
        // so the dropdowns render the saved facilitator on first render.
        prefetchScheduleIds.forEach((sid) => loadAltFacilitators(sid));
        setSaved(false);
        setExpandedStudent(null);
      });
  }, [selectedClass, selectedSchedule, selectedTable]);

  async function loadAltFacilitators(altScheduleId: string) {
    if (!altScheduleId) return;
    if (altFacilitatorsCache[altScheduleId]) return; // already loaded
    const res = await fetch(`/api/attendance?altScheduleId=${altScheduleId}`);
    if (!res.ok) return;
    const data = await res.json();
    setAltFacilitatorsCache((prev) => ({
      ...prev,
      [altScheduleId]: data.altFacilitators || [],
    }));
  }

  function handleAltScheduleChange(studentId: string, altScheduleId: string) {
    // Reset altTableId when the alt schedule changes — the previous facilitator
    // belongs to a different schedule.
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], altScheduleId, altTableId: "" },
    }));
    setSaved(false);
    loadAltFacilitators(altScheduleId);
  }

  function setStatus(studentId: string, status: Status) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status, absentReason: null, absentNote: "", altScheduleId: "", altTableId: "" },
    }));
    setSaved(false);
    if (status === "ABSENT" || status === "PREVIEWED" || status === "RECOVERED") {
      setExpandedStudent(studentId);
    } else {
      setExpandedStudent(null);
    }
  }

  function cycleStatus(studentId: string) {
    const current = records[studentId]?.status;
    const order: Status[] = ["PRESENT", "ABSENT", "PREVIEWED", "RECOVERED"];
    if (current === null) { setStatus(studentId, "PRESENT"); return; }
    const next = order[(order.indexOf(current) + 1) % order.length];
    setStatus(studentId, next);
  }

  function updateRecord(studentId: string, updates: Partial<AttendanceRecord>) {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...updates } }));
    setSaved(false);
  }

  function markAllPresent() {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updated[s.id] = { status: "PRESENT", absentReason: null, absentNote: "", altScheduleId: "", altTableId: "" };
    });
    setRecords(updated);
    setSaved(false);
    setExpandedStudent(null);
  }

  function clearAll() {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updated[s.id] = { status: null, absentReason: null, absentNote: "", altScheduleId: "", altTableId: "" };
    });
    setRecords(updated);
    setSaved(false);
    setExpandedStudent(null);
  }

  async function handleSave() {
    if (!selectedClass) return;

    // Client-side validation: Adelantó/Recuperó require both alt schedule + alt table
    const missing: string[] = [];
    Object.entries(records).forEach(([studentId, rec]) => {
      if (rec.status === "PREVIEWED" || rec.status === "RECOVERED") {
        if (!rec.altScheduleId || !rec.altTableId) {
          const s = students.find((s) => s.id === studentId);
          if (s) missing.push(`${s.firstName} ${s.lastName}`);
        }
      }
    });
    if (missing.length > 0) {
      alert(
        `Los siguientes alumnos marcados como Adelantó/Recuperó necesitan horario Y facilitador:\n\n${missing.join("\n")}`
      );
      return;
    }

    setSaving(true);
    try {
      const data = Object.entries(records)
        .filter(([_, rec]) => rec.status !== null)
        .map(([studentId, rec]) => ({
          studentId,
          status: rec.status as any,
          absentReason: rec.status === "ABSENT" ? rec.absentReason : null,
          absentNote: rec.status === "ABSENT" ? rec.absentNote || null : null,
          altScheduleId:
            rec.status === "PREVIEWED" || rec.status === "RECOVERED"
              ? rec.altScheduleId || null
              : null,
          altTableId:
            rec.status === "PREVIEWED" || rec.status === "RECOVERED"
              ? rec.altTableId || null
              : null,
        }));
      await saveAttendance({ classId: selectedClass, records: data });
      setSaved(true);
      fetch(`/api/attendance?scheduleId=${selectedSchedule}`)
        .then((res) => res.json())
        .then((d) => setClassSummary(d.classSummary || []));
    } catch (err) {
      console.error(err);
      alert("Error al guardar. Revisa la consola.");
    } finally {
      setSaving(false);
    }
  }

  const otherSchedules = allSchedules.filter((s) => s.id !== selectedSchedule);
  const markedCount = Object.values(records).filter((r) => r.status !== null).length;
  const presentCount = Object.values(records).filter((r) => r.status === "PRESENT").length;
  const absentCount = Object.values(records).filter((r) => r.status === "ABSENT").length;
  const previewedCount = Object.values(records).filter((r) => r.status === "PREVIEWED").length;
  const recoveredCount = Object.values(records).filter((r) => r.status === "RECOVERED").length;
  const unmarkedCount = Object.values(records).filter((r) => r.status === null).length;
  const totalCount = students.length;
  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Asistencia</h1>
        <div className="bg-muted rounded-lg p-10 text-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium text-foreground mb-5">Asistencia</h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Horario</label>
          <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card">
            <option value="">Seleccionar horario</option>
            {schedules.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Clase</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSchedule} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card disabled:opacity-50">
            <option value="">Seleccionar clase</option>
            {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mesa / Facilitador</label>
          <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} disabled={!selectedSchedule} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card disabled:opacity-50">
            <option value="">Todas las mesas</option>
            {facilitators.map((f) => (<option key={f.tableId} value={f.tableId}>{f.tableName} — {f.facilitatorName}</option>))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {!selectedClass && (
        <div className="bg-muted rounded-lg p-10 text-center">
          <BookOpen size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {!selectedSchedule ? "Selecciona un horario y una clase para comenzar a marcar asistencia." : "Selecciona una clase para ver la lista de alumnos."}
          </p>
        </div>
      )}

      {/* Attendance List */}
      {selectedClass && students.length > 0 && (
        <>
          {/* Progress Bar & Stats */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{attendancePercent}% asistencia</span>
              <span className="text-xs text-muted-foreground">{presentCount}/{totalCount} presentes</span>
            </div>
            <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${attendancePercent}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {presentCount > 0 && <span className="text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">{presentCount} presentes</span>}
                {absentCount > 0 && <span className="text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">{absentCount} ausentes</span>}
                {previewedCount > 0 && <span className="text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">{previewedCount} adelantaron</span>}
                {recoveredCount > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">{recoveredCount} recuperaron</span>}
                {unmarkedCount > 0 && <span className="text-xs text-muted-foreground">{unmarkedCount} sin marcar</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markAllPresent} className="px-2.5 py-1 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors">Todos presentes</button>
                <button onClick={clearAll} className="px-2.5 py-1 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors">Limpiar</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : saved ? (<><Check size={13} /> Guardado</>) : (<><Save size={13} /> Guardar</>)}
                </button>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="space-y-1.5">
            {students.map((student) => {
              const rec = records[student.id];
              if (!rec) return null;
              const hasStatus = rec.status !== null;
              const config = hasStatus ? STATUS_CONFIG[rec.status!] : null;
              const isExpanded = expandedStudent === student.id;
              const needsDetails = rec.status === "ABSENT" || rec.status === "PREVIEWED" || rec.status === "RECOVERED";

              return (
                <div key={student.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => cycleStatus(student.id)} className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${hasStatus ? `${config!.bg} ${config!.color}` : "bg-accent text-muted-foreground"}`} title="Clic para cambiar estado">
                      {hasStatus ? config!.label : "Sin marcar"}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{student.tableName} — {student.facilitatorName}</p>
                    </div>
                    {needsDetails && (
                      <button onClick={() => setExpandedStudent(isExpanded ? null : student.id)} className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all ${isExpanded ? "rotate-180" : ""}`}>
                        <ChevronDown size={14} />
                      </button>
                    )}
                  </div>

                  {isExpanded && needsDetails && (
                    <div className="px-4 pb-3 pt-0 border-t border-border/50">
                      <div className="pt-3 space-y-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                            <button key={s} onClick={() => { setStatus(student.id, s); if (s === "PRESENT") setExpandedStudent(null); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${rec.status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}` : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>

                        {rec.status === "ABSENT" && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Razón</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {ABSENT_REASONS.map((r) => (
                                  <button key={r.value} onClick={() => updateRecord(student.id, { absentReason: r.value })} className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${rec.absentReason === r.value ? "bg-red-100 text-red-700 font-medium" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Nota (opcional)</label>
                              <input type="text" value={rec.absentNote} onChange={(e) => updateRecord(student.id, { absentNote: e.target.value })} placeholder="Ej. Tenía cita con el doctor" className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground" />
                            </div>
                          </div>
                        )}

                        {(rec.status === "PREVIEWED" || rec.status === "RECOVERED") && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">
                                {rec.status === "PREVIEWED" ? "¿En qué horario adelantó? *" : "¿En qué horario recuperó? *"}
                              </label>
                              <select
                                value={rec.altScheduleId}
                                onChange={(e) => handleAltScheduleChange(student.id, e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card"
                              >
                                <option value="">Seleccionar horario</option>
                                {otherSchedules.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                              </select>
                            </div>
                            {rec.altScheduleId && (
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">
                                  ¿Con qué facilitador? *
                                </label>
                                <select
                                  value={rec.altTableId}
                                  onChange={(e) => updateRecord(student.id, { altTableId: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card"
                                >
                                  <option value="">Seleccionar facilitador</option>
                                  {(altFacilitatorsCache[rec.altScheduleId] || []).map((f) => (
                                    <option key={f.tableId} value={f.tableId}>
                                      {f.tableName} — {f.facilitatorName}
                                    </option>
                                  ))}
                                </select>
                                {!altFacilitatorsCache[rec.altScheduleId] && (
                                  <p className="text-[10px] text-muted-foreground mt-1">Cargando facilitadores...</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedClass && students.length === 0 && (
        <div className="bg-muted rounded-lg p-10 text-center">
          <Users size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay alumnos en {selectedTable ? "esta mesa" : "este horario"} aún.</p>
        </div>
      )}
    </div>
  );
}