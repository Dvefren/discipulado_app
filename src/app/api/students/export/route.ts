import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Escape a value for CSV (handle commas, quotes, newlines)
function escapeCsv(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "SCHEDULE_LEADER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Optional schedule filter via query param ────────────
  const { searchParams } = new URL(request.url);
  const scheduleFilter = searchParams.get("schedule"); // schedule label or "all"

  // ── Fetch data ──────────────────────────────────────────
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
        include: {
          tables: {
            orderBy: { name: "asc" },
            include: {
              facilitator: true,
              students: {
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "No active course" }, { status: 404 });
  }

  // ── Build rows ──────────────────────────────────────────
  const headers = [
    "First Name",
    "Last Name",
    "Phone",
    "Address",
    "Schedule",
    "Facilitator",
    "Table",
  ];

  // Check if any student has profileNotes to add dynamic columns
  const allStudents: Record<string, string>[] = [];
  const profileKeys = new Set<string>();

  for (const schedule of course.schedules) {
    if (scheduleFilter && scheduleFilter !== "all" && schedule.label !== scheduleFilter) {
      continue;
    }

    for (const table of schedule.tables) {
      for (const student of table.students) {
        const row: Record<string, string> = {
          "First Name": student.firstName,
          "Last Name": student.lastName,
          Phone: student.phone || "",
          Address: student.address || "",
          Schedule: schedule.label,
          Facilitator: table.facilitator.name,
          Table: table.name,
        };

        // Flatten profileNotes JSON into columns
        if (student.profileNotes && typeof student.profileNotes === "object") {
          const notes = student.profileNotes as Record<string, any>;
          for (const [key, value] of Object.entries(notes)) {
            const colName = key;
            profileKeys.add(colName);
            row[colName] = String(value ?? "");
          }
        }

        allStudents.push(row);
      }
    }
  }

  // Merge dynamic profile columns into headers
  const sortedProfileKeys = [...profileKeys].sort();
  const allHeaders = [...headers, ...sortedProfileKeys];

  // ── Generate CSV string ─────────────────────────────────
  const csvLines: string[] = [];

  // Header row
  csvLines.push(allHeaders.map(escapeCsv).join(","));

  // Data rows
  for (const student of allStudents) {
    const row = allHeaders.map((h) => escapeCsv(student[h] || ""));
    csvLines.push(row.join(","));
  }

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csvContent = bom + csvLines.join("\n");

  // ── Build filename ──────────────────────────────────────
  const date = new Date().toISOString().split("T")[0];
  const scheduleSlug = scheduleFilter && scheduleFilter !== "all"
    ? `_${scheduleFilter.replace(/\s+/g, "-").toLowerCase()}`
    : "";
  const filename = `students${scheduleSlug}_${date}.csv`;

  // ── Return response ─────────────────────────────────────
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}