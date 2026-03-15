"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { StudentForm } from "@/components/student-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import { createStudent, updateStudent, deleteStudent } from "@/app/actions/students";

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

interface TableOption { id: string; name: string; facilitatorName: string; scheduleLabel: string; }
interface ScheduleOption { id: string; label: string; }

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [facilitatorFilter, setFacilitatorFilter] = useState("all");
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

  useEffect(() => { fetchData(); }, []);

  // Get unique facilitator names based on current schedule filter
  const facilitatorNames = useMemo(() => {
    let filtered = students;
    if (scheduleFilter !== "all") {
      filtered = filtered.filter((s) => s.scheduleLabel === scheduleFilter);
    }
    const names = [...new Set(filtered.map((s) => s.facilitatorName))];
    return names.sort();
  }, [students, scheduleFilter]);

  // Reset facilitator filter when schedule changes
  useEffect(() => {
    setFacilitatorFilter("all");
  }, [scheduleFilter]);

  const filtered = useMemo(() => {
    let result = students;

    if (scheduleFilter !== "all") {
      result = result.filter((s) => s.scheduleLabel === scheduleFilter);
    }

    if (facilitatorFilter !== "all") {
      result = result.filter((s) => s.facilitatorName === facilitatorFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.facilitatorName.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    return result;
  }, [students, scheduleFilter, facilitatorFilter, search]);

  function handleAdd() { setEditData(null); setFormOpen(true); }

  function handleEdit(s: StudentData) {
    setEditData({
      studentId: s.id, firstName: s.firstName, lastName: s.lastName,
      birthdate: s.birthdate || "", phone: s.phone || "",
      address: s.address || "", tableId: s.tableId,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(s: StudentData) { setDeleteTarget(s); setDeleteOpen(true); }

  async function handleFormSubmit(data: any) {
    if (data.studentId) { await updateStudent(data); } else { await createStudent(data); }
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
        <h1 className="text-lg font-medium text-foreground mb-5">Students</h1>
        <div className="bg-muted rounded-lg p-10 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Students</h1>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <Plus size={14} /> Add student
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, facilitator, or phone..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-muted-foreground" />
      </div>

      {/* Schedule Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setScheduleFilter("all")} className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${scheduleFilter === "all" ? "bg-accent font-medium text-foreground border-border" : "text-muted-foreground border-border hover:border-border hover:text-foreground"}`}>
          All schedules
        </button>
        {schedules.map((s) => (
          <button key={s.id} onClick={() => setScheduleFilter(s.label)} className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${scheduleFilter === s.label ? "bg-accent font-medium text-foreground border-border" : "text-muted-foreground border-border hover:border-border hover:text-foreground"}`}>
            {s.label.replace("Wednesday", "Wed").replace("Sunday", "Sun")}
          </button>
        ))}
      </div>

      {/* Facilitator Filter */}
      {facilitatorNames.length > 1 && (
        <div className="mb-4">
          <select
            value={facilitatorFilter}
            onChange={(e) => setFacilitatorFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground bg-card"
          >
            <option value="all">All facilitators ({facilitatorNames.length})</option>
            {facilitatorNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        {scheduleFilter !== "all" && ` in ${scheduleFilter}`}
        {facilitatorFilter !== "all" && ` · ${facilitatorFilter}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Schedule</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Facilitator</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Phone</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {students.length === 0 ? "No students enrolled yet. Add your first student to get started." : "No students match your filters."}
                </td></tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="border-b border-border/30 hover:bg-accent transition-colors group">
                    <td className="px-4 py-2.5 text-sm"><Link href={`/dashboard/students/${student.id}`} className="text-foreground hover:text-gray-500 dark:hover:text-white transition-colors">{student.firstName} {student.lastName}</Link></td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{student.scheduleLabel}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{student.facilitatorName}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{student.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => handleEdit(student)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteClick(student)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {students.length === 0 ? "No students enrolled yet." : "No students match your filters."}
            </div>
          ) : (
            filtered.map((student) => (
              <div key={student.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/dashboard/students/${student.id}`} className="text-sm font-medium text-foreground hover:text-gray-500 dark:hover:text-white transition-colors">{student.firstName} {student.lastName}</Link>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(student)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteClick(student)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{student.scheduleLabel} · {student.facilitatorName}</p>
                {student.phone && <p className="text-xs text-muted-foreground mt-0.5">{student.phone}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      <StudentForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} tables={tables} initialData={editData} />
      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteConfirm} title="Delete student" message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? Their attendance records will also be deleted.`} />
    </div>
  );
}