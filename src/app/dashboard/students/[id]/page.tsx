"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, MapPin, Cake, Users, BookOpen, Check, X, Eye, RotateCcw, Save } from "lucide-react";
import { updateProfileNotes } from "@/app/actions/profile-notes";

interface AttendanceRecord {
  classId: string;
  className: string;
  date: string;
  status: string | null;
  absentReason: string | null;
  absentNote: string | null;
  altScheduleLabel: string | null;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  birthdateFormatted: string | null;
  phone: string | null;
  address: string | null;
  profileNotes: any;
  tableName: string;
  facilitatorName: string;
  scheduleLabel: string;
  attendanceHistory: AttendanceRecord[];
  stats: {
    totalClasses: number;
    markedClasses: number;
    presentClasses: number;
    absentClasses: number;
    previewedClasses: number;
    recoveredClasses: number;
    attendancePercent: number | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PRESENT: { label: "Present", color: "text-green-700", bg: "bg-green-100", icon: Check },
  ABSENT: { label: "Absent", color: "text-red-700", bg: "bg-red-100", icon: X },
  PREVIEWED: { label: "Previewed", color: "text-blue-700", bg: "bg-blue-100", icon: Eye },
  RECOVERED: { label: "Recovered", color: "text-amber-700", bg: "bg-amber-100", icon: RotateCcw },
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Church questions state
  const [baptized, setBaptized] = useState(false);
  const [memberSince, setMemberSince] = useState("");
  const [salvationDate, setSalvationDate] = useState("");
  const [previousChurch, setPreviousChurch] = useState("");
  const [smallGroup, setSmallGroup] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  useEffect(() => {
    fetch(`/api/students/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) { router.push("/dashboard/students"); return; }
        setStudent(data);
        const notes = data.profileNotes || {};
        setBaptized(notes.baptized || false);
        setMemberSince(notes.memberSince || "");
        setSalvationDate(notes.salvationDate || "");
        setPreviousChurch(notes.previousChurch || "");
        setSmallGroup(notes.smallGroup || "");
        setCustomNotes(notes.customNotes || "");
        setLoading(false);
      });
  }, [params.id, router]);

  async function handleSaveNotes() {
    if (!student) return;
    setSaving(true);
    try {
      await updateProfileNotes(student.id, {
        baptized, memberSince, salvationDate, previousChurch, smallGroup, customNotes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (!student) return null;

  const s = student.stats;
  const percent = s.attendancePercent;

  return (
    <div>
      {/* Back button */}
      <button onClick={() => router.push("/dashboard/students")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-5">
        <ArrowLeft size={14} /> Back to students
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-lg font-medium">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h1 className="text-xl font-medium text-gray-900">{student.firstName} {student.lastName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{student.tableName} · {student.facilitatorName} · {student.scheduleLabel}</p>
          </div>
        </div>
        {percent !== null && (
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${percent >= 80 ? "bg-green-50 text-green-700" : percent >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
            {percent}% attendance
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column — Info + Church Questions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Contact info</h3>
            <div className="space-y-2.5">
              {student.birthdateFormatted && (
                <div className="flex items-center gap-2.5">
                  <Cake size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{student.birthdateFormatted}</span>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{student.phone}</span>
                </div>
              )}
              {student.address && (
                <div className="flex items-center gap-2.5">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{student.address}</span>
                </div>
              )}
              {!student.birthdateFormatted && !student.phone && !student.address && (
                <p className="text-xs text-gray-400">No contact info added yet.</p>
              )}
            </div>
          </div>

          {/* Church Questions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Church profile</h3>
              <button onClick={handleSaveNotes} disabled={saving} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : saved ? (<><Check size={11} /> Saved</>) : (<><Save size={11} /> Save</>)}
              </button>
            </div>

            <div className="space-y-3">
              {/* Baptized */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={baptized} onChange={(e) => setBaptized(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-sm text-gray-700">Baptized</span>
              </label>

              {/* Salvation Date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Salvation date</label>
                <input type="date" value={salvationDate} onChange={(e) => setSalvationDate(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700" />
              </div>

              {/* Member Since */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Member since</label>
                <input type="text" value={memberSince} onChange={(e) => setMemberSince(e.target.value)} placeholder="e.g. January 2024" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
              </div>

              {/* Previous Church */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Previous church experience</label>
                <input type="text" value={previousChurch} onChange={(e) => setPreviousChurch(e.target.value)} placeholder="e.g. First Baptist, 3 years" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
              </div>

              {/* Small Group */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Small group / ministry</label>
                <input type="text" value={smallGroup} onChange={(e) => setSmallGroup(e.target.value)} placeholder="e.g. Youth Ministry" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
              </div>

              {/* Custom Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} placeholder="Any additional notes about this student..." rows={3} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Attendance */}
        <div className="lg:col-span-2">
          {/* Attendance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-lg font-medium text-green-700">{s.presentClasses}</p>
              <p className="text-[10px] text-green-600">Present</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-lg font-medium text-red-700">{s.absentClasses}</p>
              <p className="text-[10px] text-red-600">Absent</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-lg font-medium text-blue-700">{s.previewedClasses}</p>
              <p className="text-[10px] text-blue-600">Previewed</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-lg font-medium text-amber-700">{s.recoveredClasses}</p>
              <p className="text-[10px] text-amber-600">Recovered</p>
            </div>
          </div>

          {/* Attendance History */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Attendance history</h3>
              <p className="text-xs text-gray-400 mt-0.5">{s.markedClasses} of {s.totalClasses} classes recorded</p>
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Class</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-28">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {student.attendanceHistory.map((record) => {
                    const config = record.status ? STATUS_CONFIG[record.status] : null;
                    const Icon = config?.icon;
                    return (
                      <tr key={record.classId} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{record.className}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{record.date}</td>
                        <td className="px-4 py-2">
                          {config ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.color}`}>
                              {Icon && <Icon size={10} />} {config.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Not marked</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {record.absentReason && <span className="capitalize">{record.absentReason.toLowerCase()}</span>}
                          {record.absentNote && <span> — {record.absentNote}</span>}
                          {record.altScheduleLabel && <span>in {record.altScheduleLabel}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {student.attendanceHistory.map((record) => {
                const config = record.status ? STATUS_CONFIG[record.status] : null;
                return (
                  <div key={record.classId} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm text-gray-900 truncate flex-1">{record.className}</p>
                      {config ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ml-2 ${config.bg} ${config.color}`}>{config.label}</span>
                      ) : (
                        <span className="text-[10px] text-gray-300 shrink-0 ml-2">Not marked</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{record.date}
                      {record.absentReason && ` · ${record.absentReason.toLowerCase()}`}
                      {record.altScheduleLabel && ` · ${record.altScheduleLabel}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}