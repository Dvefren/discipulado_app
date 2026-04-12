"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { inputClass, selectClass } from "@/lib/styles";
import { t } from "@/lib/translate";
import { getAvailableFacilitators } from "@/app/actions/facilitators";

interface Schedule { id: string; label: string; }
interface FacilitatorFormData {
  facilitatorId?: string;
  existingFacilitatorId?: string;
  tableId?: string;
  name: string;
  birthday: string;
  scheduleId: string;
  tableName: string;
}
interface FacilitatorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FacilitatorFormData) => Promise<void>;
  schedules: Schedule[];
  initialData?: FacilitatorFormData | null;
}

export function FacilitatorForm({ open, onClose, onSubmit, schedules, initialData }: FacilitatorFormProps) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [tableName, setTableName] = useState("");
  const [existingFacilitatorId, setExistingFacilitatorId] = useState("");
  const [availableFacilitators, setAvailableFacilitators] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = !!initialData?.facilitatorId;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setBirthday(initialData.birthday || "");
      setScheduleId(initialData.scheduleId || "");
      setTableName(initialData.tableName || "");
      setExistingFacilitatorId("");
    } else {
      setName("");
      setBirthday("");
      setScheduleId(schedules[0]?.id || "");
      setTableName("");
      setExistingFacilitatorId("");
    }
    setError("");
  }, [initialData, open, schedules]);

  // Load available facilitators when the form opens (creation mode only)
  useEffect(() => {
    if (open && !isEditing) {
      getAvailableFacilitators()
        .then((data) => setAvailableFacilitators(data))
        .catch(() => setAvailableFacilitators([]));
    }
  }, [open, isEditing]);

  // When admin picks an existing facilitator, autofill the name field
  function handleExistingChange(value: string) {
    setExistingFacilitatorId(value);
    if (value) {
      const fac = availableFacilitators.find((f) => f.id === value);
      if (fac) setName(fac.name);
    } else {
      setName("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleId || !tableName.trim()) {
      setError("El horario y nombre de mesa son requeridos.");
      return;
    }
    if (!existingFacilitatorId && !name.trim()) {
      setError("Selecciona un facilitador existente o escribe un nombre nuevo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        facilitatorId: initialData?.facilitatorId,
        existingFacilitatorId: existingFacilitatorId || undefined,
        tableId: initialData?.tableId,
        name: name.trim(),
        birthday,
        scheduleId,
        tableName: tableName.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">{isEditing ? "Editar facilitador" : "Agregar facilitador"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Use existing facilitator dropdown — only in create mode */}
            {!isEditing && availableFacilitators.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-lg p-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Reusar facilitador de un curso anterior
                </label>
                <select
                  value={existingFacilitatorId}
                  onChange={(e) => handleExistingChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">— Crear nuevo facilitador —</option>
                  {availableFacilitators.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Selecciona uno para reutilizar su perfil, o deja vacío para crear uno nuevo.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. María García"
                disabled={!!existingFacilitatorId}
                required={!existingFacilitatorId}
                className={`${inputClass} ${existingFacilitatorId ? "opacity-60" : ""}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cumpleaños (opcional)</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={!!existingFacilitatorId}
                className={`${inputClass} ${existingFacilitatorId ? "opacity-60" : ""}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Horario</label>
              <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required className={selectClass}>
                <option value="">Seleccionar horario</option>
                {schedules.map((s) => (<option key={s.id} value={s.id}>{t(s.label)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre de mesa</label>
              <input type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Ej. Mesa 1" required className={inputClass} />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-accent transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar facilitador"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}