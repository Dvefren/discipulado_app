"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteStudent } from "@/app/actions/students";

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  facilitatorName: string;
  scheduleLabel: string;
}

interface Schedule {
  id: string;
  label: string;
}

export default function StudentsTable({
  students,
  schedules,
}: {
  students: StudentRow[];
  schedules: Schedule[];
}) {
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "all"
      ? students
      : students.filter((s) => s.scheduleLabel === filter);

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteStudent(deleteTarget.id);
        setDeleteTarget(null);
      } catch {
        alert("Failed to delete student. Please try again.");
      }
    });
  }

  return (
    <>
      {/* Schedule Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
            filter === "all"
              ? "bg-gray-100 font-medium text-gray-900 border-gray-200"
              : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
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
                ? "bg-gray-100 font-medium text-gray-900 border-gray-200"
                : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Schedule
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Facilitator
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Phone
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {filter === "all"
                    ? "No students enrolled yet. Add your first student to get started."
                    : "No students in this schedule."}
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-4 py-2.5 text-sm text-gray-900">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.scheduleLabel}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.facilitatorName}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">
                    {student.phone || "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => setDeleteTarget(student)}
                      className="p-1.5 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Delete student
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-700">
                {deleteTarget.firstName} {deleteTarget.lastName}
              </span>
              ? This will also remove all their attendance records. This action
              cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
    </>
  );
}