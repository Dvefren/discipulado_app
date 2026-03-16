"use client";

import { useState, useEffect } from "react";
import CameraCapture from "@/components/camera-capture";

interface Schedule {
  id: string;
  label: string;
  tables: {
    id: string;
    name: string;
    facilitator: { id: string; name: string };
  }[];
}

interface ProfileQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
}

interface AddStudentModalProps {
  schedules: Schedule[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// Map OCR church answer keys to question IDs
const OCR_TO_QUESTION_MAP: Record<string, string[]> = {
  q_member: ["miembro"],
  q_baptized: ["bautiz"],
  q_invited: ["invit"],
  q_how_heard: ["enteraste"],
};

function matchOcrToQuestion(
  questionId: string,
  questionText: string,
  ocrAnswers: Record<string, string>
): string | null {
  // Direct ID match
  if (ocrAnswers[questionId]) return ocrAnswers[questionId];

  // Try matching by question text keywords
  const lowerText = questionText.toLowerCase();
  for (const [ocrKey, keywords] of Object.entries(OCR_TO_QUESTION_MAP)) {
    if (
      ocrAnswers[ocrKey] &&
      keywords.some((kw) => lowerText.includes(kw))
    ) {
      return ocrAnswers[ocrKey];
    }
  }

  return null;
}

export default function AddStudentModal({
  schedules,
  open,
  onClose,
  onCreated,
}: AddStudentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [tableId, setTableId] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [saving, setSaving] = useState(false);
  const [ocrFilled, setOcrFilled] = useState(false);

  // Church questions
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const availableTables =
    schedules.find((s) => s.id === selectedSchedule)?.tables || [];

  useEffect(() => {
    if (open) {
      fetch("/api/profile-questions")
        .then((res) => res.json())
        .then((data) => setQuestions(data.questions || []))
        .catch(() => setQuestions([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddress("");
      setBirthdate("");
      setTableId("");
      setSelectedSchedule("");
      setOcrFilled(false);
      setAnswers({});
    }
  }, [open]);

  const handleOcrExtracted = (data: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    birthdate: string;
    churchAnswers?: Record<string, string>;
  }) => {
    if (data.firstName) setFirstName(data.firstName);
    if (data.lastName) setLastName(data.lastName);
    if (data.phone) setPhone(data.phone);
    if (data.address) setAddress(data.address);
    if (data.birthdate) setBirthdate(data.birthdate);

    // Auto-fill church question answers
    if (data.churchAnswers && questions.length > 0) {
      const newAnswers: Record<string, string> = { ...answers };
      for (const q of questions) {
        const match = matchOcrToQuestion(q.id, q.question, data.churchAnswers);
        if (match) {
          newAnswers[q.id] = match;
        }
      }
      setAnswers(newAnswers);
    }

    setOcrFilled(true);
  };

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !tableId) return;

    setSaving(true);
    try {
      const profileNotes: Record<string, string> = {};
      Object.entries(answers).forEach(([key, value]) => {
        if (value.trim()) profileNotes[key] = value.trim();
      });

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          birthdate: birthdate || null,
          tableId,
          profileNotes:
            Object.keys(profileNotes).length > 0 ? profileNotes : null,
        }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      }
    } catch (err) {
      console.error("Failed to create student:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900">
              Add student
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <CameraCapture onExtracted={handleOcrExtracted} />

          {ocrFilled && (
            <p className="text-xs text-gray-400 -mt-2">
              Fields auto-filled from photo. Please review before saving.
            </p>
          )}

          {/* ═══ STUDENT INFO ═══ */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              Student info
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                First name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
                  ${ocrFilled && firstName ? "border-green-200 bg-green-50/30" : "border-gray-200"}
                  focus:border-gray-400 placeholder:text-gray-300`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Last name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pérez"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
                  ${ocrFilled && lastName ? "border-green-200 bg-green-50/30" : "border-gray-200"}
                  focus:border-gray-400 placeholder:text-gray-300`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="899 123 4567"
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
                ${ocrFilled && phone ? "border-green-200 bg-green-50/30" : "border-gray-200"}
                focus:border-gray-400 placeholder:text-gray-300`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle Principal #123, Col. Centro"
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
                ${ocrFilled && address ? "border-green-200 bg-green-50/30" : "border-gray-200"}
                focus:border-gray-400 placeholder:text-gray-300`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Birthdate
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
                ${ocrFilled && birthdate ? "border-green-200 bg-green-50/30" : "border-gray-200"}
                focus:border-gray-400 text-gray-700`}
            />
          </div>

          {/* ═══ CHURCH QUESTIONS ═══ */}
          {questions.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Church questions
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    {q.question}
                  </label>

                  {q.type === "select" && q.options ? (
                    <select
                      value={answers[q.id] || ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-gray-400 bg-white text-gray-700
                        ${ocrFilled && answers[q.id] ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
                    >
                      <option value="">Select...</option>
                      {(q.options as string[]).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : q.type === "boolean" ? (
                    <div className="flex gap-2">
                      {["Sí", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer(q.id, opt)}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            answers[q.id] === opt
                              ? ocrFilled
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answers[q.id] || ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      placeholder="Type answer..."
                      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-gray-400 placeholder:text-gray-300
                        ${ocrFilled && answers[q.id] ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {/* ═══ ASSIGNMENT ═══ */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              Assignment
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Schedule *
            </label>
            <select
              value={selectedSchedule}
              onChange={(e) => {
                setSelectedSchedule(e.target.value);
                setTableId("");
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700 bg-white"
            >
              <option value="">Select schedule...</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {selectedSchedule && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Table (Facilitator) *
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700 bg-white"
              >
                <option value="">Select table...</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.facilitator.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm px-5 py-4 border-t border-gray-100">
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !firstName.trim() || !lastName.trim() || !tableId || saving
              }
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg 
                         hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Add student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}