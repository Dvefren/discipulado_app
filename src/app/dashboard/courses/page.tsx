"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, Users, BookOpen, UserCircle, Calendar, X, Loader2 } from "lucide-react";
import { CourseForm } from "@/components/course-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import { createCourse, updateCourse, setActiveCourse, deleteCourse, getCarryOverCandidates, carryOverFacilitators } from "@/app/actions/courses";
import { t } from "@/lib/translate";

interface CourseData {
  id: string; name: string; year: number; semester: number;
  startDate: string; endDate: string; startFormatted: string; endFormatted: string;
  isActive: boolean; scheduleCount: number; totalStudents: number; totalFacilitators: number; totalClasses: number;
}

interface CarryOverCandidate {
  id: string;
  name: string;
  lastTableName: string;
  lastScheduleLabel: string;
}

interface NewCourseSchedule {
  id: string;
  label: string;
}

// ─── Carry-over modal ──────────────────────────────────
function CarryOverModal({
  schedules,
  onClose,
  onComplete,
}: {
  schedules: NewCourseSchedule[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [candidates, setCandidates] = useState<CarryOverCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const [tableNames, setTableNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCarryOverCandidates().then((data) => {
      setCandidates(data);
      // Pre-fill table names with their last table name and try to auto-match the schedule
      const initialTableNames: Record<string, string> = {};
      const initialAssignments: Record<string, string> = {};
      for (const c of data) {
        initialTableNames[c.id] = c.lastTableName;
        // Try to find a matching schedule by label
        const matchingSchedule = schedules.find((s) => s.label === c.lastScheduleLabel);
        if (matchingSchedule) initialAssignments[c.id] = matchingSchedule.id;
      }
      setTableNames(initialTableNames);
      setScheduleAssignments(initialAssignments);
      setLoading(false);
    });
  }, [schedules]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  }

  async function handleConfirm() {
    const selections = Array.from(selected)
      .map((id) => ({
        facilitatorId: id,
        tableName: tableNames[id] || "Mesa",
        targetScheduleId: scheduleAssignments[id] || "",
      }))
      .filter((s) => s.targetScheduleId);

    if (selections.length === 0) {
      alert("Selecciona al menos un facilitador y asigna un horario.");
      return;
    }

    setSaving(true);
    try {
      await carryOverFacilitators({ selections });
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-3 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-sm font-semibold">Copiar facilitadores del curso anterior</h2>
            <p className="text-xs text-muted-foreground mt-1">Selecciona los facilitadores que quieres reutilizar en el nuevo curso.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center"><Loader2 size={20} className="animate-spin text-muted-foreground mx-auto" /></div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay facilitadores de cursos anteriores.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={toggleAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {selected.size === candidates.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
                <span className="text-xs text-muted-foreground">{selected.size} de {candidates.length} seleccionados</span>
              </div>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div key={c.id} className={`border rounded-lg p-3 transition-colors ${selected.has(c.id) ? "border-primary bg-muted/40" : "border-border"}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">Antes: {c.lastTableName} · {t(c.lastScheduleLabel)}</p>
                        {selected.has(c.id) && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Nuevo horario</label>
                              <select
                                value={scheduleAssignments[c.id] || ""}
                                onChange={(e) => setScheduleAssignments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                className="w-full px-2 py-1 rounded text-xs border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="">Seleccionar...</option>
                                {schedules.map((s) => (
                                  <option key={s.id} value={s.id}>{t(s.label)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Nombre de mesa</label>
                              <input
                                type="text"
                                value={tableNames[c.id] || ""}
                                onChange={(e) => setTableNames((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                className="w-full px-2 py-1 rounded text-xs border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-3 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
            Saltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || saving}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Copiando..." : `Copiar ${selected.size} facilitador${selected.size !== 1 ? "es" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseData | null>(null);
  const [carryOverSchedules, setCarryOverSchedules] = useState<NewCourseSchedule[] | null>(null);

  function fetchData() {
    fetch("/api/courses").then((res) => res.json()).then((data) => { setCourses(data || []); setLoading(false); });
  }
  useEffect(() => { fetchData(); }, []);

  function handleAdd() { setEditData(null); setFormOpen(true); }
  function handleEdit(c: CourseData) {
    setEditData({ courseId: c.id, name: c.name, year: c.year, semester: c.semester, startDate: c.startDate, endDate: c.endDate });
    setFormOpen(true);
  }
  function handleDeleteClick(c: CourseData) { setDeleteTarget(c); setDeleteOpen(true); }

  async function handleFormSubmit(data: any) {
    if (data.courseId) {
      await updateCourse(data);
      fetchData();
    } else {
      const result = await createCourse(data);
      fetchData();
      // After creating, open the carry-over modal with the new course's schedules
      if (result?.schedules) {
        setCarryOverSchedules(result.schedules);
      }
    }
  }

  async function handleSetActive(courseId: string) { await setActiveCourse(courseId); fetchData(); }
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteCourse(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-foreground mb-5">Cursos</h1>
        <div className="bg-muted rounded-lg p-10 text-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Cursos</h1>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <Plus size={14} /> Nuevo curso
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-muted rounded-lg p-10 text-center">
          <p className="text-sm text-muted-foreground">No hay cursos aún. Crea tu primer curso para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className={`bg-card border rounded-xl p-5 transition-colors ${course.isActive ? "border-border" : "border-border hover:border-border"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-medium text-foreground">{course.name}</h2>
                    {course.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[11px] font-medium">Activo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Semestre {course.semester} · {course.startFormatted} — {course.endFormatted}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!course.isActive && (
                    <button onClick={() => handleSetActive(course.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors" title="Activar">
                      <Check size={12} /> Activar
                    </button>
                  )}
                  <button onClick={() => handleEdit(course)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Editar"><Pencil size={13} /></button>
                  {!course.isActive && (
                    <button onClick={() => handleDeleteClick(course)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Calendar size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horarios</p>
                    <p className="text-sm font-medium text-foreground">{course.scheduleCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <BookOpen size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Clases</p>
                    <p className="text-sm font-medium text-foreground">{course.totalClasses}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <UserCircle size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Facilitadores</p>
                    <p className="text-sm font-medium text-foreground">{course.totalFacilitators}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Users size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Alumnos</p>
                    <p className="text-sm font-medium text-foreground">{course.totalStudents}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CourseForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} initialData={editData} />
      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteConfirm}
        title="Eliminar curso" message={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Todos los horarios, clases y registros de asistencia serán eliminados.`} />

      {carryOverSchedules && (
        <CarryOverModal
          schedules={carryOverSchedules}
          onClose={() => setCarryOverSchedules(null)}
          onComplete={() => {
            setCarryOverSchedules(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}