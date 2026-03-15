"use client";

import { useState, useEffect } from "react";
import { Users, UserCircle, Calendar, TrendingUp } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Stats {
  courseName: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  totalFacilitators: number;
  scheduleCount: number;
  overallAttendance: number | null;
  attendanceTrend: { className: string; date: string; present: number; total: number; percent: number }[];
  studentsPerSchedule: { schedule: string; students: number }[];
  topFacilitators: { name: string; schedule: string; students: number; percent: number }[];
  recentClasses: { name: string; date: string; schedule: string; present: number; total: number }[];
  role: string;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => { if (!data.empty) setStats(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">No active course found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">{stats.courseName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.startDate} - {stats.endDate}</p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-green-50 text-xs font-medium text-green-700">Active</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total students" value={stats.totalStudents} />
        <StatCard icon={UserCircle} label="Facilitators" value={stats.totalFacilitators} />
        <StatCard icon={Calendar} label="Schedules" value={stats.scheduleCount} />
        <StatCard
          icon={TrendingUp}
          label="Avg. attendance"
          value={stats.overallAttendance !== null ? `${stats.overallAttendance}%` : "--"}
          highlight={stats.overallAttendance !== null}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Attendance Trend */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Attendance trend</h3>
          {stats.attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  formatter={(value) => [`${value}%`, "Attendance"]}
                  labelFormatter={(label) => label}
                />
                <Line type="monotone" dataKey="percent" stroke="#f87171" strokeWidth={2} dot={{ fill: "#f87171", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No attendance data yet. Mark attendance to see trends.</p>
            </div>
          )}
        </div>

        {/* Students per Schedule */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Students per schedule</h3>
          {stats.studentsPerSchedule.some((s) => s.students > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.studentsPerSchedule} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="schedule" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  formatter={(value) => [value, "Students"]}
                />
                <Bar dataKey="students" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No students enrolled yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Facilitators */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Top facilitators by attendance</h3>
          {stats.topFacilitators.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topFacilitators.map((f, i) => (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                      <span className="text-xs font-medium text-green-600">{f.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/100 rounded-full transition-all" style={{ width: `${f.percent}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{f.schedule} · {f.students} students</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">No attendance data yet.</p>
          )}
        </div>

        {/* Recent Classes */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent classes</h3>
          {stats.recentClasses.length > 0 ? (
            <div className="space-y-2">
              {stats.recentClasses.map((cls, i) => {
                const percent = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                return (
                  <div key={`${cls.name}-${cls.schedule}-${i}`} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{cls.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cls.date} · {cls.schedule}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[40px] text-right">{cls.present}/{cls.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">No recent attendance data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="bg-muted rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-medium ${highlight ? "text-green-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}