"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AddStudentModal from "@/components/add-student-modal";
import { ExportCsvButton } from "@/components/export-csv-button";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  scheduleLabel: string;
  facilitatorName: string;
}

interface Schedule {
  id: string;
  label: string;
  tables: {
    id: string;
    name: string;
    facilitator: { id: string; name: string };
  }[];
}

type SortField = "name" | "schedule" | "facilitator" | "phone";
type SortDir = "asc" | "desc";

export default function StudentsPageClient({
  initialStudents,
  schedules,
}: {
  initialStudents: Student[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter by schedule
  const bySchedule =
    filter === "all"
      ? students
      : students.filter((s) => s.scheduleLabel === filter);

  // Filter by search
  const bySearch = search.trim()
    ? bySchedule.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          s.facilitatorName.toLowerCase().includes(q)
        );
      })
    : bySchedule;

  // Sort
  const sorted = [...bySearch].sort((a, b) => {
    let valA = "";
    let valB = "";

    switch (sortField) {
      case "name":
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case "schedule":
        valA = a.scheduleLabel.toLowerCase();
        valB = b.scheduleLabel.toLowerCase();
        break;
      case "facilitator":
        valA = a.facilitatorName.toLowerCase();
        valB = b.facilitatorName.toLowerCase();
        break;
      case "phone":
        valA = (a.phone || "").toLowerCase();
        valB = (b.phone || "").toLowerCase();
        break;
    }

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const refreshStudents = async () => {
    const res = await fetch("/api/students/list");
    if (res.ok) {
      const data = await res.json();
      setStudents(data.students);
    }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-muted-foreground/70">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Students</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton scheduleFilter={filter} />
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            + Add student
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or facilitator..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl outline-none focus:border-ring placeholder:text-muted-foreground/40 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Schedule Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-colors ${
            filter === "all"
              ? "bg-secondary font-medium text-foreground border-border"
              : "text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
          }`}
        >
          All schedules
        </button>
        {schedules.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.label)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-colors ${
              filter === s.label
                ? "bg-secondary font-medium text-foreground border-border"
                : "text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th
                onClick={() => handleSort("name")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-gray-700 transition-colors select-none"
              >
                Name
                <SortArrow field="name" />
              </th>
              <th
                onClick={() => handleSort("schedule")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-gray-700 transition-colors select-none"
              >
                Schedule
                <SortArrow field="schedule" />
              </th>
              <th
                onClick={() => handleSort("facilitator")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-gray-700 transition-colors select-none"
              >
                Facilitator
                <SortArrow field="facilitator" />
              </th>
              <th
                onClick={() => handleSort("phone")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-gray-700 transition-colors select-none"
              >
                Phone
                <SortArrow field="phone" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground/70"
                >
                  {search
                    ? `No students matching "${search}"`
                    : filter === "all"
                    ? "No students enrolled yet. Add your first student to get started."
                    : "No students in this schedule."}
                </td>
              </tr>
            ) : (
              sorted.map((student) => (
                <tr
                  key={student.id}
                  onClick={() =>
                    router.push(`/dashboard/students/${student.id}`)
                  }
                  className="border-b border-border/30 hover:bg-muted transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-sm text-foreground">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {student.scheduleLabel}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {student.facilitatorName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {student.phone || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Student count */}
      {sorted.length > 0 && (
        <p className="text-xs text-muted-foreground/70 mt-2 text-right">
          {sorted.length} student{sorted.length !== 1 ? "s" : ""}
          {search || filter !== "all" ? " found" : " total"}
        </p>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        schedules={schedules}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refreshStudents}
      />
    </div>
  );
}