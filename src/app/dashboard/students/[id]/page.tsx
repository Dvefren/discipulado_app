import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import StudentProfileClient from "@/components/student-profile-client";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      table: {
        include: {
          facilitator: true,
          schedule: true,
        },
      },
      attendance: {
        include: {
          class: true,
        },
        orderBy: { class: { date: "asc" } },
      },
    },
  });

  if (!student) return notFound();

  // Fetch active profile questions
  let questions: any[] = [];
  try {
    questions = await prisma.profileQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  } catch {
    // ProfileQuestion table might not exist yet
    questions = [];
  }

  // Serialize dates for client component
  const serializedStudent = {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    phone: student.phone,
    address: student.address,
    birthdate: student.birthdate?.toISOString() || null,
    profileNotes: (student.profileNotes as Record<string, string>) || {},
    createdAt: student.createdAt.toISOString(),
    schedule: student.table?.schedule.label ?? "Por definir",
    tableName: student.table?.name ?? "Por definir",
    facilitator: student.table?.facilitator.name ?? "Por definir",
    attendance: student.attendance.map((a: any) => ({
      id: a.id,
      status: a.status ?? (a.present ? "PRESENT" : "ABSENT"),
      absentReason: a.absentReason ?? null,
      className: a.class.name,
      classDate: a.class.date.toISOString(),
      topic: a.class.topic,
    })),
  };

  const serializedQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type,
    options: q.options,
  }));

  return (
    <div>
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to students
      </Link>

      <StudentProfileClient
        student={serializedStudent}
        questions={serializedQuestions}
      />
    </div>
  );
}