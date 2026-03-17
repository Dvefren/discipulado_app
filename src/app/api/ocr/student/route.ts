import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OCR not configured" }, { status: 500 });
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
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
      }
    );

    const visionData = await visionRes.json();
    const fullText: string =
      visionData.responses?.[0]?.fullTextAnnotation?.text ?? "";

    if (!fullText) {
      return NextResponse.json({});
    }

    // Parse extracted text into fields
    const lines = fullText.split("\n").map((l: string) => l.trim()).filter(Boolean);

    const extracted: Record<string, string> = {};

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (!extracted.firstName && !extracted.lastName) {
        const nameMatch = line.match(/^([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ\s]+)$/);
        if (nameMatch) {
          extracted.firstName = nameMatch[1];
          extracted.lastName  = nameMatch[2].trim();
        }
      }

      if (!extracted.phone && /\b\d{10}\b/.test(line)) {
        extracted.phone = line.match(/\b\d{10}\b/)?.[0] ?? "";
      }

      if (!extracted.birthdate) {
        const dateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
        if (dateMatch && (lower.includes("nac") || lower.includes("fecha") || lower.includes("birth"))) {
          const [, d, m, y] = dateMatch;
          extracted.birthdate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
      }

      if (!extracted.address && (lower.includes("calle") || lower.includes("col") || lower.includes("colonia") || lower.includes("domicilio"))) {
        extracted.address = line.replace(/^(calle|col\.?|colonia|domicilio):?\s*/i, "").trim();
      }
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}