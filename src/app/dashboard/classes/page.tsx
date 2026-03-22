"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Copy, Loader2 } from "lucide-react";
import { ClassForm } from "@/components/class-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  createClass,
  createClassForAllSchedules,
  updateClass,
  deleteClass,
  deleteAllClasses,
  duplicateClassesForAllSchedules,
} from "@/app/actions/classes";

interface ClassData {
  id: string;
  number: number;
  name: string;
  topic: string | null;
  date: string;
  dateFormatted: string;
  isTbd: boolean;
  totalMarked: number;
  presentCount: number;
  totalStudents: number;
  attendancePercent: number | null;
  scheduleId: string;
}

interface ScheduleOption {
  id: string;
  label: string;
}

// Define sagas — maps class numbers to their series name
const SAGAS: Record<number, string> = {
  9: "Los alimentos básicos del cristiano",
  10: "Los alimentos básicos del cristiano",
  11: "Los mandatos de Jesús",
  12: "Los mandatos de Jesús",
  13: "Mi compromiso con Dios",
  14: "Mi compromiso con Dios",
  16: "Los enemigos del cristiano",
  17: "Los enemigos del cristiano",
  18: "Los enemigos del cristiano",
};

// Classes that are the LAST in their saga
const SAGA_ENDS = new Set([10, 12, 15, 18]);

// Returns the saga name only for the first class in a series
function getSagaLabel(classNumber: number): string | null {
  const saga = SAGAS[classNumber];
  if (!saga) return null;

  // Check if the previous class is in the same saga
  const prevSaga = SAGAS[classNumber - 1];
  if (prevSaga === saga) return null;

  return saga;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassData | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  function fetchData(scheduleId?: string) {
    const url = scheduleId ? `/api/classes?scheduleId=${scheduleId}` : "/api/classes";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        if (data.schedules?.length && !schedules.length) {
          setSchedules(data.schedules);
        }
        setLoading(false);
      });
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedSchedule) fetchData(selectedSchedule); }, [selectedSchedule]);

  function handleAdd() { setEditData(null); setFormOpen(true); }

  function handleEdit(c: ClassData) {
    setEditData({ classId: c.id, name: c.name, topic: c.topic || "", date: c.isTbd ? "2099-12-31" : c.date });
    setFormOpen(true);
  }

  function handleDeleteClick(c: ClassData) { setDeleteTarget(c); setDeleteOpen(true); }

  async function handleFormSubmit(data: any) {
    if (data.classId) { await updateClass(data); }
    else if (data.addToAll) { await createClassForAllSchedules(data); }
    else {
      if (!selectedSchedule && schedules.length > 0) { await createClass({ ...data, scheduleId: schedules[0].id }); }
      else { await createClass({ ...data, scheduleId: selectedSchedule }); }
    }
    fetchData(selectedSchedule || undefined);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteClass(deleteTarget.id);
    setDeleteTarget(null);
    fetchData(selectedSchedule || undefined);
  }

  async function handleDeleteAll() {
    await deleteAllClasses(selectedSchedule || undefined);
    fetchData(selectedSchedule || undefined);
  }

  async function handleGenerate21() {
    if (!confirm("Esto creará 21 clases (fechas por definir) para TODOS los horarios. ¿Continuar?")) return;
    setGenerating(true);
    try {
      await duplicateClassesForAllSchedules();
      fetchData(selectedSchedule || undefined);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Classes</h1>
        <div className="bg-muted rounded-lg p-10 text-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Classes</h1>
        <div className="flex items-center gap-2">
          {classes.length > 0 && (
            <button onClick={() => setDeleteAllOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} /> Eliminar todo
            </button>
          )}
          <button onClick={handleGenerate21} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
            {generating ? "Generando..." : "Generate 21 classes"}
          </button>
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
            <Plus size={14} /> Agregar clase
          </button>
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {schedules.map((s, i) => (
            <button key={s.id} onClick={() => setSelectedSchedule(s.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${selectedSchedule === s.id || (!selectedSchedule && i === 0) ? "bg-accent font-medium text-foreground border-border" : "text-muted-foreground border-border hover:border-border hover:text-foreground"}`}>
              {s.label.replace("Wednesday", "Mié").replace("Sunday", "Dom")}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">{classes.length} clases</p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-10">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Topic</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-32">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-36">Attendance</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin clases aún. Agrega tu primera clase o genera las 21 clases estándar.</td></tr>
              ) : (
                classes.map((cls) => {
                  const sagaLabel = getSagaLabel(cls.number);
                  return (
                    <React.Fragment key={cls.id}>
                      {sagaLabel && (
                        <tr className="bg-muted/70">
                          <td colSpan={6} className="px-4 py-1.5">
                            <span className="text-[11px] font-medium text-red-600 uppercase tracking-wide">{sagaLabel}</span>
                          </td>
                        </tr>
                      )}
                      <tr className={`hover:bg-accent transition-colors group ${SAGA_ENDS.has(cls.number) ? "border-b-2 border-border" : "border-b border-border/30"}`}>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{cls.number}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">
                          {cls.name}
                          {SAGAS[cls.number] && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground"></span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{cls.topic || "—"}</td>
                        <td className="px-4 py-2.5 text-sm">
                          {cls.isTbd ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium">TBD</span>
                          ) : (
                            <span className="text-muted-foreground">{cls.dateFormatted}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {cls.attendancePercent !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cls.attendancePercent >= 80 ? "bg-green-500" : cls.attendancePercent >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${cls.attendancePercent}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{cls.attendancePercent}%</span>
                              <span className="text-[10px] text-muted-foreground">({cls.presentCount}/{cls.totalMarked})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin registros</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => handleEdit(cls)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteClick(cls)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border/30">
          {classes.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sin clases aún. Agrega tu primera clase o genera las 21 clases estándar.</div>
          ) : (
            classes.map((cls) => {
              const sagaLabel = getSagaLabel(cls.number);
              return (
                <div key={cls.id}>
                  {sagaLabel && (
                    <div className="px-4 py-1.5 bg-muted/70">
                      <span className="text-[11px] font-medium text-red-600 uppercase tracking-wide">{sagaLabel}</span>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        <span className="text-muted-foreground mr-1.5">{cls.number}.</span>
                        {cls.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(cls)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteClick(cls)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {cls.topic && <p className="text-xs text-muted-foreground mb-1">{cls.topic}</p>}
                    <div className="flex items-center gap-3">
                      {cls.isTbd ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-medium">TBD</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{cls.dateFormatted}</span>
                      )}
                      {cls.attendancePercent !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cls.attendancePercent >= 80 ? "bg-green-500" : cls.attendancePercent >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${cls.attendancePercent}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{cls.attendancePercent}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ClassForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} initialData={editData} />
      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteConfirm}
        title="Eliminar clase" message={`¿Estás seguro de eliminar "${deleteTarget?.topic || deleteTarget?.name}"? Todos los registros de asistencia de esta clase también serán eliminados.`} />
      <DeleteConfirm open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} onConfirm={handleDeleteAll}
        title="Eliminar todas las clases" message={`¿Estás seguro de eliminar todas las ${classes.length} classes${selectedSchedule ? " en este horario" : " en todos los horarios"}? Todos los registros de asistencia también serán eliminados.`} />
    </div>
  );
}