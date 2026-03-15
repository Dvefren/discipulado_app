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
  altScheduleLabel: string | null; hasRecord: boolean;
}

type Status = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
type AbsentReason = "SICK" | "WORK" | "PERSONAL" | "TRAVEL" | "OTHER";

interface AttendanceRecord {
  status: Status | null;
  absentReason: AbsentReason | null;
  absentNote: string;
  altScheduleId: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  PRESENT: { label: "Present", color: "text-green-700", bg: "bg-green-100" },
  ABSENT: { label: "Absent", color: "text-red-700", bg: "bg-red-100" },
  PREVIEWED: { label: "Previewed", color: "text-blue-700", bg: "bg-blue-100" },
  RECOVERED: { label: "Recovered", color: "text-amber-700", bg: "bg-amber-100" },
};

const ABSENT_REASONS: { value: AbsentReason; label: string }[] = [
  { value: "SICK", label: "Sick" }, { value: "WORK", label: "Work" },
  { value: "PERSONAL", label: "Personal" }, { value: "TRAVEL", label: "Travel" },
  { value: "OTHER", label: "Other" },
];

export default function AttendancePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorTable[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance")
      .then((res) => res.json())
      .then((data) => { setSchedules(data.schedules || []); setLoading(false); });
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
        studentData.forEach((s) => {
          initial[s.id] = {
            status: s.hasRecord ? (s.status as Status) : null,
            absentReason: (s.absentReason as AbsentReason) || null,
            absentNote: s.absentNote || "",
            altScheduleId: s.altScheduleId || "",
          };
        });
        setRecords(initial);
        setSaved(false);
        setExpandedStudent(null);
      });
  }, [selectedClass, selectedSchedule, selectedTable]);

  function setStatus(studentId: string, status: Status) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status, absentReason: null, absentNote: "", altScheduleId: "" },
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
      updated[s.id] = { status: "PRESENT", absentReason: null, absentNote: "", altScheduleId: "" };
    });
    setRecords(updated);
    setSaved(false);
    setExpandedStudent(null);
  }

  function clearAll() {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updated[s.id] = { status: null, absentReason: null, absentNote: "", altScheduleId: "" };
    });
    setRecords(updated);
    setSaved(false);
    setExpandedStudent(null);
  }

  async function handleSave() {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const data = Object.entries(records)
        .filter(([_, rec]) => rec.status !== null)
        .map(([studentId, rec]) => ({
          studentId,
          status: rec.status as any,
          absentReason: rec.status === "ABSENT" ? rec.absentReason : null,
          absentNote: rec.status === "ABSENT" ? rec.absentNote || null : null,
          altScheduleId: (rec.status === "PREVIEWED" || rec.status === "RECOVERED") ? rec.altScheduleId || null : null,
        }));
      await saveAttendance({ classId: selectedClass, records: data });
      setSaved(true);
      fetch(`/api/attendance?scheduleId=${selectedSchedule}`)
        .then((res) => res.json())
        .then((d) => setClassSummary(d.classSummary || []));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  const otherSchedules = schedules.filter((s) => s.id !== selectedSchedule);
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
        <h1 className="text-lg font-medium text-foreground mb-5">Attendance</h1>
        <div className="bg-muted rounded-lg p-10 text-center"><p className="text-sm text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium text-foreground mb-5">Attendance</h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Schedule</label>
          <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card">
            <option value="">Select a schedule</option>
            {schedules.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSchedule} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card disabled:opacity-50">
            <option value="">Select a class</option>
            {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Table / Facilitator</label>
          <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} disabled={!selectedSchedule} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card disabled:opacity-50">
            <option value="">All tables</option>
            {facilitators.map((f) => (<option key={f.tableId} value={f.tableId}>{f.tableName} — {f.facilitatorName}</option>))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {!selectedClass && (
        <div className="bg-muted rounded-lg p-10 text-center">
          <BookOpen size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {!selectedSchedule ? "Select a schedule and class to start marking attendance." : "Select a class to see the student list."}
          </p>
        </div>
      )}

      {/* Attendance List */}
      {selectedClass && students.length > 0 && (
        <>
          {/* Progress Bar & Stats */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{attendancePercent}% attendance</span>
              <span className="text-xs text-muted-foreground">{presentCount}/{totalCount} present</span>
            </div>
            <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${attendancePercent}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {presentCount > 0 && <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">{presentCount} present</span>}
                {absentCount > 0 && <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md">{absentCount} absent</span>}
                {previewedCount > 0 && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">{previewedCount} previewed</span>}
                {recoveredCount > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">{recoveredCount} recovered</span>}
                {unmarkedCount > 0 && <span className="text-xs text-muted-foreground">{unmarkedCount} unmarked</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markAllPresent} className="px-2.5 py-1 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors">All present</button>
                <button onClick={clearAll} className="px-2.5 py-1 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors">Clear all</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : saved ? (<><Check size={13} /> Saved</>) : (<><Save size={13} /> Save</>)}
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
                    {/* Status Button */}
                    <button onClick={() => cycleStatus(student.id)} className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${hasStatus ? `${config!.bg} ${config!.color}` : "bg-accent text-muted-foreground"}`} title="Click to set status">
                      {hasStatus ? config!.label : "Not marked"}
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
                              <label className="block text-xs text-muted-foreground mb-1">Reason</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {ABSENT_REASONS.map((r) => (
                                  <button key={r.value} onClick={() => updateRecord(student.id, { absentReason: r.value })} className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${rec.absentReason === r.value ? "bg-red-100 text-red-700 font-medium" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Note (optional)</label>
                              <input type="text" value={rec.absentNote} onChange={(e) => updateRecord(student.id, { absentNote: e.target.value })} placeholder="e.g. Had a doctor appointment" className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground" />
                            </div>
                          </div>
                        )}

                        {(rec.status === "PREVIEWED" || rec.status === "RECOVERED") && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">
                              {rec.status === "PREVIEWED" ? "Which schedule did they preview in?" : "Which schedule did they recover in?"}
                            </label>
                            <select value={rec.altScheduleId} onChange={(e) => updateRecord(student.id, { altScheduleId: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card">
                              <option value="">Select schedule</option>
                              {otherSchedules.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                            </select>
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
          <p className="text-sm text-muted-foreground">No students in this {selectedTable ? "table" : "schedule"} yet.</p>
        </div>
      )}
    </div>
  );
}