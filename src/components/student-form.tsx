"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface TableOption {
  id: string;
  name: string;
  facilitatorName: string;
  scheduleLabel: string;
}

interface StudentFormData {
  studentId?: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  phone: string;
  address: string;
  tableId: string;
}

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: StudentFormData) => Promise<void>;
  tables: TableOption[];
  initialData?: StudentFormData | null;
}

export function StudentForm({
  open,
  onClose,
  onSubmit,
  tables,
  initialData,
}: StudentFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData?.studentId;

  // Group tables by schedule for the dropdown
  const grouped = tables.reduce<Record<string, TableOption[]>>((acc, t) => {
    if (!acc[t.scheduleLabel]) acc[t.scheduleLabel] = [];
    acc[t.scheduleLabel].push(t);
    return acc;
  }, {});

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setBirthdate(initialData.birthdate || "");
      setPhone(initialData.phone || "");
      setAddress(initialData.address || "");
      setTableId(initialData.tableId || "");
    } else {
      setFirstName("");
      setLastName("");
      setBirthdate("");
      setPhone("");
      setAddress("");
      setTableId("");
    }
    setError("");
  }, [initialData, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !tableId) {
      setError("First name, last name, and table are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        studentId: initialData?.studentId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthdate,
        phone: phone.trim(),
        address: address.trim(),
        tableId,
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
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 sticky top-0 bg-card rounded-t-xl">
            <h2 className="text-sm font-medium text-foreground">
              {isEditing ? "Edit student" : "Add student"}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Maria"
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Garcia"
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Birthday (optional)
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (899) 123-4567"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Address (optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Reynosa"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Assign to table
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card"
              >
                <option value="">Select a table</option>
                {Object.entries(grouped).map(([schedule, scheduleTables]) => (
                  <optgroup key={schedule} label={schedule}>
                    {scheduleTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.facilitatorName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Save changes"
                  : "Add student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}