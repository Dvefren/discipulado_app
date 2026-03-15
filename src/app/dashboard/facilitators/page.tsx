"use client";

import { useState, useEffect } from "react";

interface FacilitatorData {
  id: string;
  name: string;
  tableName: string;
  studentCount: number;
  scheduleLabel: string;
}

interface ScheduleGroup {
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
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/facilitators")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  const filterOptions = [
    { key: "all", label: "All schedules" },
    ...groups.map((g) => ({
      key: g.label,
      label: g.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
    })),
  ];

  const filtered =
    filter === "all" ? groups : groups.filter((g) => g.label === filter);

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
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
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
        const colors = avatarColors[group.label] || {
          bg: "bg-gray-50",
          text: "text-gray-800",
        };

        return (
          <div key={group.label} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-gray-900">
                {group.label}
              </h2>
              <span className="text-xs text-gray-400">
                {group.facilitators.length} facilitators
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {group.facilitators.map((f) => (
                <div
                  key={f.id}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center font-medium text-xs ${colors.text}`}
                    >
                      {getInitials(f.name)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-400">{f.tableName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {f.studentCount} students
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}