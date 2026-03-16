"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import AddStudentModal from "@/components/add-student-modal";
import { ExportCsvButton } from "@/components/export-csv-button";
import { deleteStudent } from "@/app/actions/students";

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

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isPending, startTransition] = useTransition();

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
          (s.phone && s.phone.toLowerCase().includes(q)) ||
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

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteStudent(deleteTarget.id);
        // Remove from local state immediately
        setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      } catch {
        alert("Failed to delete student. Please try again.");
      }
    });
  }

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-foreground/70">
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
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 transition-colors"
          >
            + Add student
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, facilitator..."
          className="w-full pl-9 pr-9 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Schedule Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
            filter === "all"
              ? "bg-card font-medium text-foreground border-border"
              : "text-muted-foreground border-border hover:border-border hover:text-foreground"
          }`}
        >
          All schedules
        </button>
        {schedules.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.label)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
              filter === s.label
                ? "bg-card font-medium text-foreground border-border"
                : "text-muted-foreground border-border hover:border-border hover:text-foreground"
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
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Name
                <SortArrow field="name" />
              </th>
              <th
                onClick={() => handleSort("schedule")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Schedule
                <SortArrow field="schedule" />
              </th>
              <th
                onClick={() => handleSort("facilitator")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Facilitator
                <SortArrow field="facilitator" />
              </th>
              <th
                onClick={() => handleSort("phone")}
                className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Phone
                <SortArrow field="phone" />
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  {search
                    ? `No results matching "${search}"`
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
                  className="border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer group"
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
                  <td className="px-2 py-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(student);
                      }}
                      className="p-1.5 rounded-md text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      title="Delete student"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Student count */}
      {sorted.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {sorted.length} student{sorted.length !== 1 ? "s" : ""}
          {search || filter !== "all" ? " found" : " total"}
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setDeleteTarget(null)}
          />
          <div className="relative bg-card rounded-xl shadow-lg p-6 w-full max-w-sm mx-4 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Delete student
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget.firstName} {deleteTarget.lastName}
              </span>
              ? This will also remove all their attendance records. This action
              cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
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