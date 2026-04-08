const TRANSLATIONS: Record<string, string> = {
  // Absent reasons
  SICK: "Enfermedad",
  WORK: "Trabajo",
  PERSONAL: "Personal",
  TRAVEL: "Viaje",
  OTHER: "Otro",
};

export function t(label: string): string {
  // Direct lookup (for enum values like SICK, WORK, etc.)
  if (TRANSLATIONS[label]) {
    return TRANSLATIONS[label];
  }

  // Fallback: replace day names inside longer strings (e.g. "Sunday 9:00 AM" → "Domingo 9:00 AM")
  return label
    .replace("Wednesday", "Miércoles")
    .replace("Sunday", "Domingo");
}