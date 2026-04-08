"use client";

import { useState, useEffect } from "react";
import { Users, DollarSign, TrendingDown, TrendingUp, Maximize2, X } from "lucide-react";
import { t } from "@/lib/translate";
import {
  BarChart, Bar, XAxis, YAxis,
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
  bajasPerSchedule: { schedule: string; bajas: number }[];
  role: string;
}

interface FundData {
  goal: number;
  collected: number;
}

const PIE_COLORS = ["#f87171", "#fb923c", "#a78bfa", "#38bdf8", "#94a3b8"];

// ─── Fullscreen Modal ────────────────────────────────────
function FullscreenChart({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} /> Cerrar
        </button>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [chartVisibility, setChartVisibility] = useState<Record<string, boolean>>({});
  const [fund, setFund] = useState<FundData>({ goal: 0, collected: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/app-settings").then((r) => r.json()),
    ]).then(([statsData, settings]) => {
      if (!statsData.empty) setStats(statsData);

      // Chart visibility defaults
      const defaultVis: Record<string, boolean> = {
        "students-schedule": true,
        "absent-reasons": true,
        "heatmap": true,
        "top-facilitators": true,
        "bottom-facilitators": true,
        "bajas-schedule": true,
      };
      setChartVisibility({ ...defaultVis, ...(settings.chart_visibility || {}) });
      setFund(settings.graduation_fund || { goal: 0, collected: 0 });

      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (stats && stats.role === "FACILITATOR") {
      window.location.href = "/dashboard/students";
    }
  }, [stats]);

  if (loading) return <div className="text-center py-20"><p className="text-sm text-muted-foreground">Cargando panel...</p></div>;
  if (!stats) return <div className="text-center py-20"><p className="text-sm text-muted-foreground">No se encontró un curso activo.</p></div>;

  if (!stats.topFacilitators) stats.topFacilitators = [];
  if (!stats.bottomFacilitators) stats.bottomFacilitators = [];
  if (!stats.heatmapData) stats.heatmapData = [];
  if (!stats.reasonsBreakdown) stats.reasonsBreakdown = [];
  if (!stats.studentsPerSchedule) stats.studentsPerSchedule = [];
  if (!stats.bajasPerSchedule) stats.bajasPerSchedule = [];

  const nonAttendance = stats.overallAttendance !== null ? 100 - stats.overallAttendance : null;
  const isVisible = (key: string) => chartVisibility[key] !== false;

  // Fund display
  const fundPercent = fund.goal > 0 ? Math.min(Math.round((fund.collected / fund.goal) * 100), 100) : 0;
  const fundLabel = fund.goal > 0 ? `$${fund.collected.toLocaleString()}/$${fund.goal.toLocaleString()}` : "--";

  // ── Chart renderers ────────────────────────────────────

  function renderStudentsPerSchedule(height: number) {
    if (!stats!.studentsPerSchedule.some((s) => s.students > 0)) return <EmptyChart />;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={stats!.studentsPerSchedule} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="schedule" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <Bar dataKey="students" fill="#f87171" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="students" position="top" style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function renderBajasPerSchedule(height: number) {
    if (!stats!.bajasPerSchedule.some((s) => s.bajas > 0)) return <EmptyChart message="Sin bajas registradas." />;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={stats!.bajasPerSchedule} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="schedule" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Bar dataKey="bajas" fill="#fb923c" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="bajas" position="top" style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function renderReasons(height: number) {
    if (stats!.reasonsBreakdown.length === 0) return <EmptyChart message="Sin inasistencias registradas." />;
    return (
      <div className="flex items-center gap-4" style={{ height }}>
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={stats!.reasonsBreakdown} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius="80%" strokeWidth={0}>
              {stats!.reasonsBreakdown.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {stats!.reasonsBreakdown.map((r, i) => (
            <div key={r.reason} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-xs text-muted-foreground flex-1">{t(r.reason)}</span>
              <span className="text-xs font-medium text-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderHeatmap() {
    if (stats!.heatmapData.length === 0) return <EmptyChart />;
    const scheduleNames = [...new Set(stats!.heatmapData.map((d) => d.schedule))];
    const classNums = [...new Set(stats!.heatmapData.map((d) => d.classNum))].sort((a, b) => a - b);
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
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
                const cell = stats!.heatmapData.find((d) => d.schedule === sched && d.classNum === cn);
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
      </div>
    );
  }

  function renderTopFacilitators() {
    if (stats!.topFacilitators.length === 0) return <EmptyChart />;
    return (
      <div className="space-y-2.5">
        {stats!.topFacilitators.map((f, i) => (
          <FacilitatorRow key={f.name + f.schedule} rank={i + 1} f={f} color="emerald" />
        ))}
      </div>
    );
  }

  function renderBottomFacilitators() {
    if (stats!.bottomFacilitators.length === 0) return <EmptyChart />;
    return (
      <div className="space-y-2.5">
        {stats!.bottomFacilitators.map((f, i) => (
          <FacilitatorRow key={f.name + f.schedule} rank={i + 1} f={f} color="red" />
        ))}
      </div>
    );
  }

  // ── Fullscreen ─────────────────────────────────────────
  if (fullscreen) {
    const chartMap: Record<string, { title: string; render: () => React.ReactNode }> = {
      "students-schedule":   { title: "Alumnos por horario",              render: () => renderStudentsPerSchedule(500) },
      "bajas-schedule":      { title: "Bajas por horario",                render: () => renderBajasPerSchedule(500) },
      "absent-reasons":      { title: "Razones de inasistencia",          render: () => renderReasons(400) },
      "heatmap":             { title: "Mapa de calor de asistencia",      render: renderHeatmap },
      "top-facilitators":    { title: "Top 5 facilitadores",              render: renderTopFacilitators },
      "bottom-facilitators": { title: "5 facilitadores con menor asistencia", render: renderBottomFacilitators },
    };
    const chart = chartMap[fullscreen];
    if (chart) {
      return (
        <FullscreenChart title={chart.title} onClose={() => setFullscreen(null)}>
          {chart.render()}
        </FullscreenChart>
      );
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">{stats.courseName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.startDate} - {stats.endDate}</p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-green-500/10 text-xs font-medium text-green-600 dark:text-green-400">Activo</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total alumnos" value={stats.totalStudents} />
        <FundStatCard icon={DollarSign} label="Dinero recaudado" value={fundLabel} percent={fundPercent} />
        <StatCard icon={TrendingDown} label="Prom. inasistencia" value={nonAttendance !== null ? `${nonAttendance}%` : "--"} highlight={nonAttendance !== null} highlightColor="red" />
        <StatCard icon={TrendingUp} label="Prom. asistencia" value={stats.overallAttendance !== null ? `${stats.overallAttendance}%` : "--"} highlight={stats.overallAttendance !== null} />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {isVisible("students-schedule") && (
          <ChartCard title="Alumnos por horario" onExpand={() => setFullscreen("students-schedule")}>
            {renderStudentsPerSchedule(220)}
          </ChartCard>
        )}
        {isVisible("bajas-schedule") && (
          <ChartCard title="Bajas por horario" onExpand={() => setFullscreen("bajas-schedule")}>
            {renderBajasPerSchedule(220)}
          </ChartCard>
        )}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {isVisible("absent-reasons") && (
          <ChartCard title="Razones de inasistencia" onExpand={() => setFullscreen("absent-reasons")}>
            {renderReasons(200)}
          </ChartCard>
        )}
        {isVisible("heatmap") && (
          <ChartCard title="Mapa de calor" onExpand={() => setFullscreen("heatmap")}>
            {renderHeatmap()}
          </ChartCard>
        )}
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {isVisible("top-facilitators") && (
          <ChartCard title="Top 5 facilitadores" onExpand={() => setFullscreen("top-facilitators")}>
            {renderTopFacilitators()}
          </ChartCard>
        )}
        {isVisible("bottom-facilitators") && (
          <ChartCard title="5 facilitadores con menor asistencia" onExpand={() => setFullscreen("bottom-facilitators")}>
            {renderBottomFacilitators()}
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────

function StatCard({ icon: Icon, label, value, highlight, highlightColor }: {
  icon: any; label: string; value: number | string; highlight?: boolean; highlightColor?: "green" | "red";
}) {
  const color = highlight
    ? highlightColor === "red" ? "text-red-500" : "text-emerald-500"
    : "text-foreground";
  return (
    <div className="bg-muted rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-medium ${color}`}>{value}</p>
    </div>
  );
}

function FundStatCard({ icon: Icon, label, value, percent }: {
  icon: any; label: string; value: string; percent: number;
}) {
  const barColor = percent >= 100 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="bg-muted rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-medium text-foreground mb-1.5">{value}</p>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ChartCard({ title, onExpand, children }: { title: string; onExpand: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button onClick={onExpand}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Pantalla completa">
          <Maximize2 size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="h-[120px] flex items-center justify-center">
      <p className="text-xs text-muted-foreground">{message || "Sin datos aún. Marca asistencia para ver las gráficas."}</p>
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
        <p className="text-[9px] text-muted-foreground mt-0.5">{f.schedule} · {f.students} alumnos · {f.present}/{f.total}</p>
      </div>
    </div>
  );
}