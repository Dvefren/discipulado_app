"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Cake, Flag } from "lucide-react";

interface ClassEvent {
  day: number;
  topics: string[];
  schedules: string[];
  type: "class";
}

interface BirthdayEvent {
  id: string;
  name: string;
  day: number;
  type: "facilitator_birthday" | "student_birthday";
  schedule?: string | null;
  facilitator?: string;
}

interface CourseEvent {
  id: string;
  name: string;
  day: number;
  type: "course_start" | "course_end";
}

type CalendarEvent = ClassEvent | BirthdayEvent | CourseEvent;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [facilitatorBirthdays, setFacilitatorBirthdays] = useState<BirthdayEvent[]>([]);
  const [studentBirthdays, setStudentBirthdays] = useState<BirthdayEvent[]>([]);
  const [courseEvents, setCourseEvents] = useState<CourseEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setFacilitatorBirthdays(data.facilitatorBirthdays || []);
        setStudentBirthdays(data.studentBirthdays || []);
        setCourseEvents(data.courseEvents || []);
        setLoading(false);
        setSelectedDay(null);
      });
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); }
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); }
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  function getEventsForDay(day: number): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const cls = classes.find((c) => c.day === day);
    if (cls) events.push(cls);
    facilitatorBirthdays.filter((b) => b.day === day).forEach((b) => events.push(b));
    studentBirthdays.filter((b) => b.day === day).forEach((b) => events.push(b));
    courseEvents.filter((c) => c.day === day).forEach((c) => events.push(c));
    return events;
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Today</button>
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded bg-purple-100 flex items-center justify-center"><BookOpen size={10} className="text-purple-600" /></div>
          Classes
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded bg-pink-100 flex items-center justify-center"><Cake size={10} className="text-pink-600" /></div>
          Birthdays
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center"><Flag size={10} className="text-amber-600" /></div>
          Course dates
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-2 py-2 text-xs font-medium text-gray-400 text-center">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-gray-400">Loading...</div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const day = i - firstDayOfMonth + 1;
                  const isValid = day >= 1 && day <= daysInMonth;
                  const events = isValid ? getEventsForDay(day) : [];
                  const hasClass = events.some((e) => e.type === "class");
                  const hasBirthday = events.some((e) => e.type === "facilitator_birthday" || e.type === "student_birthday");
                  const birthdayCount = events.filter((e) => e.type === "facilitator_birthday" || e.type === "student_birthday").length;
                  const hasCourse = events.some((e) => e.type === "course_start" || e.type === "course_end");
                  const isSelected = selectedDay === day && isValid;

                  return (
                    <div
                      key={i}
                      onClick={() => isValid && setSelectedDay(day === selectedDay ? null : day)}
                      className={`min-h-[80px] md:min-h-[88px] p-1.5 border-b border-r border-gray-50 transition-colors ${isValid ? "cursor-pointer hover:bg-gray-50" : ""} ${isSelected ? "bg-purple-50/70" : ""}`}
                    >
                      {isValid && (
                        <>
                          <div className={`text-xs mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-purple-600 text-white font-medium" : "text-gray-700"}`}>
                            {day}
                          </div>

                          <div className="space-y-1">
                            {/* Class pill */}
                            {hasClass && (
                              <div className="flex items-center gap-1 bg-purple-50 rounded px-1.5 py-0.5">
                                <BookOpen size={9} className="text-purple-600 shrink-0" />
                                <span className="text-[10px] text-purple-700 truncate leading-tight hidden md:block">
                                  {(events.find((e) => e.type === "class") as ClassEvent)?.topics[0]}
                                </span>
                                <span className="text-[10px] text-purple-700 md:hidden">Class</span>
                              </div>
                            )}

                            {/* Birthday pill */}
                            {hasBirthday && (
                              <div className="flex items-center gap-1 bg-pink-50 rounded px-1.5 py-0.5">
                                <Cake size={9} className="text-pink-600 shrink-0" />
                                <span className="text-[10px] text-pink-700 truncate leading-tight hidden md:block">
                                  {birthdayCount === 1
                                    ? (events.find((e) => e.type === "facilitator_birthday" || e.type === "student_birthday") as BirthdayEvent)?.name.split(" ")[0]
                                    : `${birthdayCount} birthdays`}
                                </span>
                                <span className="text-[10px] text-pink-700 md:hidden">{birthdayCount}</span>
                              </div>
                            )}

                            {/* Course pill */}
                            {hasCourse && (
                              <div className="flex items-center gap-1 bg-amber-50 rounded px-1.5 py-0.5">
                                <Flag size={9} className="text-amber-600 shrink-0" />
                                <span className="text-[10px] text-amber-700 truncate leading-tight hidden md:block">
                                  {(events.find((e) => e.type === "course_start") as CourseEvent)
                                    ? "Starts"
                                    : "Ends"}
                                </span>
                                <span className="text-[10px] text-amber-700 md:hidden">
                                  {(events.find((e) => e.type === "course_start") as CourseEvent) ? "S" : "E"}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:w-72">
          {selectedDay ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {MONTH_NAMES[month - 1]} {selectedDay}, {year}
              </h3>

              {selectedEvents.length === 0 ? (
                <p className="text-xs text-gray-400">No events on this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event, idx) => {
                    if (event.type === "class") {
                      const cls = event as ClassEvent;
                      return (
                        <div key={`class-${idx}`} className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen size={14} className="text-purple-600" />
                            <span className="text-xs font-medium text-purple-800">Class</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">{cls.topics.join(", ")}</p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {cls.schedules.length === 4
                              ? "All schedules"
                              : cls.schedules.map((s) => s.replace("Wednesday", "Wed").replace("Sunday", "Sun")).join(", ")}
                          </p>
                        </div>
                      );
                    }

                    if (event.type === "facilitator_birthday") {
                      const bday = event as BirthdayEvent;
                      return (
                        <div key={bday.id} className="bg-pink-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Cake size={14} className="text-pink-600" />
                            <span className="text-xs font-medium text-pink-800">Facilitator birthday</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">{bday.name}</p>
                          {bday.schedule && <p className="text-[11px] text-gray-500 mt-1">{bday.schedule}</p>}
                        </div>
                      );
                    }

                    if (event.type === "student_birthday") {
                      const bday = event as BirthdayEvent;
                      return (
                        <div key={bday.id} className="bg-pink-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Cake size={14} className="text-pink-500" />
                            <span className="text-xs font-medium text-pink-700">Student birthday</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">{bday.name}</p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {bday.schedule}{bday.facilitator ? ` · ${bday.facilitator}` : ""}
                          </p>
                        </div>
                      );
                    }

                    if (event.type === "course_start" || event.type === "course_end") {
                      const ce = event as CourseEvent;
                      return (
                        <div key={ce.id} className="bg-amber-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Flag size={14} className="text-amber-600" />
                            <span className="text-xs font-medium text-amber-800">
                              {ce.type === "course_start" ? "Course begins" : "Course ends"}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">{ce.name}</p>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">Click a day to see details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}