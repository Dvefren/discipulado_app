"use client";

import { useState, useEffect } from "react";
import { DollarSign, BarChart3, Eye, EyeOff, Plus, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react";
interface FundEntry {
  id: string;
  amount: number;
  date: string;
}

const fmtMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtDate = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

const CHART_OPTIONS: { key: string; label: string }[] = [
  { key: "attendance-trend", label: "Tendencia de asistencia" },
  { key: "students-schedule", label: "Alumnos por horario" },
  { key: "attendance-schedule", label: "Asistencia por horario" },
  { key: "absent-reasons", label: "Razones de inasistencia" },
  { key: "heatmap", label: "Mapa de calor" },
  { key: "top-facilitators", label: "Top 5 facilitadores" },
  { key: "bottom-facilitators", label: "5 facilitadores con menor asistencia" },
  { key: "recent-classes", label: "Clases recientes" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // Chart visibility
  const [chartVisibility, setChartVisibility] = useState<Record<string, boolean>>({});
  const [savingCharts, setSavingCharts] = useState(false);
  const [savedCharts, setSavedCharts] = useState(false);

  // Graduation fund
  // Graduation fund
  const [fundGoal, setFundGoal] = useState<number>(0);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savedGoal, setSavedGoal] = useState(false);
  const [entries, setEntries] = useState<FundEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/app-settings").then((r) => r.json()),
      fetch("/api/graduation-fund").then((r) => r.json()),
    ]).then(([settings, fundData]) => {
      // Chart visibility defaults (all visible)
      const defaultVis: Record<string, boolean> = {};
      CHART_OPTIONS.forEach((c) => { defaultVis[c.key] = true; });
      setChartVisibility({ ...defaultVis, ...(settings.chart_visibility || {}) });

      // Graduation fund — goal still in app settings, entries in their own table
      const fund = settings.graduation_fund || { goal: 0 };
      setFundGoal(fund.goal || 0);
      setEntries(fundData.entries || []);
      setLoadingEntries(false);

      setLoading(false);
    });
  }, []);

  // ─── Chart visibility ──────────────────────────────────
  function toggleChart(key: string) {
    setChartVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedCharts(false);
  }

  async function saveChartVisibility() {
    setSavingCharts(true);
    await fetch("/api/app-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "chart_visibility", value: chartVisibility }),
    });
    setSavingCharts(false);
    setSavedCharts(true);
    setTimeout(() => setSavedCharts(false), 2000);
  }

  // ─── Graduation fund ──────────────────────────────────
  // ─── Graduation fund ──────────────────────────────────
  async function saveGoal() {
    setSavingGoal(true);
    await fetch("/api/app-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "graduation_fund",
        value: { goal: fundGoal },
      }),
    });
    setSavingGoal(false);
    setSavedGoal(true);
    setTimeout(() => setSavedGoal(false), 2000);
  }

  async function addEntry() {
    if (!newAmount || !newDate) return;
    setAdding(true);
    try {
      const res = await fetch("/api/graduation-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(newAmount), date: newDate }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [
          { id: entry.id, amount: entry.amount, date: entry.date },
          ...prev,
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setNewAmount("");
        setNewDate(new Date().toISOString().split("T")[0]);
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("¿Eliminar esta ofrenda?")) return;
    setDeletingId(id);
    const res = await fetch("/api/graduation-fund", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  // Group entries by month for the summary cards
  const fundCollected = entries.reduce((sum, e) => sum + e.amount, 0);

  const monthlyTotals = entries.reduce<Record<string, number>>((acc, e) => {
    const key = fmtMonth.format(new Date(e.date));
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {});
  const monthlyCards = Object.entries(monthlyTotals).slice(0, 6);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground/70">Loading settings...</p>
      </div>
    );
  }

  const fundPercent = fundGoal > 0 ? Math.min(Math.round((fundCollected / fundGoal) * 100), 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">Ajustes</h1>
          <p className="text-sm text-muted-foreground/70 mt-0.5">Administra el panel y fondo de graduación</p>
        </div>
      </div>

      {/* ─── Graduation Fund ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Fondos para Graduacion</h2>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Goal + total + progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Meta ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fundGoal}
                  onChange={(e) => { setFundGoal(Number(e.target.value)); setSavedGoal(false); }}
                  min={0}
                  step={100}
                  placeholder="10000"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={saveGoal}
                  disabled={savingGoal}
                  className="px-3 py-2 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  {savingGoal ? "..." : savedGoal ? "✓" : "Guardar"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total recolectado</label>
              <div className="px-3 py-2 text-sm border border-border rounded-lg bg-muted/40 text-foreground font-medium">
                {fmtMoney.format(fundCollected)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <span className="text-xs font-medium text-foreground">
                {fmtMoney.format(fundCollected)} / {fmtMoney.format(fundGoal)} ({fundGoal > 0 ? Math.min(Math.round((fundCollected / fundGoal) * 100), 100) : 0}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${fundCollected >= fundGoal && fundGoal > 0 ? "bg-emerald-500" : fundCollected >= fundGoal / 2 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${fundGoal > 0 ? Math.min((fundCollected / fundGoal) * 100, 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Monthly summary cards */}
          {monthlyCards.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resumen por mes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {monthlyCards.map(([month, total]) => (
                  <div key={month} className="bg-muted/40 border border-border rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground capitalize truncate">{month}</p>
                    <p className="text-sm font-semibold text-foreground">{fmtMoney.format(total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add entry form */}
          <div className="border-t border-border/50 pt-4 mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Registrar ofrenda</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Cantidad ($)"
                min={0}
                step={50}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={addEntry}
                disabled={!newAmount || !newDate || adding}
                className="px-4 py-2 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
              >
                {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Agregar
              </button>
            </div>
          </div>

          {/* Entries list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Historial ({entries.length})
            </p>
            {loadingEntries ? (
              <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-muted-foreground mx-auto" /></div>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin ofrendas registradas aún.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {entries.map((entry) => (
                  <div key={entry.id} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon size={12} className="text-muted-foreground" />
                      <span className="text-xs text-foreground">{fmtDate.format(new Date(entry.date))}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground tabular-nums">{fmtMoney.format(entry.amount)}</span>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        {deletingId === entry.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Chart Visibility ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Graficas de Dashboard</h2>
          </div>
          <button onClick={saveChartVisibility} disabled={savingCharts}
            className="px-3 py-1.5 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {savingCharts ? "Guardando..." : savedCharts ? "Guardado ✓" : "Guardar"}
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-3">Selecciona las graficas que seran visibles en el Dashboard</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHART_OPTIONS.map((chart) => {
              const visible = chartVisibility[chart.key] !== false;
              return (
                <button key={chart.key} onClick={() => toggleChart(chart.key)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors text-left ${visible ? "border-border bg-card hover:bg-muted/50" : "border-border/50 bg-muted/30 opacity-60 hover:opacity-80"}`}>
                  {visible ? (
                    <Eye size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <EyeOff size={14} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm text-foreground">{chart.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}