"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ClassForm } from "@/components/class-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  createClass,
  createClassForAllSchedules,
  updateClass,
  deleteClass,
} from "@/app/actions/classes";

interface ClassData {
  id: string;
  number: number;
  name: string;
  topic: string | null;
  date: string;
  dateFormatted: string;
  attendanceCount: number;
  scheduleId: string;
}

interface ScheduleOption {
  id: string;
  label: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassData | null>(null);

  function fetchData(scheduleId?: string) {
    const url = scheduleId
      ? `/api/classes?scheduleId=${scheduleId}`
      : "/api/classes";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        if (data.schedules?.length && !schedules.length) {
          setSchedules(data.schedules);
        }
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      fetchData(selectedSchedule);
    }
  }, [selectedSchedule]);

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  function handleEdit(c: ClassData) {
    setEditData({
      classId: c.id,
      name: c.name,
      topic: c.topic || "",
      date: c.date,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(c: ClassData) {
    setDeleteTarget(c);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: any) {
    if (data.classId) {
      await updateClass(data);
    } else if (data.addToAll) {
      await createClassForAllSchedules(data);
    } else {
      if (!selectedSchedule && schedules.length > 0) {
        await createClass({ ...data, scheduleId: schedules[0].id });
      } else {
        await createClass({ ...data, scheduleId: selectedSchedule });
      }
    }
    fetchData(selectedSchedule || undefined);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteClass(deleteTarget.id);
    setDeleteTarget(null);
    fetchData(selectedSchedule || undefined);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-gray-900 mb-5">Classes</h1>
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Classes</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} />
          Add class
        </button>
      </div>

      {/* Schedule Tabs */}
      {schedules.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {schedules.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelectedSchedule(s.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
                selectedSchedule === s.id || (!selectedSchedule && i === 0)
                  ? "bg-gray-100 font-medium text-gray-900 border-gray-200"
                  : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {s.label.replace("Wednesday", "Wed").replace("Sunday", "Sun")}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">{classes.length} classes</p>

      {/* Classes Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-12">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Topic</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-36">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">Attendance</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    No classes yet. Add your first class.
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-2.5 text-sm text-gray-400">{cls.number}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{cls.topic || cls.name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{cls.dateFormatted}</td>
                    <td className="px-4 py-2.5">
                      {cls.attendanceCount > 0 ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          {cls.attendanceCount} records
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No records</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                          onClick={() => handleEdit(cls)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(cls)}
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

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {classes.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              No classes yet. Add your first class.
            </div>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-gray-400 mr-1.5">{cls.number}.</span>
                    {cls.topic || cls.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(cls)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(cls)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{cls.dateFormatted}</span>
                  {cls.attendanceCount > 0 && (
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      {cls.attendanceCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ClassForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
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
        title="Delete class"
        message={`Are you sure you want to delete "${deleteTarget?.topic || deleteTarget?.name}"? All attendance records for this class will also be deleted.`}
      />
    </div>
  );
}