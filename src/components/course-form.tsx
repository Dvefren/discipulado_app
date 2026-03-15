"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface CourseFormData {
  courseId?: string;
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
}

interface CourseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFormData) => Promise<void>;
  initialData?: CourseFormData | null;
}

export function CourseForm({ open, onClose, onSubmit, initialData }: CourseFormProps) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [year, setYear] = useState(currentYear);
  const [semester, setSemester] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData?.courseId;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setYear(initialData.year || currentYear);
      setSemester(initialData.semester || 1);
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
    } else {
      setName(`Course ${semester} - ${year}`);
      setYear(currentYear);
      setSemester(1);
      setStartDate("");
      setEndDate("");
    }
    setError("");
  }, [initialData, open]);

  // Auto-generate name when year or semester changes
  useEffect(() => {
    if (!isEditing) {
      setName(`Course ${semester} - ${year}`);
    }
  }, [year, semester, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setError("All fields are required.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        courseId: initialData?.courseId,
        name: name.trim(),
        year,
        semester,
        startDate,
        endDate,
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
            <h2 className="text-sm font-medium text-foreground">{isEditing ? "Edit course" : "New course"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Course name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Course 1 - 2026" required className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Year</label>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} min={2020} max={2040} required className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Semester</label>
                <select value={semester} onChange={(e) => setSemester(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card">
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">End date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground" />
              </div>
            </div>

            {!isEditing && (
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-700">The 4 default schedules (Wed 7pm, Sun 9am, 11am, 1pm) will be created automatically.</p>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                {loading ? "Saving..." : isEditing ? "Save changes" : "Create course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}