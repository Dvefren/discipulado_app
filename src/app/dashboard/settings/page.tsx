"use client";

import { useState, useEffect } from "react";
import { DollarSign, BarChart3, Eye, EyeOff } from "lucide-react";

interface ProfileQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  order: number;
  isActive: boolean;
}

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
  const [fundGoal, setFundGoal] = useState<number>(0);
  const [fundCollected, setFundCollected] = useState<number>(0);
  const [savingFund, setSavingFund] = useState(false);
  const [savedFund, setSavedFund] = useState(false);

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
    ]).then(([qData, settings]) => {
      setQuestions(qData.questions || []);

      // Chart visibility defaults (all visible)
      const defaultVis: Record<string, boolean> = {};
      CHART_OPTIONS.forEach((c) => { defaultVis[c.key] = true; });
      setChartVisibility({ ...defaultVis, ...(settings.chart_visibility || {}) });

      // Graduation fund
      const fund = settings.graduation_fund || { goal: 0, collected: 0 };
      setFundGoal(fund.goal || 0);
      setFundCollected(fund.collected || 0);

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
  async function saveFund() {
    setSavingFund(true);
    await fetch("/api/app-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "graduation_fund",
        value: { goal: fundGoal, collected: fundCollected },
      }),
    });
    setSavingFund(false);
    setSavedFund(true);
    setTimeout(() => setSavedFund(false), 2000);
  }

  // ─── Church questions ──────────────────────────────────
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
            <h2 className="text-sm font-medium text-foreground">Graduation Fund</h2>
          </div>
          <button onClick={saveFund} disabled={savingFund}
            className="px-3 py-1.5 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {savingFund ? "Guardando..." : savedFund ? "Guardado ✓" : "Guardar"}
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Goal amount ($)</label>
              <input type="number" value={fundGoal} onChange={(e) => { setFundGoal(Number(e.target.value)); setSavedFund(false); }}
                min={0} step={100} placeholder="5000"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Collected ($)</label>
              <input type="number" value={fundCollected} onChange={(e) => { setFundCollected(Number(e.target.value)); setSavedFund(false); }}
                min={0} step={50} placeholder="0"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <span className="text-xs font-medium text-foreground">
                ${fundCollected.toLocaleString()} / ${fundGoal.toLocaleString()} ({fundPercent}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${fundPercent >= 100 ? "bg-emerald-500" : fundPercent >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${fundPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Chart Visibility ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Dashboard Charts</h2>
          </div>
          <button onClick={saveChartVisibility} disabled={savingCharts}
            className="px-3 py-1.5 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {savingCharts ? "Guardando..." : savedCharts ? "Guardado ✓" : "Guardar"}
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-3">Toggle which charts are visible on the dashboard.</p>
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

      {/* ─── Church Questions ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Church questions</h2>
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