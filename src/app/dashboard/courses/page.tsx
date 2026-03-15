"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, Users, BookOpen, UserCircle, Calendar } from "lucide-react";
import { CourseForm } from "@/components/course-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  createCourse,
  updateCourse,
  setActiveCourse,
  deleteCourse,
} from "@/app/actions/courses";

interface CourseData {
  id: string;
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
  startFormatted: string;
  endFormatted: string;
  isActive: boolean;
  scheduleCount: number;
  totalStudents: number;
  totalFacilitators: number;
  totalClasses: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseData | null>(null);

  function fetchData() {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        setCourses(data || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  function handleEdit(c: CourseData) {
    setEditData({
      courseId: c.id,
      name: c.name,
      year: c.year,
      semester: c.semester,
      startDate: c.startDate,
      endDate: c.endDate,
    });
    setFormOpen(true);
  }

  function handleDeleteClick(c: CourseData) {
    setDeleteTarget(c);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: any) {
    if (data.courseId) {
      await updateCourse(data);
    } else {
      await createCourse(data);
    }
    fetchData();
  }

  async function handleSetActive(courseId: string) {
    await setActiveCourse(courseId);
    fetchData();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteCourse(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-gray-900 mb-5">Courses</h1>
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Courses</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} />
          New course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <p className="text-sm text-gray-400">No courses yet. Create your first course to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className={`bg-white border rounded-xl p-5 transition-colors ${course.isActive ? "border-purple-200 bg-purple-50/30" : "border-gray-200 hover:border-gray-300"}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-medium text-gray-900">{course.name}</h2>
                    {course.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Semester {course.semester} · {course.startFormatted} — {course.endFormatted}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {!course.isActive && (
                    <button
                      onClick={() => handleSetActive(course.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                      title="Set as active"
                    >
                      <Check size={12} />
                      Set active
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(course)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  {!course.isActive && (
                    <button
                      onClick={() => handleDeleteClick(course)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Calendar size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Schedules</p>
                    <p className="text-sm font-medium text-gray-900">{course.scheduleCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <BookOpen size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Classes</p>
                    <p className="text-sm font-medium text-gray-900">{course.totalClasses}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <UserCircle size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Facilitators</p>
                    <p className="text-sm font-medium text-gray-900">{course.totalFacilitators}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Users size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="text-sm font-medium text-gray-900">{course.totalStudents}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CourseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editData}
      />

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete course"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All schedules, classes, and attendance records will be deleted.`}
      />
    </div>
  );
}