import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

// 🛡️ Límites de archivo
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 🛡️ Config de rate limit para OCR: 30 escaneos por hora
const OCR_RATE_LIMIT = {
  maxAttempts: 30,
  windowMs: 60 * 60 * 1000,        // 1 hora
  blockDurationMs: 60 * 60 * 1000, // bloqueo de 1 hora si excede
};

export async function POST(req: NextRequest) {
  // 🛡️ Auth
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;
  const key = `ocr:${userId}`;

  // 🛡️ Rate limit por usuario
  const { allowed, remainingAttempts, retryAfterMs } = await checkRateLimit(key, OCR_RATE_LIMIT);

  if (!allowed) {
    const minutes = Math.ceil((retryAfterMs || 0) / 60000);
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de escaneos por hora. Intenta de nuevo en ${minutes} minutos.`,
        retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 🛡️ Verificar que el OCR esté configurado
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image");

    // 🛡️ Validar que es un File
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 🛡️ Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato no soportado. Usa: ${ALLOWED_MIME_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // 🛡️ Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `La imagen es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const visionRes = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });

    const visionData = await visionRes.json();

    if (!visionRes.ok) {
      console.error("Vision API error:", visionData);
      return NextResponse.json(
        { error: "Failed to process image with Vision API" },
        { status: 500 }
      );
    }

    const fullText: string =
      visionData.responses?.[0]?.fullTextAnnotation?.text ?? "";

    if (!fullText) {
      return NextResponse.json(
        { error: "No text found in the image. Please try a clearer photo." },
        { status: 422 }
      );
    }

    // 🛡️ En producción, evitar logs sensibles
    if (process.env.NODE_ENV !== "production") {
      console.log("─── OCR RAW TEXT ───");
      console.log(fullText);
      console.log("────────────────────");
    }

    const result = parseAlianzaForm(fullText);

    if (process.env.NODE_ENV !== "production") {
      console.log("─── PARSED RESULT ───");
      console.log(JSON.stringify(result, null, 2));
      console.log("─────────────────────");
    }

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(remainingAttempts),
      },
    });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}

// ─── PARSER ──────────────────────────────────────────────
// (todo el parser desde aquí queda EXACTAMENTE IGUAL)
// (interface ParsedForm, KNOWN_LABELS, isLabel, stripLabel, findValue,
//  findEmail, findValueNearby, parseBool, parseDate, extractPhone,
//  splitName, parseAlianzaForm)

// ─── PARSER ──────────────────────────────────────────────
// Tuned for the Alianza Cristiana Reynosa registration form.

interface ParsedForm {
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  maritalStatus?: string;
  isMother?: boolean;
  isFather?: boolean;
  email?: string;
  placeOfBirth?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  cellPhone?: string;
  landlinePhone?: string;
  educationLevel?: string;
  workplace?: string;
  livingSituation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  howArrivedToChurch?: string;
  coursePurpose?: string;
  prayerAddiction?: string;
  testimony?: string;
  enrollmentDate?: string;
}

// Labels that mark sections or other fields — used to know where a value ends
// and what lines should be skipped when searching for a value.
const KNOWN_LABELS = [
  /^alianza cristiana/i,
  /^solicitud de inscripcion/i,
  /^el comienzo de una nueva/i,
  /^facilitador:?$/i,
  /^fecha de ingreso:?$/i,
  /^datos$/i,
  /^nombre completo:?/i,
  /^edad$/i,
  /^fecha de nacimiento:?$/i,
  /^estado civil$/i,
  /^sexo/i,
  /^mascino/i,
  /^masculino/i,
  /^femenino/i,
  /^es mam[aá]\??/i,
  /^es pap[aá]\??/i,
  /^e-?mail:?$/i,
  /^domicilio$/i,
  /^calle$/i,
  /^numero$/i,
  /^colonia$/i,
  /^lugar de nacimiento:?$/i,
  /^num\.? de tel\.?celular$/i,
  /^num\.?telefono$/i,
  /^nivel de escolaridad$/i,
  /^lugar de trabajo$/i,
  /^vive solo o con familiares\??/i,
  /^nombre completo de su contacto/i,
  /^de emergencia:?$/i,
  /^_?num\.? de telefono:?/i,
  /^iglesia$/i,
  /^ha aceptado a cristo/i,
  /^ha sido bautizado/i,
  /^c[oó]mo llego a la iglesia/i,
  /^como llego a la iglesia/i,
  /^cu[aá]l es el proposito/i,
  /^este curso\s*\??$/i,
  /^cu[aá]l es la adiccion/i,
  /^la que podemos orar/i,
  /^testimonio:?$/i,
  /^seleccione el horario/i,
  /^miercoles/i,
  /^domingo/i,
  /^marque/i,
  /^de modo que si alguno/i,
  /^viejas pasaron/i,
  /^qsoarchi$/i,
];

function isLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return KNOWN_LABELS.some((r) => r.test(trimmed));
}

// Strip a label prefix from a line if present.
function stripLabel(line: string, labelPatterns: RegExp[]): string {
  for (const p of labelPatterns) {
    const m = line.match(p);
    if (m) return line.slice(m[0].length).replace(/^[:\s]+/, "").trim();
  }
  return line.trim();
}

// Find a value for a label. Searches:
// 1. Same line after the label (e.g. "ES PAPÁ? no" → "no")
// 2. Next non-label lines forward
//
// If `skipLabels` is true, we walk through intermediate labels looking for
// the next non-label line. This handles cases where Vision reorders lines
// spatially, putting related labels between a label and its value.
function findValue(
  lines: string[],
  labelPatterns: RegExp[],
  opts: {
    multiline?: boolean;
    maxLines?: number;
    searchRange?: number; // how many lines forward to scan
  } = {}
): string {
  const { multiline = false, maxLines = 1, searchRange = 1 } = opts;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    for (const pattern of labelPatterns) {
      if (pattern.test(lower)) {
        // Try same-line value first
        const sameLineValue = stripLabel(line, labelPatterns);
        if (sameLineValue && !isLabel(sameLineValue)) {
          return sameLineValue;
        }

        // Walk forward up to `searchRange` lines
        const collected: string[] = [];
        let scanned = 0;
        for (let j = i + 1; j < lines.length && scanned < searchRange; j++) {
          const next = lines[j].trim();
          if (!next) continue;
          scanned++;
          if (isLabel(next)) continue; // SKIP intermediate labels
          collected.push(next);
          if (collected.length >= maxLines) break;
          if (!multiline) break;
        }
        if (collected.length > 0) return collected.join(" ").trim();
      }
    }
  }
  return "";
}

// Find the nearest email anywhere in the text (more reliable than label proximity).
function findEmail(lines: string[]): string {
  for (const line of lines) {
    const m = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) return m[0];
  }
  return "";
}

// Find a value that appears NEAR a label but possibly before it in OCR order.
// Scans a window around the label's position.
function findValueNearby(
  lines: string[],
  labelPatterns: RegExp[],
  windowBefore: number = 3,
  windowAfter: number = 3
): string {
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (labelPatterns.some((p) => p.test(lower))) {
      // Look backward first (Vision sometimes puts answer above question)
      for (let j = Math.max(0, i - windowBefore); j < i; j++) {
        const candidate = lines[j].trim();
        if (candidate && !isLabel(candidate)) return candidate;
      }
      // Then forward
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + windowAfter); j++) {
        const candidate = lines[j].trim();
        if (candidate && !isLabel(candidate)) return candidate;
      }
    }
  }
  return "";
}

function parseBool(value: string): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if (/^s[ií]$/i.test(lower) || lower === "si") return true;
  if (lower === "no") return false;
  return undefined;
}

// ── Date parser — Alianza form uses DD/MM/YYYY or "12 Abril 2026"
function parseDate(text: string): string {
  if (!text) return "";

  const slash = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (slash) {
    let day = parseInt(slash[1]);
    let month = parseInt(slash[2]);
    let year = parseInt(slash[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    if (month < 1 || month > 12 || day < 1 || day > 31) return "";
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  const monthMap: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  const named = text.match(/(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})/i);
  if (named) {
    const day = parseInt(named[1]);
    const monthName = named[2].toLowerCase();
    const year = parseInt(named[3]);
    const month = monthMap[monthName];
    if (month && day >= 1 && day <= 31) {
      return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  return "";
}

function extractPhone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

function splitName(full: string): { firstName: string; lastName: string } {
  const cleaned = full
    .replace(/^completo:?\s*/i, "")
    .replace(/^nombre\s*/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  if (parts.length === 3) {
    return { firstName: parts[0], lastName: `${parts[1]} ${parts[2]}` };
  }
  return {
    firstName: `${parts[0]} ${parts[1]}`,
    lastName: parts.slice(2).join(" "),
  };
}

function parseAlianzaForm(rawText: string): ParsedForm {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: ParsedForm = {};

  // ── Full name
  const fullName = findValue(lines, [/^nombre completo:?/i]);
  if (fullName) {
    const { firstName, lastName } = splitName(fullName);
    if (firstName) result.firstName = firstName;
    if (lastName) result.lastName = lastName;
  }

  // ── Enrollment date
  const enrollmentRaw = findValue(lines, [/^fecha de ingreso:?$/i], { searchRange: 3 });
  if (enrollmentRaw) {
    const d = parseDate(enrollmentRaw);
    if (d) result.enrollmentDate = d;
  }

  // ── Birthdate
  const birthRaw = findValue(lines, [/^fecha de nacimiento:?$/i], { searchRange: 3 });
  if (birthRaw) {
    const d = parseDate(birthRaw);
    if (d) result.birthdate = d;
  }

  // ── Marital status
  const marital = findValue(lines, [/^estado civil$/i], { searchRange: 3 });
  if (marital) result.maritalStatus = marital;

  // ── Es mamá? / Es papá? — value often on same line after the ?
  // Expand regex to allow matches anywhere the label starts
  const momLine = lines.find((l) => /^es mam[aá]/i.test(l));
  if (momLine) {
    // Extract whatever comes after "ES MAMA?" or "ES MAMA? " on the same line
    const m = momLine.match(/^es mam[aá]\??\s*(.*)$/i);
    const sameLine = m?.[1]?.trim();
    if (sameLine && !isLabel(sameLine)) {
      const b = parseBool(sameLine);
      if (b !== undefined) result.isMother = b;
    } else {
      // Look at next non-label line
      const idx = lines.indexOf(momLine);
      for (let j = idx + 1; j < Math.min(idx + 3, lines.length); j++) {
        if (!isLabel(lines[j])) {
          const b = parseBool(lines[j]);
          if (b !== undefined) { result.isMother = b; break; }
        }
      }
    }
  }

  const dadLine = lines.find((l) => /^es pap[aá]/i.test(l));
  if (dadLine) {
    const m = dadLine.match(/^es pap[aá]\??\s*(.*)$/i);
    const sameLine = m?.[1]?.trim();
    if (sameLine && !isLabel(sameLine)) {
      const b = parseBool(sameLine);
      if (b !== undefined) result.isFather = b;
    } else {
      const idx = lines.indexOf(dadLine);
      for (let j = idx + 1; j < Math.min(idx + 3, lines.length); j++) {
        if (!isLabel(lines[j])) {
          const b = parseBool(lines[j]);
          if (b !== undefined) { result.isFather = b; break; }
        }
      }
    }
  }

  // ── Email — just find anywhere in the text
  const email = findEmail(lines);
  if (email) result.email = email;

  // ── Street / Number / Colonia
  const calle = findValue(lines, [/^calle$/i]);
  if (calle) result.street = calle;

  const numero = findValue(lines, [/^numero$/i]);
  if (numero && /^\d+/.test(numero)) result.streetNumber = numero;

  const colonia = findValue(lines, [/^colonia$/i]);
  if (colonia) result.neighborhood = colonia;

  // ── Place of birth — search wider range (Vision reorders columns)
  // Reject anything that looks like a phone number or starts with a digit.
  const pob = findValue(lines, [/^lugar de nacimiento:?$/i], { searchRange: 6 });
  if (pob && !/\d{4,}/.test(pob) && !/^bop/i.test(pob)) {
    result.placeOfBirth = pob;
  }

  // ── Cell phone — look wider, extract best-effort
  const cellRaw = findValue(lines, [/^num\.? de tel\.?celular$/i], { searchRange: 3 });
  const cell = extractPhone(cellRaw);
  if (cell) result.cellPhone = cell;

  // ── Landline
  const landRaw = findValue(lines, [/^num\.?telefono$/i], { searchRange: 3 });
  const land = extractPhone(landRaw);
  if (land) result.landlinePhone = land;

  // ── Education level
  const edu = findValue(lines, [/^nivel de escolaridad$/i], { searchRange: 3 });
  if (edu) result.educationLevel = edu;

  // ── Workplace
  const work = findValue(lines, [/^lugar de trabajo$/i], { searchRange: 3 });
  if (work) result.workplace = work;

  // ── Living situation
  const living = findValue(lines, [/^vive solo o con familiares\??/i], { searchRange: 3 });
  if (living) result.livingSituation = living;

  // ── Emergency contact name
  // The label often spans two lines: "NOMBRE COMPLETO DE SU CONTACTO" + "DE EMERGENCIA:"
  // The actual name (if filled) comes after both. Skip intermediate labels.
  const emergencyName = findValue(
    lines,
    [/^nombre completo de su contacto/i],
    { searchRange: 4 }
  );
  // Only accept if it's not itself a label fragment
  if (emergencyName && !/^de emergencia/i.test(emergencyName)) {
    result.emergencyContactName = emergencyName;
  }

  // ── Emergency phone — find the LAST 10-digit number in the text
  // (first is usually cell phone or landline)
  let emergencyPhone = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const digits = lines[i].replace(/\D/g, "");
    if (digits.length >= 10) {
      emergencyPhone = digits.slice(-10);
      break;
    }
  }
  if (emergencyPhone && emergencyPhone !== result.cellPhone && emergencyPhone !== result.landlinePhone) {
    result.emergencyContactPhone = emergencyPhone;
  }

  // ── Church section
  // The OCR output for this form reads:
  //   HA ACEPTADO A CRISTO...?           (no answer — checkbox)
  //   HA SIDO BAUTIZADO...?              (no answer — checkbox)
  //   <howArrived answer>                ← before its question due to spatial order
  //   COMO LLEGO A LA IGLESIA?
  //   CUÁL ES EL PROPOSITO DE TOMAR ESTE CURSO ?
  //   <purpose answer>                   ← after the question
  //   CUÁL ES LA ADICCION POR...?
  //   <addiction answer, possibly multi-line>
  //   TESTIMONIO:
  //
  // Strategy: find each label's index, then grab the nearest non-label line
  // BEFORE howArrived, AFTER purpose, AFTER addiction.

  const findLabelIndex = (patterns: RegExp[]) => {
    for (let i = 0; i < lines.length; i++) {
      if (patterns.some((p) => p.test(lines[i]))) return i;
    }
    return -1;
  };

  const howArrivedIdx = findLabelIndex([/^c[oó]mo llego a la iglesia/i, /^como llego a la iglesia/i]);
  const purposeIdx = findLabelIndex([/^cu[aá]l es el proposito/i]);
  const addictionIdx = findLabelIndex([/^cu[aá]l es la adiccion/i]);
  const testimonyIdx = findLabelIndex([/^testimonio:?$/i]);

  // howArrived: scan backward from its label, grab first non-label line.
  if (howArrivedIdx !== -1) {
    for (let j = howArrivedIdx - 1; j >= Math.max(0, howArrivedIdx - 4); j--) {
      const candidate = lines[j].trim();
      if (candidate && !isLabel(candidate)) {
        result.howArrivedToChurch = candidate;
        break;
      }
    }
  }

  // coursePurpose: scan forward from its label, skipping labels,
  // stop before addictionIdx.
  if (purposeIdx !== -1) {
    const stopAt = addictionIdx !== -1 ? addictionIdx : lines.length;
    for (let j = purposeIdx + 1; j < stopAt; j++) {
      const candidate = lines[j].trim();
      if (candidate && !isLabel(candidate)) {
        // Guard: don't reuse howArrivedToChurch's answer
        if (candidate !== result.howArrivedToChurch) {
          result.coursePurpose = candidate;
          break;
        }
      }
    }
  }

  // prayerAddiction: scan forward from its label, multi-line until testimonyIdx.
  if (addictionIdx !== -1) {
    const stopAt = testimonyIdx !== -1 ? testimonyIdx : lines.length;
    const collected: string[] = [];
    for (let j = addictionIdx + 1; j < stopAt; j++) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (isLabel(candidate)) continue;
      if (candidate === result.coursePurpose) continue;
      collected.push(candidate);
    }
    if (collected.length > 0) {
      result.prayerAddiction = collected.join(" ");
    }
  }

  // ── Testimonio (multi-line, up to 5 lines)
  const testimony = findValue(
    lines,
    [/^testimonio:?$/i],
    { multiline: true, maxLines: 5, searchRange: 6 }
  );
  if (testimony) result.testimony = testimony;

  return result;
}