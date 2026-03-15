"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { inputClass, selectClass } from "@/lib/styles";

interface Schedule { id: string; label: string; }
interface FacilitatorFormData { facilitatorId?: string; tableId?: string; name: string; birthday: string; scheduleId: string; tableName: string; }
interface FacilitatorFormProps { open: boolean; onClose: () => void; onSubmit: (data: FacilitatorFormData) => Promise<void>; schedules: Schedule[]; initialData?: FacilitatorFormData | null; }

export function FacilitatorForm({ open, onClose, onSubmit, schedules, initialData }: FacilitatorFormProps) {
  const [name, setName] = useState(""); const [birthday, setBirthday] = useState(""); const [scheduleId, setScheduleId] = useState(""); const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const isEditing = !!initialData?.facilitatorId;

  useEffect(() => {
    if (initialData) { setName(initialData.name || ""); setBirthday(initialData.birthday || ""); setScheduleId(initialData.scheduleId || ""); setTableName(initialData.tableName || ""); }
    else { setName(""); setBirthday(""); setScheduleId(schedules[0]?.id || ""); setTableName(""); }
    setError("");
  }, [initialData, open, schedules]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !scheduleId || !tableName.trim()) { setError("Name, schedule, and table name are required."); return; }
    setLoading(true); setError("");
    try { await onSubmit({ facilitatorId: initialData?.facilitatorId, tableId: initialData?.tableId, name: name.trim(), birthday, scheduleId, tableName: tableName.trim() }); onClose(); }
    catch (err: any) { setError(err.message || "Something went wrong."); }
    finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">{isEditing ? "Edit facilitator" : "Add facilitator"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Full name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Garcia" required className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Birthday (optional)</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Schedule</label><select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required className={selectClass}><option value="">Select a schedule</option>{schedules.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}</select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Table name</label><input type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g. Table 1" required className={inputClass} /></div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-accent transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">{loading ? "Saving..." : isEditing ? "Save changes" : "Add facilitator"}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}