"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";

type Role = "ADMIN" | "SCHEDULE_LEADER" | "SECRETARY" | "FACILITATOR";

interface ScheduleOption {
  id: string;
  label: string;
}

interface FacilitatorOption {
  id: string;
  name: string;
  scheduleLabel: string;
  linked: boolean;
}

interface UserFormData {
  userId?: string;
  email: string;
  name: string;
  role: Role;
  password: string;
  facilitatorId: string;
  scheduleIds: string[];
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  schedules: ScheduleOption[];
  facilitators: FacilitatorOption[];
  initialData?: UserFormData | null;
}

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "ADMIN", label: "Admin", description: "Full access to everything" },
  { value: "SCHEDULE_LEADER", label: "Schedule Leader", description: "Supervises a specific schedule" },
  { value: "SECRETARY", label: "Secretary", description: "Manages attendance records" },
  { value: "FACILITATOR", label: "Facilitator", description: "Manages their own table" },
];

export function UserForm({ open, onClose, onSubmit, schedules, facilitators, initialData }: UserFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("FACILITATOR");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [facilitatorId, setFacilitatorId] = useState("");
  const [scheduleIds, setScheduleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData?.userId;

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email || "");
      setName(initialData.name || "");
      setRole(initialData.role || "FACILITATOR");
      setPassword("");
      setFacilitatorId(initialData.facilitatorId || "");
      setScheduleIds(initialData.scheduleIds || []);
    } else {
      setEmail("");
      setName("");
      setRole("FACILITATOR");
      setPassword("");
      setFacilitatorId("");
      setScheduleIds([]);
    }
    setShowPassword(false);
    setError("");
  }, [initialData, open]);

  function toggleSchedule(id: string) {
    setScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  // Filter facilitators that aren't already linked to another user
  const availableFacilitators = facilitators.filter(
    (f) => !f.linked || (isEditing && initialData?.facilitatorId === f.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError("Email and name are required.");
      return;
    }
    if (!isEditing && !password) {
      setError("Password is required for new users.");
      return;
    }
    if ((role === "FACILITATOR" || role === "SCHEDULE_LEADER" || role === "SECRETARY") && !facilitatorId) {
      setError("Please select a facilitator profile to link.");
      return;
    }
    if ((role === "SCHEDULE_LEADER" || role === "SECRETARY") && scheduleIds.length === 0) {
      setError("Please select at least one schedule.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        userId: initialData?.userId,
        email: email.trim(),
        name: name.trim(),
        role,
        password,
        facilitatorId,
        scheduleIds,
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
            <h2 className="text-sm font-medium text-gray-900">{isEditing ? "Edit user" : "Create user"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Garcia" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. maria@discipulado.app" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {isEditing ? "New password (leave blank to keep current)" : "Password"}
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEditing ? "Leave blank to keep current" : "Enter a password"} required={!isEditing} className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <div className="space-y-1.5">
                {ROLES.map((r) => (
                  <label key={r.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${role === r.value ? "border-purple-300 bg-purple-50/50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{r.label}</p>
                      <p className="text-[11px] text-gray-500">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Facilitator Link (for FACILITATOR, SCHEDULE_LEADER, and SECRETARY) */}
            {(role === "FACILITATOR" || role === "SCHEDULE_LEADER" || role === "SECRETARY") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Link to facilitator profile</label>
                <select value={facilitatorId} onChange={(e) => setFacilitatorId(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 bg-white">
                  <option value="">Select a facilitator</option>
                  {availableFacilitators.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} — {f.scheduleLabel}</option>
                  ))}
                </select>
                {availableFacilitators.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">All facilitators are already linked to a user account.</p>
                )}
              </div>
            )}

            {/* Schedule Selection (for SCHEDULE_LEADER and SECRETARY) */}
            {(role === "SCHEDULE_LEADER" || role === "SECRETARY") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Assigned schedules
                </label>
                <div className="space-y-1.5">
                  {schedules.map((s) => (
                    <label key={s.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${scheduleIds.includes(s.id) ? "border-purple-300 bg-purple-50/50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="checkbox" checked={scheduleIds.includes(s.id)} onChange={() => toggleSchedule(s.id)} className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500" />
                      <span className="text-xs text-gray-900">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                {loading ? "Saving..." : isEditing ? "Save changes" : "Create user"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}