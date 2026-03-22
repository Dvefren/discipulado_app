"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";

type EventCategory = "BIRTHDAY" | "CLASS" | "COURSE_DATE" | "SNACK" | "DYNAMICS" | "OTHER";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string | null;
  category: EventCategory;
  createdByName: string;
  createdById: string;
}

interface Props {
  initialEvents: CalendarEvent[];
  role: string;
  canEdit: boolean;
  userScheduleId: string | null;
  currentUserId: string;
}

const categoryMeta: Record<EventCategory, { label: string; color: string; dot: string }> = {
  BIRTHDAY:    { label: "Cumpleaños",    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",         dot: "bg-pink-400"   },
  CLASS:       { label: "Clase",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",         dot: "bg-blue-400"   },
  COURSE_DATE: { label: "Fecha del curso", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", dot: "bg-purple-500" },
  SNACK:       { label: "Botana",       color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-400" },
  DYNAMICS:    { label: "Dinámica",    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",         dot: "bg-teal-400"   },
  OTHER:       { label: "Otro",       color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",            dot: "bg-gray-400"   },
};

// Categories that can be manually created (not BIRTHDAY or CLASS — those are auto)
const CREATABLE_CATEGORIES: EventCategory[] = ["COURSE_DATE", "SNACK", "DYNAMICS", "OTHER"];

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isVirtualEvent(id: string) {
  return id.startsWith("bday-") || id.startsWith("class-");
}

export function CalendarClient({ initialEvents, role, canEdit, userScheduleId, currentUserId }: Props) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<EventCategory>("OTHER");
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "ADMIN";
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  function getEventsForDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.date);
      return d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day;
    });
  }

  // Can this event be deleted by the current user?
  function canDeleteEvent(ev: CalendarEvent): boolean {
    if (isVirtualEvent(ev.id)) return false;
    if (isAdmin) return ev.createdById === currentUserId;
    return canEdit; // leaders/secretaries can delete their schedule's events
  }

  function openModal(day?: number) {
    const d = day ? new Date(year, month, day) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setNewDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setNewTitle("");
    setNewDescription("");
    setNewCategory("OTHER");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!newTitle.trim() || !newDate) return;
    // Non-admin needs a scheduleId
    if (!isAdmin && !userScheduleId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          date: newDate,
          description: newDescription || null,
          category: newCategory,
          scheduleId: isAdmin ? null : userScheduleId,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setEvents((prev) => [...prev, {
          ...created,
          createdByName: "You",
          createdById: currentUserId,
        }]);
        setModalOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (isVirtualEvent(id)) return;
    const res = await fetch("/api/calendar-events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDateLabel = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-foreground">Calendario</h1>
        {canEdit && (
          <button onClick={() => openModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
            <Plus size={13} /> Add event
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-foreground w-36 text-center">{MONTHS[month]} {year}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[90px] border-b border-r border-border/40 bg-muted/10" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const today_ = isToday(day);
            const selected = selectedDay === day;

            return (
              <div key={day}
                onClick={() => setSelectedDay(selected ? null : day)}
                className={`min-h-[90px] border-b border-r border-border/40 p-1.5 cursor-pointer transition-colors ${selected ? "bg-muted/50" : "hover:bg-muted/20"}`}>
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${today_ ? "bg-primary text-primary-foreground" : selected ? "bg-muted text-foreground" : "text-foreground"}`}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const meta = categoryMeta[ev.category as EventCategory] ?? categoryMeta.OTHER;
                    return (
                      <div key={ev.id}
                        onClick={(e) => e.stopPropagation()}
                        className={`group flex items-center justify-between gap-1 rounded px-1.5 py-0.5 ${meta.color}`}>
                        <span className="text-[10px] font-medium truncate">{ev.title}</span>
                        {canDeleteEvent(ev) && (
                          <button onClick={(e) => handleDelete(ev.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-red-500">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <p className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">{selectedDateLabel}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedDayEvents.length === 0 ? "Sin eventos" : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? "s" : ""}`}
              </p>
            </div>
            {canEdit && (
              <button onClick={() => openModal(selectedDay)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={12} /> Add
              </button>
            )}
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((ev) => {
                const meta = categoryMeta[ev.category as EventCategory] ?? categoryMeta.OTHER;
                return (
                  <div key={ev.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${meta.dot}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{ev.title}</p>
                        {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">by {ev.createdByName}</span>
                        </div>
                      </div>
                    </div>
                    {canDeleteEvent(ev) && (
                      <button onClick={(e) => handleDelete(ev.id, e)}
                        className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">Add Event</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Título</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ej. Servicio especial"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CREATABLE_CATEGORIES.map((cat) => {
                    const meta = categoryMeta[cat];
                    return (
                      <button key={cat} onClick={() => setNewCategory(cat)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${newCategory === cat ? `${meta.color} border-transparent` : "border-border text-muted-foreground hover:text-foreground"}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description <span className="opacity-60">(opcional)</span>
                </label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2}
                  placeholder="Agregar detalles..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!newTitle.trim() || !newDate || saving}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Guardando..." : "Agregar evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}