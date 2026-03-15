"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  "Wednesday 7:00 PM": { bg: "bg-blue-50", text: "text-blue-800" },
  "Sunday 9:00 AM": { bg: "bg-teal-50", text: "text-teal-800" },
  "Sunday 11:00 AM": { bg: "bg-purple-50", text: "text-purple-800" },
  "Sunday 1:00 PM": { bg: "bg-orange-50", text: "text-orange-800" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

  function fetchData() {
    fetch("/api/facilitators")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.groups || []);
        setSchedules(data.schedules || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filterOptions = [
    { key: "all", label: "All schedules" },
    ...groups.map((g) => ({
      key: g.label,
      label: g.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
    })),
  ];

  const filtered = filter === "all" ? groups : groups.filter((g) => g.label === filter);

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  function handleEdit(f: FacilitatorData) {
    setEditData({
      facilitatorId: f.id,
      tableId: f.tableId,
      name: f.name,
      birthday: f.birthday || "",
      scheduleId: f.scheduleId,
      tableName: f.tableName,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(f: FacilitatorData) {
    setDeleteTarget(f);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: any) {
    if (data.facilitatorId) {
      await updateFacilitator(data);
    } else {
      await createFacilitator(data);
    }
    fetchData();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteFacilitator(deleteTarget.id, deleteTarget.tableId);
    setDeleteTarget(null);
    fetchData();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-gray-900 mb-5">Facilitators</h1>
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Facilitators</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} />
          Add facilitator
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
              filter === opt.key
                ? "bg-gray-100 font-medium text-gray-900 border-gray-200"
                : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Schedule Groups */}
      {filtered.map((group) => {
        const colors = avatarColors[group.label] || { bg: "bg-gray-50", text: "text-gray-800" };

        return (
          <div key={group.label} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-gray-900">{group.label}</h2>
              <span className="text-xs text-gray-400">
                {group.facilitators.length} facilitators
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {group.facilitators.map((f) => (
                <div
                  key={f.id}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center font-medium text-xs ${colors.text} shrink-0`}
                    >
                      {getInitials(f.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{f.tableName}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(f)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(f)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{f.studentCount} students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <FacilitatorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        schedules={schedules}
        initialData={editData}
      />

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete facilitator"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
      />
    </div>
  );
}