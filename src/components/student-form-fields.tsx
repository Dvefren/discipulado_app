"use client";

import { useState } from "react";
import { Camera, Loader2, User, MapPin, Church, FileText } from "lucide-react";

export type StudentFormState = {
  // Datos personales
  firstName: string;
  lastName: string;
  birthdate: string;
  gender: "" | "MALE" | "FEMALE";
  maritalStatus: string;
  isMother: boolean | null;
  isFather: boolean | null;
  email: string;
  placeOfBirth: string;

  // Domicilio
  street: string;
  streetNumber: string;
  neighborhood: string;
  cellPhone: string;
  landlinePhone: string;
  educationLevel: string;
  workplace: string;
  livingSituation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Iglesia
  acceptedChrist: boolean | null;
  isBaptized: boolean | null;
  baptismDate: string;
  howArrivedToChurch: string;
  coursePurpose: string;
  prayerAddiction: string;

  // Testimonio
  testimony: string;

  // Metadata
  enrollmentDate: string;
};

export const emptyStudentForm: StudentFormState = {
  firstName: "", lastName: "", birthdate: "", gender: "",
  maritalStatus: "", isMother: null, isFather: null, email: "", placeOfBirth: "",
  street: "", streetNumber: "", neighborhood: "", cellPhone: "", landlinePhone: "",
  educationLevel: "", workplace: "", livingSituation: "",
  emergencyContactName: "", emergencyContactPhone: "",
  acceptedChrist: null, isBaptized: null, baptismDate: "",
  howArrivedToChurch: "", coursePurpose: "", prayerAddiction: "",
  testimony: "",
  enrollmentDate: "",
};

type Tab = "datos" | "domicilio" | "iglesia" | "testimonio";

const tabs: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "datos", label: "Datos", icon: User },
  { key: "domicilio", label: "Domicilio", icon: MapPin },
  { key: "iglesia", label: "Iglesia", icon: Church },
  { key: "testimonio", label: "Testimonio", icon: FileText },
];

// ── Reusable field primitives ────────────────────────────
const inputClass =
  "w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

function TextField({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={`${inputClass} resize-none`} />
    </div>
  );
}

function BoolToggle({ label, value, onChange }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        {[
          { val: true, text: "Sí" },
          { val: false, text: "No" },
        ].map(({ val, text }) => (
          <button
            key={text}
            type="button"
            onClick={() => onChange(value === val ? null : val)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-colors ${
              value === val
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main shared fields component ─────────────────────────
export function StudentFormFields({
  form, setForm, onScan, scanning, showScan,
}: {
  form: StudentFormState;
  setForm: (f: StudentFormState) => void;
  onScan?: (file: File) => void;
  scanning?: boolean;
  showScan?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("datos");

  function update<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div>
      {/* Scan button */}
      {showScan && onScan && (
        <div className="mb-4">
          <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {scanning ? "Escaneando formulario..." : "Escanear formulario con la cámara"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={scanning}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onScan(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Datos Personales ─── */}
      {tab === "datos" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Nombre" value={form.firstName} onChange={(v) => update("firstName", v)} required />
            <TextField label="Apellido" value={form.lastName} onChange={(v) => update("lastName", v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Fecha de nacimiento" type="date" value={form.birthdate} onChange={(v) => update("birthdate", v)} />
            <div>
              <label className={labelClass}>Sexo</label>
              <div className="flex gap-2">
                {[
                  { val: "MALE", text: "M" },
                  { val: "FEMALE", text: "F" },
                ].map(({ val, text }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update("gender", form.gender === val ? "" : (val as "MALE" | "FEMALE"))}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-colors ${
                      form.gender === val
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Estado civil" value={form.maritalStatus} onChange={(v) => update("maritalStatus", v)} placeholder="Soltero(a), Casado(a)..." />
            <TextField label="Lugar de nacimiento" value={form.placeOfBirth} onChange={(v) => update("placeOfBirth", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BoolToggle label="¿Es madre?" value={form.isMother} onChange={(v) => update("isMother", v)} />
            <BoolToggle label="¿Es padre?" value={form.isFather} onChange={(v) => update("isFather", v)} />
          </div>
          <TextField label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="nombre@ejemplo.com" />
          <TextField label="Fecha de ingreso al curso" type="date" value={form.enrollmentDate} onChange={(v) => update("enrollmentDate", v)} />
        </div>
      )}

      {/* ─── Domicilio ─── */}
      {tab === "domicilio" && (
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <TextField label="Calle" value={form.street} onChange={(v) => update("street", v)} />
            <div className="w-24">
              <TextField label="Número" value={form.streetNumber} onChange={(v) => update("streetNumber", v)} />
            </div>
          </div>
          <TextField label="Colonia" value={form.neighborhood} onChange={(v) => update("neighborhood", v)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Celular" type="tel" value={form.cellPhone} onChange={(v) => update("cellPhone", v)} placeholder="+52 868 000 0000" />
            <TextField label="Teléfono fijo" type="tel" value={form.landlinePhone} onChange={(v) => update("landlinePhone", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Nivel de escolaridad" value={form.educationLevel} onChange={(v) => update("educationLevel", v)} placeholder="Secundaria, Prepa..." />
            <TextField label="Lugar de trabajo" value={form.workplace} onChange={(v) => update("workplace", v)} />
          </div>
          <TextField label="¿Vive solo(a) o con familiares?" value={form.livingSituation} onChange={(v) => update("livingSituation", v)} placeholder="Con familia, Solo..." />
          <div className="border-t border-border/50 pt-3 mt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Contacto de emergencia</p>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Nombre" value={form.emergencyContactName} onChange={(v) => update("emergencyContactName", v)} />
              <TextField label="Teléfono" type="tel" value={form.emergencyContactPhone} onChange={(v) => update("emergencyContactPhone", v)} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Iglesia ─── */}
      {tab === "iglesia" && (
        <div className="space-y-3">
          <BoolToggle label="¿Ha aceptado a Cristo como su Señor y Salvador personal?" value={form.acceptedChrist} onChange={(v) => update("acceptedChrist", v)} />
          <div className="grid grid-cols-2 gap-3">
            <BoolToggle label="¿Ha sido bautizado?" value={form.isBaptized} onChange={(v) => update("isBaptized", v)} />
            <TextField label="Fecha de bautismo" type="date" value={form.baptismDate} onChange={(v) => update("baptismDate", v)} />
          </div>
          <TextField label="¿Cómo llegó a la iglesia?" value={form.howArrivedToChurch} onChange={(v) => update("howArrivedToChurch", v)} placeholder="Invitación de un amigo, familia..." />
          <TextField label="¿Cuál es el propósito de tomar este curso?" value={form.coursePurpose} onChange={(v) => update("coursePurpose", v)} />
          <TextField label="¿Adicción por la que podemos orar?" value={form.prayerAddiction} onChange={(v) => update("prayerAddiction", v)} />
        </div>
      )}

      {/* ─── Testimonio ─── */}
      {tab === "testimonio" && (
        <div className="space-y-3">
          <TextArea
            label="Testimonio"
            value={form.testimony}
            onChange={(v) => update("testimony", v)}
            placeholder="Comparte brevemente tu testimonio..."
            rows={8}
          />
        </div>
      )}
    </div>
  );
}

// ─── Helpers for parent components ─────────────────────
export function formToPayload(form: StudentFormState) {
  // Convert empty strings to undefined so the API doesn't clobber fields unnecessarily.
  // Keep nulls as-is (explicit "no value").
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    birthdate: form.birthdate || null,
    gender: form.gender || null,
    maritalStatus: form.maritalStatus.trim() || null,
    isMother: form.isMother,
    isFather: form.isFather,
    email: form.email.trim() || null,
    placeOfBirth: form.placeOfBirth.trim() || null,
    street: form.street.trim() || null,
    streetNumber: form.streetNumber.trim() || null,
    neighborhood: form.neighborhood.trim() || null,
    cellPhone: form.cellPhone.trim() || null,
    landlinePhone: form.landlinePhone.trim() || null,
    educationLevel: form.educationLevel.trim() || null,
    workplace: form.workplace.trim() || null,
    livingSituation: form.livingSituation.trim() || null,
    emergencyContactName: form.emergencyContactName.trim() || null,
    emergencyContactPhone: form.emergencyContactPhone.trim() || null,
    acceptedChrist: form.acceptedChrist,
    isBaptized: form.isBaptized,
    baptismDate: form.baptismDate || null,
    howArrivedToChurch: form.howArrivedToChurch.trim() || null,
    coursePurpose: form.coursePurpose.trim() || null,
    prayerAddiction: form.prayerAddiction.trim() || null,
    testimony: form.testimony.trim() || null,
    enrollmentDate: form.enrollmentDate || null,
  };
}

// Build initial form state from an existing student (for edit mode)
export function studentToForm(s: any): StudentFormState {
  return {
    firstName: s.firstName || "",
    lastName: s.lastName || "",
    birthdate: s.birthdate ? s.birthdate.split("T")[0] : "",
    gender: s.gender || "",
    maritalStatus: s.maritalStatus || "",
    isMother: s.isMother ?? null,
    isFather: s.isFather ?? null,
    email: s.email || "",
    placeOfBirth: s.placeOfBirth || "",
    street: s.street || "",
    streetNumber: s.streetNumber || "",
    neighborhood: s.neighborhood || "",
    cellPhone: s.cellPhone || "",
    landlinePhone: s.landlinePhone || "",
    educationLevel: s.educationLevel || "",
    workplace: s.workplace || "",
    livingSituation: s.livingSituation || "",
    emergencyContactName: s.emergencyContactName || "",
    emergencyContactPhone: s.emergencyContactPhone || "",
    acceptedChrist: s.acceptedChrist ?? null,
    isBaptized: s.isBaptized ?? null,
    baptismDate: s.baptismDate ? s.baptismDate.split("T")[0] : "",
    howArrivedToChurch: s.howArrivedToChurch || "",
    coursePurpose: s.coursePurpose || "",
    prayerAddiction: s.prayerAddiction || "",
    testimony: s.testimony || "",
    enrollmentDate: s.enrollmentDate ? s.enrollmentDate.split("T")[0] : "",
  };
}