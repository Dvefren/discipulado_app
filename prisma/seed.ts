import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ScheduleDay } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Find the first occurrence of a weekday on or after a given date
// weekday: 0=Sun, 1=Mon, ..., 3=Wed, 6=Sat
function findFirstDay(startDate: Date, weekday: number): Date {
  const d = new Date(startDate);
  while (d.getDay() !== weekday) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── CLEAN EXISTING DATA ───────────────────────────────
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.facilitatorTable.deleteMany();
  await prisma.class.deleteMany();
  await prisma.secretary.deleteMany();
  await prisma.scheduleLeader.deleteMany();
  await prisma.facilitator.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓ Cleaned existing data");

  // ─── ADMIN USER ────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@discipulado.app",
      password: "$2b$10$placeholder_hash_replace_later",
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("✓ Admin user created");

  // ─── COURSE ────────────────────────────────────────────
  const courseStartDate = new Date("2026-01-01");
  const course = await prisma.course.create({
    data: {
      name: "Course 1 - 2026",
      year: 2026,
      semester: 1,
      startDate: courseStartDate,
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });
  console.log("✓ Course created: Course 1 - 2026");

  // ─── SCHEDULES ─────────────────────────────────────────
  const scheduleData: {
    day: ScheduleDay;
    time: string;
    label: string;
    weekday: number; // JS weekday: 0=Sun, 3=Wed
  }[] = [
    { day: "WEDNESDAY", time: "19:00", label: "Wednesday 7:00 PM", weekday: 3 },
    { day: "SUNDAY", time: "09:00", label: "Sunday 9:00 AM", weekday: 0 },
    { day: "SUNDAY", time: "11:00", label: "Sunday 11:00 AM", weekday: 0 },
    { day: "SUNDAY", time: "13:00", label: "Sunday 1:00 PM", weekday: 0 },
  ];

  const schedules: Record<string, { id: string; weekday: number }> = {};
  for (const s of scheduleData) {
    const schedule = await prisma.schedule.create({
      data: {
        day: s.day,
        time: s.time,
        label: s.label,
        courseId: course.id,
      },
    });
    schedules[s.label] = { id: schedule.id, weekday: s.weekday };
  }
  console.log("✓ 4 schedules created");

  // ─── CLASSES (same 21 for each schedule, correct weekdays) ─
  const classNames = [
    "Introducción",
    "El comienzo de una nueva vida en Cristo",
    "El arrepentimiento",
    "La fe",
    "El perdón",
    "La obediencia",
    "La familia",
    "El Espíritu Santo",
    "Los alimentos básicos del cristiano: 1 La Biblia",
    "Los alimentos básicos del cristiano: 2 La oración y el ayuno",
    "Los mandatos de Jesús: El bautismo",
    "Los mandatos de Jesús: La Santa Cena",
    "Mi compromiso con Dios. ¿Cómo compartir el mensaje?",
    "Mi compromiso con Dios. La mayordomía del cristiano",
    "La iglesia",
    "Los enemigos del cristiano: 1 Satanás",
    "Los enemigos del cristiano: 2 La vieja naturaleza",
    "Los enemigos del cristiano: 3 El mundo",
    "La armadura de Dios",
    "Guiados por Dios",
    "Resumen general",
  ];

  let totalClasses = 0;
  for (const [scheduleLabel, scheduleInfo] of Object.entries(schedules)) {
    // Find the first correct weekday on or after the course start
    const firstClassDate = findFirstDay(new Date(courseStartDate), scheduleInfo.weekday);

    for (let i = 0; i < classNames.length; i++) {
      const classDate = new Date(firstClassDate);
      classDate.setDate(classDate.getDate() + i * 7); // weekly

      await prisma.class.create({
        data: {
          name: `Sesión ${i + 1}: ${classNames[i]}`,
          date: classDate,
          topic: classNames[i],
          scheduleId: scheduleInfo.id,
        },
      });
      totalClasses++;
    }
  }
  console.log(`✓ ${totalClasses} classes created (21 per schedule, correct weekdays)`);

  // ─── FACILITATORS & TABLES ─────────────────────────────
  const facilitatorsBySchedule: Record<string, string[]> = {
    "Wednesday 7:00 PM": [
      "Francisca Torres",
      "Eliud Tapia",
      "Violeta Tijerina",
      "Susana Cazares",
      "Elva Rodriguez",
    ],
    "Sunday 9:00 AM": [
      "Isaias Palma",
      "Erika Quiroz",
      "Geazul Calderon",
    ],
    "Sunday 11:00 AM": [
      "Efren Lopez",
      "Luis Tapia",
      "Alejandra Solis",
      "Ana Garza",
      "Fernando Cruz",
      "Jose Arriaga",
      "Lindsey Lohurama",
      "David Suarez",
    ],
    "Sunday 1:00 PM": [
      "Martin Olvera",
      "Berenice Amador",
      "Eneyda Ortuño",
      "Abril Julieth",
    ],
  };

  let totalFacilitators = 0;
  let totalTables = 0;

  for (const [scheduleLabel, names] of Object.entries(facilitatorsBySchedule)) {
    const scheduleInfo = schedules[scheduleLabel];

    for (let i = 0; i < names.length; i++) {
      const fullName = names[i];

      const facilitator = await prisma.facilitator.create({
        data: {
          name: fullName,
        },
      });
      totalFacilitators++;

      await prisma.facilitatorTable.create({
        data: {
          name: `Table ${i + 1}`,
          facilitatorId: facilitator.id,
          scheduleId: scheduleInfo.id,
        },
      });
      totalTables++;
    }
  }
  console.log(`✓ ${totalFacilitators} facilitators created`);
  console.log(`✓ ${totalTables} tables created`);

  // ─── SUMMARY ───────────────────────────────────────────
  console.log("\n🎉 Seed complete!");
  console.log("───────────────────────────────");
  console.log(`   Admin:        admin@discipulado.app`);
  console.log(`   Course:       Course 1 - 2026`);
  console.log(`   Schedules:    4`);
  console.log(`   Classes:      ${totalClasses} (21 × 4)`);
  console.log(`   Facilitators: ${totalFacilitators}`);
  console.log(`   Tables:       ${totalTables}`);
  console.log("───────────────────────────────");
  console.log("\n⚠️  Don't forget to set your admin password:");
  console.log("   npx tsx scripts/set-admin-password.ts YourPassword");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });