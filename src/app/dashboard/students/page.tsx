"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { StudentForm } from "@/components/student-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  createStudent,
  updateStudent,
  deleteStudent,
} from "@/app/actions/students";

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  phone: string | null;
  address: string | null;
  tableId: string;
  tableName: string;
  facilitatorName: string;
  scheduleId: string;
  scheduleLabel: string;
}

interface TableOption {
  id: string;
  name: string;
  facilitatorName: string;
  scheduleLabel: string;
}

interface ScheduleOption {
  id: string;
  label: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentData | null>(null);

  function fetchData() {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setTables(data.tables || []);
        setSchedules(data.schedules || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let result = students;

    if (filter !== "all") {
      result = result.filter((s) => s.scheduleLabel === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.facilitatorName.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    return result;
  }, [students, filter, search]);

  const filterOptions = [
    { key: "all", label: "All schedules" },
    ...schedules.map((s) => ({
      key: s.label,
      label: s.label.replace("Wednesday", "Wed").replace("Sunday", "Sun"),
    })),
  ];

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  function handleEdit(s: StudentData) {
    setEditData({
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      birthdate: s.birthdate || "",
      phone: s.phone || "",
      address: s.address || "",
      tableId: s.tableId,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(s: StudentData) {
    setDeleteTarget(s);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: any) {
    if (data.studentId) {
      await updateStudent(data);
    } else {
      await createStudent(data);
    }
    fetchData();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteStudent(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-gray-900 mb-5">Students</h1>
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Students</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} />
          Add student
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
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
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">
        {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        {filter !== "all" && ` in ${filter}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Students Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block">
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
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    {students.length === 0
                      ? "No students enrolled yet. Add your first student to get started."
                      : "No students match your search."}
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
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                          onClick={() => handleEdit(student)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {students.length === 0
                ? "No students enrolled yet. Add your first student to get started."
                : "No students match your search."}
            </div>
          ) : (
            filtered.map((student) => (
              <div key={student.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    {student.firstName} {student.lastName}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(student)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(student)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {student.scheduleLabel} · {student.facilitatorName}
                </p>
                {student.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {student.phone}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        tables={tables}
        initialData={editData}
      />

      {/* Delete Confirmation */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete student"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? Their attendance records will also be deleted.`}
      />
    </div>
  );
}