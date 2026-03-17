import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
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

    // Log raw OCR text for debugging
    console.log("─── OCR RAW TEXT ───");
    console.log(fullText);
    console.log("────────────────────");

    const result = parseRegistrationForm(fullText);

    console.log("─── PARSED RESULT ───");
    console.log(JSON.stringify(result, null, 2));
    console.log("─────────────────────");

    return NextResponse.json(result);
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}

// ─── LABEL-BASED PARSER ──────────────────────────────────
// Strategy: find known labels, then grab the VALUE on the next line(s).
// This avoids grabbing section headers like "Datos Personales" as names.

interface ParsedForm {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthdate?: string;
  address?: string;
  churchAnswers?: Record<string, string>;
}

function parseRegistrationForm(rawText: string): ParsedForm {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const result: ParsedForm = {};

  // ── Helper: find a label line and return the value on the NEXT line
  function getValueAfterLabel(labelPatterns: RegExp[]): string {
    for (let i = 0; i < lines.length - 1; i++) {
      const lower = lines[i].toLowerCase();
      for (const pattern of labelPatterns) {
        if (pattern.test(lower)) {
          // The value is on the next line
          const value = lines[i + 1]?.trim() ?? "";
          // Make sure the next line isn't another label or section header
          if (value && !isKnownLabel(value)) {
            return value;
          }
        }
      }
    }
    return "";
  }

  // ── Helper: find value on SAME line after a label (for "Label: Value" format)
  function getValueSameLine(labelPatterns: RegExp[]): string {
    for (const line of lines) {
      for (const pattern of labelPatterns) {
        const match = line.match(pattern);
        if (match && match[1]?.trim()) {
          return match[1].trim();
        }
      }
    }
    return "";
  }

  // ── Known labels/headers to skip when looking for values
  const SKIP_PATTERNS = [
    /^datos\s+personales$/i,
    /^preguntas?\s+de\s+la\s+iglesia$/i,
    /^church\s+questions?$/i,
    /^ficha\s+de\s+registro$/i,
    /^curso\s+de\s+discipulado/i,
    /^nombre/i,
    /^apellido/i,
    /^tel[eé]fono/i,
    /^fecha\s+de\s+nac/i,
    /^domicilio/i,
    /^direcci[oó]n/i,
    /^iglesia\s/i,
    /^(¿|quien|es\s+tu|has\s+sido|asistes|cu[aá]nto|tienes|c[oó]mo)/i,
  ];

  function isKnownLabel(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return SKIP_PATTERNS.some((p) => p.test(lower));
  }

  // ── 1. First Name
  const firstName =
    getValueAfterLabel([/^nombre\(?s?\)?$/i, /^nombre\(?s?\)?:/i, /^first\s*name/i]) ||
    getValueSameLine([/^nombre\(?s?\)?[:\s]\s*(.+)/i, /^first\s*name[:\s]\s*(.+)/i]);
  if (firstName) result.firstName = firstName;

  // ── 2. Last Name
  const lastName =
    getValueAfterLabel([/^apellido[s]?$/i, /^apellido[s]?:/i, /^last\s*name/i]) ||
    getValueSameLine([/^apellido[s]?[:\s]\s*(.+)/i, /^last\s*name[:\s]\s*(.+)/i]);
  if (lastName) result.lastName = lastName;

  // ── 3. If name wasn't found via labels, try to find "Nombre(s) Apellidos" on same line
  // but ONLY if it looks like actual name data (not a header)
  if (!result.firstName && !result.lastName) {
    // Look for the line after "Nombre" label that has the full name
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^nombre/i.test(lines[i].toLowerCase())) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !isKnownLabel(nextLine)) {
          const parts = nextLine.split(/\s+/);
          if (parts.length >= 2) {
            result.firstName = parts[0];
            result.lastName = parts.slice(1).join(" ");
          }
          break;
        }
      }
    }
  }

  // ── 4. Phone — look for 10-digit number, but prioritize lines near "Teléfono" label
  const phoneLabelValue = getValueAfterLabel([/^tel[eé]fono$/i, /^phone$/i]);
  if (phoneLabelValue) {
    const phoneMatch = phoneLabelValue.match(/\d{10}/);
    result.phone = phoneMatch ? phoneMatch[0] : phoneLabelValue.replace(/\D/g, "").slice(0, 10);
  }
  // Fallback: find any 10-digit number in the text
  if (!result.phone) {
    for (const line of lines) {
      const m = line.match(/\b(\d{10})\b/);
      if (m) {
        result.phone = m[1];
        break;
      }
    }
  }

  // ── 5. Birthdate — look near "Fecha de nacimiento" label
  const birthdateValue =
    getValueAfterLabel([
      /^fecha\s+de\s+nac/i,
      /^nacimiento$/i,
      /^birthdate$/i,
      /^fecha\s*nac/i,
    ]) ||
    getValueSameLine([
      /fecha\s+de\s+nacimiento[:\s]\s*(.+)/i,
      /birthdate[:\s]\s*(.+)/i,
    ]);

  if (birthdateValue) {
    result.birthdate = parseDate(birthdateValue);
  }
  // Fallback: find any date pattern near a "fecha" or "nac" keyword
  if (!result.birthdate) {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes("nac") || lower.includes("fecha")) {
        // Check this line and the next for a date
        for (let j = i; j <= Math.min(i + 1, lines.length - 1); j++) {
          const dateMatch = lines[j].match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
          if (dateMatch) {
            result.birthdate = parseDate(lines[j]);
            break;
          }
        }
        if (result.birthdate) break;
      }
    }
  }

  // ── 6. Address — look near "Domicilio" or "Dirección" label
  const address =
    getValueAfterLabel([
      /^domicilio\s*(completo)?$/i,
      /^direcci[oó]n\s*(completa)?$/i,
      /^address$/i,
    ]) ||
    getValueSameLine([
      /^domicilio\s*(?:completo)?[:\s]\s*(.+)/i,
      /^direcci[oó]n\s*(?:completa)?[:\s]\s*(.+)/i,
    ]);

  if (address && address.toLowerCase() !== "completo" && address.toLowerCase() !== "completa") {
    result.address = address;
  }
  // Fallback: look for lines containing typical address keywords
  if (!result.address) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      // Must contain address-like content, not just the label
      if (
        (lower.includes("calle") || lower.includes("col.") || lower.includes("colonia")) &&
        !lower.startsWith("domicilio") &&
        !lower.startsWith("direcci") &&
        line.length > 15
      ) {
        result.address = line;
        break;
      }
    }
  }

  // ── 7. Church Questions — match known question patterns
  const churchQuestions: [RegExp, string][] = [
    [/qui[eé]n\s+te\s+invit[oó]/i, "¿Quién te invitó al curso?"],
    [/primera\s+vez\s+en\s+la\s+iglesia/i, "¿Es tu primera vez en la iglesia?"],
    [/sido\s+bautizad/i, "¿Has sido bautizado(a)?"],
    [/asistes\s+regularmente/i, "¿Asistes regularmente a alguna iglesia?"],
    [/cu[aá]nto\s+tiempo\s+llevas/i, "¿Cuánto tiempo llevas asistiendo a la iglesia?"],
    [/petici[oó]n\s+de\s+oraci[oó]n/i, "¿Tienes alguna petición de oración?"],
    [/c[oó]mo\s+te\s+enteraste/i, "¿Cómo te enteraste del curso de discipulado?"],
  ];

  const answers: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    for (const [pattern, questionKey] of churchQuestions) {
      if (pattern.test(lines[i])) {
        // Grab the next line as the answer
        const answer = lines[i + 1]?.trim();
        if (answer && !isKnownLabel(answer) && answer !== "Answer...") {
          answers[questionKey] = answer;
        }
        break;
      }
    }
  }
  if (Object.keys(answers).length > 0) {
    result.churchAnswers = answers;
  }

  return result;
}

// ── Date parser (DD/MM/YYYY or MM/DD/YYYY) → YYYY-MM-DD
function parseDate(text: string): string {
  const match = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!match) return "";

  let a = parseInt(match[1]);
  let b = parseInt(match[2]);
  let year = parseInt(match[3]);

  if (year < 100) year += year > 50 ? 1900 : 2000;

  // In Mexico, dates are DD/MM/YYYY
  let day = a;
  let month = b;

  // If month > 12, it's probably MM/DD/YYYY (US format)
  if (month > 12 && day <= 12) {
    [day, month] = [month, day];
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}