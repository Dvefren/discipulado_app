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
      { error: "Google Cloud API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image or mimeType" },
        { status: 400 }
      );
    }

    const visionResponse = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: image },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    });

    const visionData = await visionResponse.json();

    if (!visionResponse.ok) {
      console.error("Vision API error:", visionData);
      return NextResponse.json(
        { error: "Failed to process image with Vision API" },
        { status: 500 }
      );
    }

    const fullText =
      visionData.responses?.[0]?.fullTextAnnotation?.text || "";

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "No text found in the image. Please try a clearer photo." },
        { status: 422 }
      );
    }

    console.log("─── OCR RAW TEXT ───");
    console.log(fullText);
    console.log("────────────────────");

    const result = parseRegistrationForm(fullText);

    console.log("─── PARSED RESULT ───");
    console.log(result);
    console.log("─────────────────────");

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}

/**
 * Parses raw OCR text from a church registration form.
 * 
 * Google Vision returns text in visual reading order, which means
 * multi-column layouts get jumbled. This parser scans ALL lines
 * looking for label→value pairs regardless of position.
 */
function parseRegistrationForm(text: string): {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  birthdate: string;
  churchAnswers: Record<string, string>;
} {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let firstName = "";
  let lastName = "";
  let firstPhone = "";
  let address = "";
  let birthdate = "";
  const churchAnswers: Record<string, string> = {};

  // Collect ALL phones — first one is the student's, second is emergency
  const allPhones: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
    const nextLower = nextLine.toLowerCase();

    // ─── FIRST NAME ───
    if (!firstName && isNameLabel(lower)) {
      if (nextLine && !isAnyLabel(nextLower)) {
        firstName = capitalizeWords(nextLine);
      }
    }

    // ─── LAST NAME ───
    if (!lastName && lower.includes("apellido")) {
      if (nextLine && !isAnyLabel(nextLower)) {
        lastName = capitalizeWords(nextLine);
      }
    }

    // ─── PHONE (collect all) ───
    if (
      lower.includes("telefono") ||
      lower.includes("teléfono") ||
      lower.includes("celular") ||
      lower.match(/^tel\.?\s*$/)
    ) {
      if (nextLine) {
        const extracted = extractPhoneNumber(nextLine);
        if (extracted) allPhones.push(extracted);
      }
    }

    // ─── ADDRESS ───
    if (
      !address &&
      (lower.includes("direccion") ||
        lower.includes("dirección") ||
        lower.includes("domicilio"))
    ) {
      // Skip label words like "completa" — look for the actual address value
      if (nextLine && !isAnyLabel(nextLower) && !isJunkValue(nextLine)) {
        // Check if next line looks like an address (has numbers, commas, or #)
        if (looksLikeAddress(nextLine)) {
          address = nextLine;
        } else {
          // Try the line after
          const lineAfter = i + 2 < lines.length ? lines[i + 2] : "";
          if (lineAfter && looksLikeAddress(lineAfter)) {
            address = lineAfter;
          }
        }
      }
    }

    // ─── BIRTHDATE ───
    if (
      !birthdate &&
      (lower.includes("nacimiento") ||
        lower.includes("fecha de nac") ||
        lower.includes("f. nac"))
    ) {
      if (nextLine) {
        const parsed = parseDateToISO(nextLine);
        if (parsed) birthdate = parsed;
      }
    }

    // ─── CHURCH QUESTIONS ───

    // "Es miembro de la iglesia?" → look for X/✓ next to Si/No
    if (lower.includes("miembro de la iglesia")) {
      const answer = findCheckboxAnswer(lines, i);
      if (answer) churchAnswers["q_member"] = answer;
    }

    // "Ha sido bautizado?" 
    if (lower.includes("bautizado")) {
      const answer = findCheckboxAnswer(lines, i);
      if (answer) churchAnswers["q_baptized"] = answer;
    }

    // "Quien te invito?"
    if (lower.includes("quien te invit") || lower.includes("quién te invit")) {
      if (nextLine && !isAnyLabel(nextLower)) {
        churchAnswers["q_invited"] = nextLine;
      }
    }

    // "Como te enteraste del curso?"
    if (lower.includes("como te enteraste") || lower.includes("cómo te enteraste")) {
      if (nextLine && !isAnyLabel(nextLower)) {
        churchAnswers["q_how_heard"] = nextLine;
      }
    }
  }

  // First phone = student's phone, second = emergency
  if (allPhones.length > 0) {
    firstPhone = allPhones[0];
  }

  // ─── FALLBACK: date anywhere ───
  if (!birthdate) {
    const dateMatch = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
    if (dateMatch) {
      birthdate = parseDateToISO(dateMatch[0]);
    }
  }

  return {
    firstName,
    lastName,
    phone: firstPhone,
    address,
    birthdate,
    churchAnswers,
  };
}

// ─── LABEL DETECTION ───

function isNameLabel(lower: string): boolean {
  return (
    (lower.includes("nombre") &&
      !lower.includes("completo") &&
      !lower.includes("apellido") &&
      !lower.includes("emergencia")) ||
    lower === "nombre(s)" ||
    lower === "nombre (s)" ||
    lower === "nombres"
  );
}

function isAnyLabel(lower: string): boolean {
  const labels = [
    "nombre", "apellido", "telefono", "teléfono", "direccion",
    "dirección", "domicilio", "fecha", "correo", "email",
    "firma", "parentesco", "emergencia", "miembro", "bautiz",
    "datos personales", "informacion", "contacto", "celular",
    "como te enteraste", "quien te invit", "quién te invit",
    "es miembro", "ha sido", "iglesia de cristo",
    "ficha de registro", "favor de llenar",
  ];
  return labels.some((l) => lower.startsWith(l) || lower.includes(l));
}

function isJunkValue(value: string): boolean {
  const lower = value.toLowerCase().trim();
  const junk = [
    "completa", "completo", "electronico", "electrónico",
    "de emergencia", "de nacimiento", "obligatorio",
    "si", "no", "en proceso",
  ];
  return junk.includes(lower) || lower.length < 2;
}

function looksLikeAddress(str: string): boolean {
  // Addresses typically have: numbers, commas, #, Col., Calle, Ave, etc.
  return (
    str.length > 10 &&
    (/\d/.test(str) || str.includes(",") || str.includes("#") ||
      /col\./i.test(str) || /calle/i.test(str) || /ave/i.test(str) ||
      /blvd/i.test(str) || /fracc/i.test(str))
  );
}

// ─── CHECKBOX ANSWER DETECTION ───

function findCheckboxAnswer(lines: string[], labelIndex: number): string {
  // Look at the next few lines for patterns like "X Si", "✓ Si", "× No"
  for (let j = labelIndex + 1; j < Math.min(labelIndex + 5, lines.length); j++) {
    const line = lines[j].trim();
    const lower = line.toLowerCase();

    // Stop if we hit another question or section
    if (isAnyLabel(lower) && !lower.startsWith("x ") && !lower.startsWith("× ")) {
      break;
    }

    // Check for "X Si", "× Si", "✓ Si", etc.
    if (/^[x×✓✔☑]\s*(si|sí)/i.test(line)) {
      return "Sí";
    }
    if (/^[x×✓✔☑]\s*no/i.test(line)) {
      return "No";
    }
    if (/^[x×✓✔☑]\s*en proceso/i.test(line)) {
      return "En proceso";
    }
  }
  return "";
}

// ─── TEXT UTILITIES ───

function capitalizeWords(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractPhoneNumber(str: string): string {
  const cleaned = str.replace(/[^\d\s\-()]/g, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 7) return cleaned;
  return "";
}

function parseDateToISO(str: string): string {
  const match = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!match) return "";

  let day = parseInt(match[1]);
  let month = parseInt(match[2]);
  let year = parseInt(match[3]);

  if (year < 100) year += year > 50 ? 1900 : 2000;
  if (month > 12 && day <= 12) [day, month] = [month, day];
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}