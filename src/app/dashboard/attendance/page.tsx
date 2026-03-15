"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Save, Users, BookOpen, X, ChevronDown } from "lucide-react";
import { saveAttendance } from "@/app/actions/attendance";

interface Schedule {
  id: string;
  label: string;
}

interface ClassItem {
  id: string;
  name: string;
  topic: string | null;
  date: string;
  dateFormatted: string;
}

interface StudentAttendance {
  id: string;
  firstName: string;
  lastName: string;
  tableName: string;
  facilitatorName: string;
  status: string | null;
  absentReason: string | null;
  absentNote: string | null;
  altScheduleId: string | null;
  altScheduleLabel: string | null;
  hasRecord: boolean;
}

interface ClassSummary {
  classId: string;
  presentCount: number;
  totalStudents: number;
}

type Status = "PRESENT" | "ABSENT" | "PREVIEWED" | "RECOVERED";
type AbsentReason = "SICK" | "WORK" | "PERSONAL" | "TRAVEL" | "OTHER";

interface AttendanceRecord {
  status: Status;
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
  { value: "SICK", label: "Sick" },
  { value: "WORK", label: "Work" },
  { value: "PERSONAL", label: "Personal" },
  { value: "TRAVEL", label: "Travel" },
  { value: "OTHER", label: "Other" },
];

export default function AttendancePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
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
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedSchedule) {
      setClasses([]);
      setSelectedClass("");
      return;
    }
    fetch(`/api/attendance?scheduleId=${selectedSchedule}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setClassSummary(data.classSummary || []);
        setSelectedClass("");
        setStudents([]);
      });
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedClass || !selectedSchedule) {
      setStudents([]);
      return;
    }
    fetch(`/api/attendance?scheduleId=${selectedSchedule}&classId=${selectedClass}`)
      .then((res) => res.json())
      .then((data) => {
        const studentData: StudentAttendance[] = data.students || [];
        setStudents(studentData);
        const initial: Record<string, AttendanceRecord> = {};
        studentData.forEach((s) => {
          initial[s.id] = {
            status: (s.status as Status) || "PRESENT",
            absentReason: (s.absentReason as AbsentReason) || null,
            absentNote: s.absentNote || "",
            altScheduleId: s.altScheduleId || "",
          };
        });
        setRecords(initial);
        setSaved(false);
        setExpandedStudent(null);
      });
  }, [selectedClass, selectedSchedule]);

  function updateRecord(studentId: string, updates: Partial<AttendanceRecord>) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...updates },
    }));
    setSaved(false);
  }

  function cycleStatus(studentId: string) {
    const current = records[studentId]?.status || "PRESENT";
    const order: Status[] = ["PRESENT", "ABSENT", "PREVIEWED", "RECOVERED"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateRecord(studentId, {
      status: next,
      absentReason: null,
      absentNote: "",
      altScheduleId: "",
    });
    if (next === "ABSENT" || next === "PREVIEWED" || next === "RECOVERED") {
      setExpandedStudent(studentId);
    } else {
      setExpandedStudent(null);
    }
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

  async function handleSave() {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const data = Object.entries(records).map(([studentId, rec]) => ({
        studentId,
        status: rec.status as any,
        absentReason: rec.status === "ABSENT" ? rec.absentReason : null,
        absentNote: rec.status === "ABSENT" ? rec.absentNote || null : null,
        altScheduleId:
          rec.status === "PREVIEWED" || rec.status === "RECOVERED"
            ? rec.altScheduleId || null
            : null,
      }));
      await saveAttendance({ classId: selectedClass, records: data });
      setSaved(true);
      fetch(`/api/attendance?scheduleId=${selectedSchedule}`)
        .then((res) => res.json())
        .then((d) => setClassSummary(d.classSummary || []));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const otherSchedules = schedules.filter((s) => s.id !== selectedSchedule);
  const presentCount = Object.values(records).filter((r) => r.status === "PRESENT").length;
  const absentCount = Object.values(records).filter((r) => r.status === "ABSENT").length;
  const previewedCount = Object.values(records).filter((r) => r.status === "PREVIEWED").length;
  const recoveredCount = Object.values(records).filter((r) => r.status === "RECOVERED").length;
  const totalCount = students.length;

  const getSummary = useCallback(
    (classId: string) => classSummary.find((s) => s.classId === classId),
    [classSummary]
  );

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-gray-900 mb-5">Attendance</h1>
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium text-gray-900 mb-5">Attendance</h1>

      {/* Schedule & Class Selection */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Schedule</label>
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 bg-white"
          >
            <option value="">Select a schedule</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSchedule}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 bg-white disabled:opacity-50"
          >
            <option value="">Select a class</option>
            {classes.map((c) => {
              const summary = getSummary(c.id);
              const badge = summary && summary.totalStudents > 0
                ? ` (${summary.presentCount}/${summary.totalStudents})`
                : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.dateFormatted} — {c.topic || c.name}{badge}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {!selectedClass && (
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <BookOpen size={24} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">
            {!selectedSchedule
              ? "Select a schedule and class to start marking attendance."
              : "Select a class to see the student list."}
          </p>
        </div>
      )}

      {/* Attendance List */}
      {selectedClass && students.length > 0 && (
        <>
          {/* Stats Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">{presentCount} present</span>
              {absentCount > 0 && <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md">{absentCount} absent</span>}
              {previewedCount > 0 && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">{previewedCount} previewed</span>}
              {recoveredCount > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">{recoveredCount} recovered</span>}
              <span className="text-xs text-gray-400">{totalCount} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllPresent}
                className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                All present
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? (<><Check size={13} /> Saved</>) : (<><Save size={13} /> Save</>)}
              </button>
            </div>
          </div>

          {/* Student List */}
          <div className="space-y-1.5">
            {students.map((student) => {
              const rec = records[student.id];
              if (!rec) return null;
              const config = STATUS_CONFIG[rec.status];
              const isExpanded = expandedStudent === student.id;
              const needsDetails = rec.status === "ABSENT" || rec.status === "PREVIEWED" || rec.status === "RECOVERED";

              return (
                <div key={student.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Main Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Status Button */}
                    <button
                      onClick={() => cycleStatus(student.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${config.bg} ${config.color}`}
                      title="Click to cycle status"
                    >
                      {config.label}
                    </button>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {student.tableName} — {student.facilitatorName}
                      </p>
                    </div>

                    {/* Expand button for details */}
                    {needsDetails && (
                      <button
                        onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && needsDetails && (
                    <div className="px-4 pb-3 pt-0 border-t border-gray-100">
                      <div className="pt-3 space-y-3">
                        {/* Status Selector */}
                        <div className="flex gap-1.5 flex-wrap">
                          {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                updateRecord(student.id, {
                                  status: s,
                                  absentReason: null,
                                  absentNote: "",
                                  altScheduleId: "",
                                });
                                if (s === "PRESENT") setExpandedStudent(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                rec.status === s
                                  ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`
                                  : "bg-gray-50 text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>

                        {/* Absent Fields */}
                        {rec.status === "ABSENT" && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Reason</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {ABSENT_REASONS.map((r) => (
                                  <button
                                    key={r.value}
                                    onClick={() => updateRecord(student.id, { absentReason: r.value })}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                      rec.absentReason === r.value
                                        ? "bg-red-100 text-red-700 font-medium"
                                        : "bg-gray-50 text-gray-500 hover:text-gray-700"
                                    }`}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                              <input
                                type="text"
                                value={rec.absentNote}
                                onChange={(e) => updateRecord(student.id, { absentNote: e.target.value })}
                                placeholder="e.g. Had a doctor appointment"
                                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Previewed / Recovered — Schedule Picker */}
                        {(rec.status === "PREVIEWED" || rec.status === "RECOVERED") && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {rec.status === "PREVIEWED"
                                ? "Which schedule did they preview in?"
                                : "Which schedule did they recover in?"}
                            </label>
                            <select
                              value={rec.altScheduleId}
                              onChange={(e) => updateRecord(student.id, { altScheduleId: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 bg-white"
                            >
                              <option value="">Select schedule</option>
                              {otherSchedules.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
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
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <Users size={24} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No students in this schedule yet. Add students first.</p>
        </div>
      )}
    </div>
  );
}