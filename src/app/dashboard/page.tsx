"use client";

import { useState, useEffect } from "react";
import { Users, UserCircle, Calendar, TrendingUp } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  LabelList,
} from "recharts";

interface Stats {
  courseName: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  totalFacilitators: number;
  scheduleCount: number;
  overallAttendance: number | null;
  attendanceTrend: { className: string; label: string; classNum: number; present: number; total: number; percent: number }[];
  studentsPerSchedule: { schedule: string; students: number }[];
  attendanceBySchedule: { schedule: string; percent: number; present: number; total: number }[];
  reasonsBreakdown: { reason: string; count: number }[];
  topFacilitators: { name: string; schedule: string; students: number; percent: number; present: number; total: number }[];
  bottomFacilitators: { name: string; schedule: string; students: number; percent: number; present: number; total: number }[];
  heatmapData: { schedule: string; classNum: number; className: string; percent: number; present: number; total: number }[];
  recentClasses: { name: string; schedules: { schedule: string; date: string; present: number; total: number; percent: number }[] }[];
  role: string;
}

const PIE_COLORS = ["#f87171", "#fb923c", "#a78bfa", "#38bdf8", "#94a3b8"];

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => { if (!data.empty) setStats(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (stats && stats.role === "FACILITATOR") {
      window.location.href = "/dashboard/students";
    }
  }, [stats]);

  if (loading) return <div className="text-center py-20"><p className="text-sm text-muted-foreground">Loading dashboard...</p></div>;
  if (!stats) return <div className="text-center py-20"><p className="text-sm text-muted-foreground">No active course found.</p></div>;

  if (!stats.topFacilitators) stats.topFacilitators = [];
  if (!stats.bottomFacilitators) stats.bottomFacilitators = [];
  if (!stats.heatmapData) stats.heatmapData = [];
  if (!stats.recentClasses) stats.recentClasses = [];
  if (!stats.attendanceBySchedule) stats.attendanceBySchedule = [];
  if (!stats.reasonsBreakdown) stats.reasonsBreakdown = [];
  if (!stats.attendanceTrend) stats.attendanceTrend = [];
  if (!stats.studentsPerSchedule) stats.studentsPerSchedule = [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">{stats.courseName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.startDate} - {stats.endDate}</p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-green-500/10 text-xs font-medium text-green-600 dark:text-green-400">Active</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total students" value={stats.totalStudents} />
        <StatCard icon={UserCircle} label="Facilitators" value={stats.totalFacilitators} />
        <StatCard icon={Calendar} label="Schedules" value={stats.scheduleCount} />
        <StatCard icon={TrendingUp} label="Avg. attendance" value={stats.overallAttendance !== null ? `${stats.overallAttendance}%` : "--"} highlight={stats.overallAttendance !== null} />
      </div>

      {/* Row 1: Attendance Trend + Students per Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Attendance trend">
          {stats.attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="percent" stroke="#f87171" strokeWidth={2} dot={{ fill: "#f87171", r: 3 }}>
                  <LabelList dataKey="percent" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Students per schedule">
          {stats.studentsPerSchedule.some((s) => s.students > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.studentsPerSchedule} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="schedule" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Bar dataKey="students" fill="#f87171" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="students" position="top" style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 2: Attendance by Schedule + Absent Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Attendance by schedule">
          {stats.attendanceBySchedule.some((s) => s.total > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.attendanceBySchedule} barSize={40} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="schedule" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={80} />
                <Bar dataKey="percent" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="percent" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Absent reasons">
          {stats.reasonsBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={stats.reasonsBreakdown} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                    {stats.reasonsBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {stats.reasonsBreakdown.map((r, i) => (
                  <div key={r.reason} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground flex-1">{r.reason}</span>
                    <span className="text-xs font-medium text-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart message="No absences recorded yet." />}
        </ChartCard>
      </div>

      {/* Row 3: Heatmap (full width) */}
      <div className="mb-4">
        <ChartCard title="Attendance heatmap">
          {stats.heatmapData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {(() => {
                  const scheduleNames = [...new Set(stats.heatmapData.map((d) => d.schedule))];
                  const classNums = [...new Set(stats.heatmapData.map((d) => d.classNum))].sort((a, b) => a - b);
                  return (
                    <div>
                      <div className="flex gap-1 mb-1">
                        <div className="w-20 shrink-0" />
                        {classNums.map((cn) => (
                          <div key={cn} className="flex-1 text-center text-[9px] text-muted-foreground">C{cn}</div>
                        ))}
                      </div>
                      {scheduleNames.map((sched) => (
                        <div key={sched} className="flex gap-1 mb-1">
                          <div className="w-20 shrink-0 text-[10px] text-muted-foreground truncate flex items-center">{sched}</div>
                          {classNums.map((cn) => {
                            const cell = stats.heatmapData.find((d) => d.schedule === sched && d.classNum === cn);
                            const percent = cell?.percent || 0;
                            const bg = !cell ? "bg-gray-100 dark:bg-gray-800" :
                              percent >= 90 ? "bg-emerald-400" :
                              percent >= 75 ? "bg-emerald-300 dark:bg-emerald-500" :
                              percent >= 50 ? "bg-amber-300 dark:bg-amber-500" :
                              percent >= 25 ? "bg-orange-300 dark:bg-orange-500" : "bg-red-300 dark:bg-red-500";
                            return (
                              <div key={cn} className={`flex-1 h-9 rounded ${bg} flex items-center justify-center`}>
                                {cell && <span className="text-[9px] font-medium text-white drop-shadow-sm">{percent}%</span>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-3 justify-center">
                        <span className="text-[9px] text-muted-foreground">Low</span>
                        <div className="w-4 h-3 rounded bg-red-300" />
                        <div className="w-4 h-3 rounded bg-orange-300" />
                        <div className="w-4 h-3 rounded bg-amber-300" />
                        <div className="w-4 h-3 rounded bg-emerald-300" />
                        <div className="w-4 h-3 rounded bg-emerald-400" />
                        <span className="text-[9px] text-muted-foreground">High</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 4: Top 5 + Bottom 5 Facilitators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Top 5 facilitators">
          {stats.topFacilitators.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topFacilitators.map((f, i) => (
                <FacilitatorRow key={f.name + f.schedule} rank={i + 1} f={f} color="emerald" />
              ))}
            </div>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Bottom 5 facilitators">
          {stats.bottomFacilitators.length > 0 ? (
            <div className="space-y-2.5">
              {stats.bottomFacilitators.map((f, i) => (
                <FacilitatorRow key={f.name + f.schedule} rank={i + 1} f={f} color="red" />
              ))}
            </div>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 5: Recent Classes (grouped) */}
      <div className="mb-4">
        <ChartCard title="Recent classes">
          {stats.recentClasses.length > 0 ? (
            <div className="space-y-4">
              {stats.recentClasses.map((cls) => (
                <div key={cls.name}>
                  <p className="text-xs font-medium text-foreground mb-2">{cls.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {cls.schedules.map((s) => (
                      <div key={s.schedule} className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground">{s.schedule}</span>
                          <span className="text-[10px] text-muted-foreground">{s.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.percent >= 80 ? "bg-emerald-400" : s.percent >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${s.percent}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{s.percent}%</span>
                          <span className="text-[9px] text-muted-foreground">({s.present}/{s.total})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </ChartCard>
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
      <p className={`text-xl font-medium ${highlight ? "text-emerald-500" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="h-[120px] flex items-center justify-center">
      <p className="text-xs text-muted-foreground">{message || "No data yet. Mark attendance to see charts."}</p>
    </div>
  );
}

function FacilitatorRow({ rank, f, color }: { rank: number; f: any; color: "emerald" | "red" }) {
  const barColor = color === "emerald" ? "bg-emerald-400" : "bg-red-400";
  const textColor = color === "emerald" ? "text-emerald-500" : "text-red-400";
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] text-muted-foreground w-4 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-foreground truncate">{f.name}</p>
          <span className={`text-xs font-medium ${textColor}`}>{f.percent}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${f.percent}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5">{f.schedule} · {f.students} students · {f.present}/{f.total}</p>
      </div>
    </div>
  );
}