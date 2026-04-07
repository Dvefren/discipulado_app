"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { FacilitatorForm } from "@/components/facilitator-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  createFacilitator,
  updateFacilitator,
  deleteFacilitator,
} from "@/app/actions/facilitators";

interface FacilitatorData {
  id: string;
  name: string;
  birthday: string | null;
  tableId: string;
  tableName: string;
  studentCount: number;
  scheduleId: string;
  scheduleLabel: string;
}
interface ScheduleGroup {
  id: string;
  label: string;
  facilitators: FacilitatorData[];
}

const avatarColors: Record<string, { bg: string; text: string }> = {
  "Wednesday 7:00 PM": { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-600 dark:text-sky-400" },
  "Sunday 9:00 AM": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  "Sunday 11:00 AM": { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  "Sunday 1:00 PM": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function FacilitatorsPage() {
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [schedules, setSchedules] = useState<{ id: string; label: string }[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FacilitatorData | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  function fetchData() {
    fetch("/api/facilitators")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.groups || []);
        setSchedules(data.schedules || []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchData(); }, []);

  const filterOptions = [
    { key: "all", label: "Todos los horarios" },
    ...groups.map((g) => ({
      key: g.label,
      label: g.label.replace("Wednesday", "Mié").replace("Sunday", "Dom"),
    })),
  ];
  const filtered = filter === "all" ? groups : groups.filter((g) => g.label === filter);

  function handleAdd() { setEditData(null); setFormOpen(true); }
  function handleEdit(f: FacilitatorData) {
    setEditData({ facilitatorId: f.id, tableId: f.tableId, name: f.name, birthday: f.birthday || "", scheduleId: f.scheduleId, tableName: f.tableName });
    setFormOpen(true);
  }
  function handleDeleteClick(f: FacilitatorData) { setDeleteTarget(f); setDeleteOpen(true); }

  async function handleFormSubmit(data: any) {
    if (data.facilitatorId) { await updateFacilitator(data); } else { await createFacilitator(data); }
    fetchData();
  }
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteFacilitator(deleteTarget.id, deleteTarget.tableId);
    setDeleteTarget(null);
    fetchData();
  }

  async function handleExport(f: FacilitatorData) {
    setExportingId(f.id);
    try {
      const res = await fetch(`/api/facilitators/${f.id}/export`);
      if (!res.ok) {
        alert("Error al exportar la asistencia.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = f.name.replace(/[^a-zA-Z0-9]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      a.download = `asistencia_${safeName}_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Facilitadores</h1>
        <div className="bg-muted rounded-lg p-10 text-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Facilitadores</h1>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <Plus size={14} /> Agregar facilitador
        </button>
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {filterOptions.map((opt) => (
          <button key={opt.key} onClick={() => setFilter(opt.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${filter === opt.key ? "bg-accent font-medium text-foreground border-border" : "text-muted-foreground border-border hover:border-border hover:text-foreground"}`}>
            {opt.label}
          </button>
        ))}
      </div>
      {filtered.map((group) => {
        const colors = avatarColors[group.label] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" };
        return (
          <div key={group.label} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-foreground">{group.label}</h2>
              <span className="text-xs text-muted-foreground">{group.facilitators.length} facilitadores</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {group.facilitators.map((f) => (
                <div key={f.id} className="bg-card border border-border rounded-xl p-3.5 hover:border-border transition-colors group">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center font-medium text-xs ${colors.text} shrink-0`}>
                      {getInitials(f.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.tableName}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleExport(f)}
                        disabled={exportingId === f.id}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                        title="Exportar asistencia (Excel)"
                      >
                        {exportingId === f.id ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>
                      <button onClick={() => handleEdit(f)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Editar"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteClick(f)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{f.studentCount} alumnos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <FacilitatorForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} schedules={schedules} initialData={editData} />
      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteConfirm}
        title="Eliminar facilitador" message={`¿Estás seguro de eliminar a ${deleteTarget?.name}? Esta acción no se puede deshacer.`} />
    </div>
  );
}