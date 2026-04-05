"use client";

import { useState } from "react";

interface AttendanceRecord {
  id: string;
  status: string;
  absentReason: string | null;
  className: string;
  classDate: string;
  topic: string | null;
}

interface ProfileQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
}

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
  profileNotes: Record<string, string>;
  createdAt: string;
  schedule: string;
  tableName: string;
  facilitator: string;
  attendance: AttendanceRecord[];
}

export default function StudentProfileClient({
  student,
  questions,
}: {
  student: StudentData;
  questions: ProfileQuestion[];
}) {
  const [notes, setNotes] = useState<Record<string, string>>(
    student.profileNotes
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Attendance stats
  const total = student.attendance.length;
  const present = student.attendance.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Save profile notes
  const saveNotes = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/students/${student.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileNotes: notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateNote = (questionId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [questionId]: value }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-base font-medium text-purple-700">
            {student.firstName[0]}
            {student.lastName[0]}
          </div>
          <div>
            <h1 className="text-lg font-medium text-foreground">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-sm text-muted-foreground/70 mt-0.5">
              {student.schedule} · {student.tableName} · {student.facilitator}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-medium text-foreground">{rate}%</p>
          <p className="text-xs text-muted-foreground/70">attendance</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <StatCard label="Present" value={present} color="green" />
        <StatCard label="Absent" value={absent} color="red" />
        <StatCard label="Total classes" value={total} color="gray" />
        <StatCard
          label="Enrolled"
          value={new Date(student.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          color="gray"
        />
      </div>

      {/* ═══ ATTENDANCE GRID ═══ */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">
            Attendance report
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-400" />
              Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
              Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />
              No record
            </span>
          </div>
        </div>

        {student.attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-6">
            No attendance records yet.
          </p>
        ) : (
          <>
            {/* Color grid */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {student.attendance.map((record) => (
                <div key={record.id} className="group relative">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium transition-transform group-hover:scale-110 cursor-default ${
                      record.status === "PRESENT"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {new Date(record.classDate).getDate()}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-foreground/90 text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <p className="font-medium">{record.className}</p>
                    <p className="text-muted-foreground/40">
                      {new Date(record.classDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {record.status === "PRESENT" ? "Present" : "Absent"}
                    </p>
                    {record.absentReason && (
                      <p className="text-muted-foreground/70 mt-0.5">
                        {record.absentReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed table */}
            <details className="group">
              <summary className="text-xs text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors select-none">
                Show detailed list
              </summary>
              <div className="mt-3 max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Class
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...student.attendance].reverse().map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-border/30"
                      >
                        <td className="py-2 text-sm text-foreground">
                          {record.className}
                        </td>
                        <td className="py-2 text-sm text-muted-foreground">
                          {new Date(record.classDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                              record.status === "PRESENT"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {record.status === "PRESENT"
                              ? "Present"
                              : "Absent"}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground/70">
                          {record.absentReason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>

      {/* ═══ PERSONAL INFO ═══ */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <h2 className="text-sm font-medium text-foreground mb-3">
          Personal information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Phone" value={student.phone} />
          <InfoField
            label="Birthdate"
            value={
              student.birthdate
                ? new Date(student.birthdate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null
            }
          />
          <div className="col-span-2">
            <InfoField label="Address" value={student.address} />
          </div>
        </div>
      </div>

      {/* ═══ Preguntas de la Iglesia ═══ */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">
            Preguntas de la Iglesia
          </h2>
          <button
            onClick={saveNotes}
            disabled={saving}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              saved
                ? "bg-green-50 text-green-700"
                : "bg-foreground text-background hover:bg-foreground/90"
            } disabled:opacity-50`}
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save answers"}
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-4">
            No questions configured yet. An admin can add questions in Settings.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {q.question}
                </label>

                {q.type === "select" && q.options ? (
                  <select
                    value={notes[q.id] || ""}
                    onChange={(e) => updateNote(q.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-ring bg-card text-foreground"
                  >
                    <option value="">Select...</option>
                    {(q.options as string[]).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : q.type === "boolean" ? (
                  <div className="flex gap-2">
                    {["Sí", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateNote(q.id, opt)}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                          notes[q.id] === opt
                            ? "bg-foreground/90 text-background border-gray-900"
                            : "border-border text-muted-foreground hover:border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={notes[q.id] || ""}
                    onChange={(e) => updateNote(q.id, e.target.value)}
                    placeholder="Type answer..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-ring placeholder:text-muted-foreground/40"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "green" | "red" | "gray";
}) {
  const styles = {
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-700",
    gray: "bg-muted text-foreground",
  };

  return (
    <div className={`rounded-xl p-3.5 ${styles[color]}`}>
      <p className="text-xs opacity-60 mb-0.5">{label}</p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}