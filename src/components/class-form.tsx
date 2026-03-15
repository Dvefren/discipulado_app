"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ClassFormData {
  classId?: string;
  name: string;
  topic: string;
  date: string;
  addToAll?: boolean;
}

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData) => Promise<void>;
  initialData?: ClassFormData | null;
}

export function ClassForm({ open, onClose, onSubmit, initialData }: ClassFormProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [tbd, setTbd] = useState(false);
  const [addToAll, setAddToAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData?.classId;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setTopic(initialData.topic || "");
      if (initialData.date === "2099-12-31") {
        setDate("");
        setTbd(true);
      } else {
        setDate(initialData.date || "");
        setTbd(false);
      }
      setAddToAll(true);
    } else {
      setName("");
      setTopic("");
      setDate("");
      setTbd(false);
      setAddToAll(true);
    }
    setError("");
  }, [initialData, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || (!date && !tbd)) {
      setError("Name and date are required (or mark as TBD).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        classId: initialData?.classId,
        name: name.trim(),
        topic: topic.trim(),
        date: tbd ? "2099-12-31" : date,
        addToAll,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-medium text-foreground">
              {isEditing ? "Edit class" : "Add class"}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Session name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sesión 22: La oración"
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. La oración"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setTbd(false); }}
                  disabled={tbd}
                  required={!tbd}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => { setTbd(!tbd); if (!tbd) setDate(""); }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${tbd ? "bg-amber-50 text-amber-700 border-amber-200" : "text-muted-foreground border-border hover:border-border"}`}
                >
                  TBD
                </button>
              </div>
            </div>

            {!isEditing && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToAll}
                  onChange={(e) => setAddToAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-muted-foreground">Add to all 4 schedules</span>
              </label>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                {loading ? "Saving..." : isEditing ? "Save changes" : "Add class"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}