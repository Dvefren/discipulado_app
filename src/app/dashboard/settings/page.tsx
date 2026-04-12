"use client";

import { useState, useEffect } from "react";
import { DollarSign, BarChart3, Eye, EyeOff, Plus, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react";
interface ProfileQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  order: number;
  isActive: boolean;
}

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
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
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

  // New question form
  const [showForm, setShowForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editType, setEditType] = useState("text");
  const [editOptions, setEditOptions] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile-questions").then((r) => r.json()),
      fetch("/api/app-settings").then((r) => r.json()),
      fetch("/api/graduation-fund").then((r) => r.json()),
    ]).then(([qData, settings, fundData]) => {
      setQuestions(qData.questions || []);

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

  const fetchQuestions = async () => {
    const res = await fetch("/api/profile-questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions);
    }
  };

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

  // ─── Preguntas de la Iglesia ──────────────────────────────────
  const handleAdd = async () => {
    if (!newQuestion.trim()) return;
    setSaving(true);
    const options =
      newType === "select" && newOptions.trim()
        ? newOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : null;
    const res = await fetch("/api/profile-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion.trim(), type: newType, options }),
    });
    if (res.ok) {
      setNewQuestion("");
      setNewType("text");
      setNewOptions("");
      setShowForm(false);
      fetchQuestions();
    }
    setSaving(false);
  };

  const startEdit = (q: ProfileQuestion) => {
    setEditingId(q.id);
    setEditQuestion(q.question);
    setEditType(q.type);
    setEditOptions(q.options ? q.options.join(", ") : "");
  };

  const handleEdit = async () => {
    if (!editingId || !editQuestion.trim()) return;
    setSaving(true);
    const options =
      editType === "select" && editOptions.trim()
        ? editOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : null;
    await fetch("/api/profile-questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, question: editQuestion.trim(), type: editType, options }),
    });
    setEditingId(null);
    setSaving(false);
    fetchQuestions();
  };

  const toggleActive = async (q: ProfileQuestion) => {
    await fetch("/api/profile-questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, isActive: !q.isActive }),
    });
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta pregunta? Las respuestas existentes permanecerán en los perfiles pero no se mostrarán.")) return;
    await fetch(`/api/profile-questions?id=${id}`, { method: "DELETE" });
    fetchQuestions();
  };

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
          <p className="text-sm text-muted-foreground/70 mt-0.5">Administra el panel, fondo de graduación y preguntas de la iglesia</p>
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

      {/* ─── Preguntas de la Iglesia ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Preguntas de la Iglesia</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors">
            {showForm ? "Cancel" : "+ Agregar pregunta"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="px-5 py-4 border-b border-border/50 bg-muted/50">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Question text *</label>
                <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. ¿Eres miembro de la iglesia?"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Answer type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring bg-background text-foreground">
                    <option value="text">Free text</option>
                    <option value="select">Dropdown (options)</option>
                    <option value="boolean">Yes / No</option>
                  </select>
                </div>
                {newType === "select" && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Options (comma separated)</label>
                    <input type="text" value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
                      placeholder="Sí, No, En proceso"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <button onClick={handleAdd} disabled={!newQuestion.trim() || saving}
                className="px-4 py-2 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40">
                {saving ? "Agregando..." : "Agregar pregunta"}
              </button>
            </div>
          </div>
        )}

        {/* Questions list */}
        {questions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground/70">No questions yet. Click "+ Agregar pregunta" to create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {questions.map((q, i) => (
              <div key={q.id} className={`px-5 py-3.5 flex items-center gap-4 ${!q.isActive ? "opacity-50" : ""}`}>
                <span className="text-xs text-muted-foreground/40 font-medium w-5 text-center">{i + 1}</span>
                {editingId === q.id ? (
                  <div className="flex-1 space-y-2">
                    <input type="text" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring" />
                    <div className="flex gap-2 items-center">
                      <select value={editType} onChange={(e) => setEditType(e.target.value)}
                        className="px-2 py-1 text-xs border border-border rounded-lg outline-none bg-background text-foreground">
                        <option value="text">Free text</option>
                        <option value="select">Dropdown</option>
                        <option value="boolean">Yes / No</option>
                      </select>
                      {editType === "select" && (
                        <input type="text" value={editOptions} onChange={(e) => setEditOptions(e.target.value)}
                          placeholder="Sí, No, En proceso"
                          className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
                      )}
                      <button onClick={handleEdit} disabled={saving}
                        className="px-2.5 py-1 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-muted-foreground/70 hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{q.question}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground/70">
                        {q.type === "text" ? "Texto libre" : q.type === "select" ? `Desplegable: ${(q.options || []).join(", ")}` : "Sí / No"}
                      </span>
                      {!q.isActive && <span className="text-xs text-amber-500 font-medium">Inactivo</span>}
                    </div>
                  </div>
                )}
                {editingId !== q.id && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(q)}
                      className="p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button onClick={() => toggleActive(q)}
                      className={`p-1.5 rounded-lg transition-colors ${q.isActive ? "text-green-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-muted-foreground/40 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                      title={q.isActive ? "Deactivate" : "Activate"}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        {q.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        )}
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(q.id)}
                      className="p-1.5 text-muted-foreground/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}