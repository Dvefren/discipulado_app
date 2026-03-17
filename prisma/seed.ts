import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ScheduleDay } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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
  const course = await prisma.course.create({
    data: {
      name: "Course 1 - 2026",
      year: 2026,
      semester: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });
  console.log("✓ Course created: Course 1 - 2026");

  // ─── SCHEDULES ─────────────────────────────────────────
  const scheduleData: { day: ScheduleDay; time: string; label: string }[] = [
    { day: "WEDNESDAY", time: "19:00", label: "Wednesday 7:00 PM" },
    { day: "SUNDAY", time: "09:00", label: "Sunday 9:00 AM" },
    { day: "SUNDAY", time: "11:00", label: "Sunday 11:00 AM" },
    { day: "SUNDAY", time: "13:00", label: "Sunday 1:00 PM" },
  ];

  const schedules: Record<string, any> = {};
  for (const s of scheduleData) {
    const schedule = await prisma.schedule.create({
      data: {
        day: s.day,
        time: s.time,
        label: s.label,
        courseId: course.id,
      },
    });
    schedules[s.label] = schedule;
  }
  console.log("✓ 4 schedules created");

  // ─── CLASSES (same 21 for each schedule) ───────────────
  // Format: { name: "Display name", topic: "Topic" }
  const classDefinitions: { name: string; topic: string; date: string }[] = [
    { name: "Clase 1: Introducción",                         topic: "Introducción",                          date: "2026-01-01" },
    { name: "Clase 2: El comienzo de una nueva vida en Cristo", topic: "El comienzo de una nueva vida en Cristo", date: "2026-01-08" },
    { name: "Clase 3: El arrepentimiento",                   topic: "El arrepentimiento",                    date: "2026-01-15" },
    { name: "Clase 4: La fe",                                topic: "La fe",                                 date: "2026-01-22" },
    { name: "Clase 5: El perdón",                            topic: "El perdón",                             date: "2026-01-29" },
    { name: "Clase 6: La obediencia",                        topic: "La obediencia",                         date: "2026-02-05" },
    { name: "Clase 7: La familia",                           topic: "La familia",                            date: "2026-02-12" },
    { name: "Clase 8: El Espíritu Santo",                    topic: "El Espíritu Santo",                     date: "2026-02-19" },
    // Los alimentos básicos del cristiano
    { name: "Clase 1: La Biblia",                            topic: "La Biblia",                             date: "2026-02-26" },
    { name: "Clase 2: La oración y el ayuno",                topic: "La oración y el ayuno",                 date: "2026-03-05" },
    // Los mandatos de Jesús
    { name: "Clase 1: El bautismo",                          topic: "El bautismo",                           date: "2026-03-11" },
    { name: "Clase 2: La Santa Cena",                        topic: "La Santa Cena",                         date: "2026-03-18" },
    // Mi compromiso con Dios
    { name: "Clase 1: ¿Cómo compartir el mensaje?",         topic: "¿Cómo compartir el mensaje?",           date: "2026-03-25" },
    { name: "Clase 2: La mayordomía del cristiano",          topic: "La mayordomía del cristiano",            date: "2026-04-01" },
    { name: "Clase 15: La iglesia",                          topic: "La iglesia",                            date: "2026-04-08" },
    // Los enemigos del cristiano
    { name: "Clase 1: Satanás",                              topic: "Satanás",                               date: "2026-04-15" },
    { name: "Clase 2: La vieja naturaleza",                  topic: "La vieja naturaleza",                   date: "2026-04-22" },
    { name: "Clase 3: El mundo",                             topic: "El mundo",                              date: "2026-04-29" },
    { name: "Clase 19: La armadura de Dios",                 topic: "La armadura de Dios",                   date: "2026-05-06" },
    { name: "Clase 20: Guiados por Dios",                    topic: "Guiados por Dios",                      date: "2026-05-13" },
    { name: "Clase 21: Resumen general",                     topic: "Resumen general",                       date: "2026-05-20" },
  ];

  for (const scheduleKey of Object.keys(schedules)) {
    const schedule = schedules[scheduleKey];
    for (const classDef of classDefinitions) {
      await prisma.class.create({
        data: {
          name: classDef.name,
          date: new Date(classDef.date),
          topic: classDef.topic,
          scheduleId: schedule.id,
        },
      });
    }
  }
  console.log("✓ 84 classes created (21 per schedule)");

  // ─── FACILITATORS & TABLES ─────────────────────────────
  const facilitatorsBySchedule = {
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

  const tableIds: string[] = []; // collect all table IDs for student assignment
  let totalFacilitators = 0;
  let totalTables = 0;

  for (const [scheduleLabel, names] of Object.entries(facilitatorsBySchedule)) {
    const schedule = schedules[scheduleLabel];

    for (let i = 0; i < names.length; i++) {
      const fullName = names[i];

      const facilitator = await prisma.facilitator.create({
        data: {
          name: fullName,
        },
      });
      totalFacilitators++;

      const table = await prisma.facilitatorTable.create({
        data: {
          name: `Table ${i + 1}`,
          facilitatorId: facilitator.id,
          scheduleId: schedule.id,
        },
      });
      tableIds.push(table.id);
      totalTables++;
    }
  }
  console.log(`✓ ${totalFacilitators} facilitators created`);
  console.log(`✓ ${totalTables} tables created`);

  // ─── 50 FAKE STUDENTS ──────────────────────────────────
  const fakeStudents: { firstName: string; lastName: string; phone: string; address: string; birthdate: string }[] = [
    { firstName: "María",     lastName: "García López",      phone: "899-100-0001", address: "Col. Del Prado, Calle 5 #101",           birthdate: "1995-03-12" },
    { firstName: "Juan",      lastName: "Hernández Ríos",    phone: "899-100-0002", address: "Col. Rodríguez, Av. Hidalgo #220",       birthdate: "1988-07-25" },
    { firstName: "Ana",       lastName: "Martínez Cruz",     phone: "899-100-0003", address: "Col. Las Fuentes, Calle 12 #45",         birthdate: "2001-11-08" },
    { firstName: "Carlos",    lastName: "López Salinas",     phone: "899-100-0004", address: "Col. Voluntad y Trabajo, Av. Las Torres #88", birthdate: "1992-01-30" },
    { firstName: "Laura",     lastName: "Rodríguez Peña",    phone: "899-100-0005", address: "Col. Azteca, Calle Juárez #310",         birthdate: "1999-06-15" },
    { firstName: "Pedro",     lastName: "González Treviño",  phone: "899-100-0006", address: "Col. Lomas de Jarachina, Calle 8 #77",   birthdate: "1985-12-03" },
    { firstName: "Sofía",     lastName: "Sánchez Vega",      phone: "899-100-0007", address: "Col. Anzaldúas, Blvd. Morelos #502",     birthdate: "2003-04-22" },
    { firstName: "Diego",     lastName: "Ramírez Flores",    phone: "899-100-0008", address: "Col. Cumbres, Calle Nogal #15",          birthdate: "1997-09-18" },
    { firstName: "Valentina", lastName: "Torres Cantú",      phone: "899-100-0009", address: "Col. Petrolera, Av. Tecnológico #640",   birthdate: "2000-02-14" },
    { firstName: "Miguel",    lastName: "Flores Garza",      phone: "899-100-0010", address: "Col. Los Virreyes, Calle Olmo #33",      birthdate: "1990-08-07" },
    { firstName: "Camila",    lastName: "Díaz Medina",       phone: "899-100-0011", address: "Col. Nuevo Amanecer, Calle 3 #200",      birthdate: "1996-05-29" },
    { firstName: "Andrés",    lastName: "Morales Quintero",  phone: "899-100-0012", address: "Col. Del Valle, Av. Monterrey #118",     birthdate: "1993-10-11" },
    { firstName: "Isabella",  lastName: "Jiménez Lara",      phone: "899-100-0013", address: "Col. Longoria, Calle Sauce #56",         birthdate: "2002-07-04" },
    { firstName: "Roberto",   lastName: "Castillo Ruiz",     phone: "899-100-0014", address: "Col. Satelite, Blvd. Independencia #89", birthdate: "1987-03-20" },
    { firstName: "Daniela",   lastName: "Ortiz Chávez",      phone: "899-100-0015", address: "Col. Ampliación Rodríguez, Calle 10 #70", birthdate: "1998-12-01" },
    { firstName: "Fernando",  lastName: "Gutiérrez Luna",    phone: "899-100-0016", address: "Col. Almaguer, Av. Río Bravo #405",     birthdate: "1991-06-28" },
    { firstName: "Gabriela",  lastName: "Vargas Montes",     phone: "899-100-0017", address: "Col. Villa Florida, Calle Dalia #12",    birthdate: "2004-01-17" },
    { firstName: "Alejandro", lastName: "Mendoza Soto",      phone: "899-100-0018", address: "Col. Balcones, Calle Fresno #93",        birthdate: "1994-08-23" },
    { firstName: "Paola",     lastName: "Reyes Ibarra",      phone: "899-100-0019", address: "Col. Unidad Modelo, Av. Pemex #210",     birthdate: "2000-10-05" },
    { firstName: "Ricardo",   lastName: "Aguilar Domínguez", phone: "899-100-0020", address: "Col. Benito Juárez, Calle 7 #44",       birthdate: "1986-04-16" },
    { firstName: "Fernanda",  lastName: "Navarro Espinoza",  phone: "899-100-0021", address: "Col. Hidalgo, Av. Constitución #330",    birthdate: "1999-11-30" },
    { firstName: "Jesús",     lastName: "Ramos Cisneros",    phone: "899-100-0022", address: "Col. Rancho Grande, Calle Pino #67",     birthdate: "1993-02-08" },
    { firstName: "Lucía",     lastName: "Peña Delgado",      phone: "899-100-0023", address: "Col. Las Granjas, Blvd. Marte #155",     birthdate: "2001-09-12" },
    { firstName: "Emilio",    lastName: "Contreras Salazar",  phone: "899-100-0024", address: "Col. Lomas Real, Calle Álamo #28",      birthdate: "1989-07-01" },
    { firstName: "Mariana",   lastName: "Herrera Villarreal", phone: "899-100-0025", address: "Col. Reynosa, Av. Industrial #510",     birthdate: "1997-05-19" },
    { firstName: "Sebastián", lastName: "Medina Olvera",     phone: "899-100-0026", address: "Col. Ampliación Unidad Nacional, Calle 6 #82", birthdate: "2003-08-14" },
    { firstName: "Ximena",    lastName: "Vega Ochoa",        phone: "899-100-0027", address: "Col. Riveras del Carmen, Calle Lirio #41", birthdate: "1995-12-25" },
    { firstName: "Óscar",     lastName: "Guerrero Zamora",   phone: "899-100-0028", address: "Col. Voluntad y Trabajo II, Calle 15 #99", birthdate: "1990-03-06" },
    { firstName: "Regina",    lastName: "Campos Esquivel",   phone: "899-100-0029", address: "Col. Las Palmas, Av. De las Américas #175", birthdate: "2002-06-21" },
    { firstName: "Arturo",    lastName: "Estrada Cervantes", phone: "899-100-0030", address: "Col. Bugambilias, Calle Rosa #50",       birthdate: "1988-11-13" },
    { firstName: "Renata",    lastName: "Silva Paredes",     phone: "899-100-0031", address: "Col. Tecnológico, Calle Encino #108",    birthdate: "1996-04-09" },
    { firstName: "Héctor",    lastName: "Cruz Maldonado",    phone: "899-100-0032", address: "Col. Ampliación Longoria, Av. Lázaro Cárdenas #66", birthdate: "1992-09-27" },
    { firstName: "Natalia",   lastName: "Rojas Bautista",    phone: "899-100-0033", address: "Col. Del Maestro, Calle Girasol #37",    birthdate: "2000-01-03" },
    { firstName: "Luis",      lastName: "Salazar Nava",      phone: "899-100-0034", address: "Col. San Felipe, Blvd. Miguel Hidalgo #280", birthdate: "1994-07-16" },
    { firstName: "Valeria",   lastName: "Ríos Acosta",       phone: "899-100-0035", address: "Col. Privadas del Sol, Calle 9 #22",     birthdate: "2001-03-30" },
    { firstName: "Marco",     lastName: "Delgado Trujillo",  phone: "899-100-0036", address: "Col. Riveras del Bravo, Av. Ribereña #444", birthdate: "1987-10-22" },
    { firstName: "Ivanna",    lastName: "Lara Figueroa",     phone: "899-100-0037", address: "Col. Bienestar, Calle Gardenia #63",     birthdate: "1998-08-11" },
    { firstName: "Enrique",   lastName: "Pacheco Miranda",   phone: "899-100-0038", address: "Col. Lomas de Reynosa, Calle Cedro #85", birthdate: "1991-02-18" },
    { firstName: "Adriana",   lastName: "Cabrera León",      phone: "899-100-0039", address: "Col. Hacienda las Fuentes, Calle 4 #130", birthdate: "2004-05-07" },
    { firstName: "Tomás",     lastName: "Orozco Tapia",      phone: "899-100-0040", address: "Col. Almaguer II, Av. Benito Juárez #320", birthdate: "1985-01-24" },
    { firstName: "Elena",     lastName: "Bernal Solís",      phone: "899-100-0041", address: "Col. Las Cumbres, Calle Jazmín #17",     birthdate: "1999-10-19" },
    { firstName: "Iván",      lastName: "Carrillo Huerta",   phone: "899-100-0042", address: "Col. INFONAVIT, Calle Tulipán #54",      birthdate: "1993-06-05" },
    { firstName: "Jimena",    lastName: "Fuentes Rangel",    phone: "899-100-0043", address: "Col. Prados, Av. Las Palmas #190",       birthdate: "2002-12-15" },
    { firstName: "Rafael",    lastName: "Zavala Cortés",     phone: "899-100-0044", address: "Col. Valle Alto, Calle Olivo #72",       birthdate: "1990-04-28" },
    { firstName: "Paulina",   lastName: "Ibarra Gallegos",   phone: "899-100-0045", address: "Col. Vista Hermosa, Blvd. Las Fuentes #260", birthdate: "1997-11-02" },
    { firstName: "Gustavo",   lastName: "Espinoza Valdez",   phone: "899-100-0046", address: "Col. Balcones de Alcalá, Calle 2 #48",   birthdate: "1986-08-31" },
    { firstName: "Andrea",    lastName: "Montes Tavares",    phone: "899-100-0047", address: "Col. Pedro J. Méndez, Av. San Ángel #115", birthdate: "2003-03-26" },
    { firstName: "César",     lastName: "Villarreal Mejía",  phone: "899-100-0048", address: "Col. Los Almendros, Calle Caoba #39",    birthdate: "1995-07-09" },
    { firstName: "Catalina",  lastName: "Acosta Coronado",   phone: "899-100-0049", address: "Col. Lomas del Real, Calle Laurel #81",  birthdate: "2000-05-14" },
    { firstName: "Daniel",    lastName: "Treviño Salas",     phone: "899-100-0050", address: "Col. Moderno, Av. Tecnológico #355",     birthdate: "1992-09-03" },
  ];

  // Distribute students across tables (round-robin)
  let totalStudents = 0;
  for (let i = 0; i < fakeStudents.length; i++) {
    const s = fakeStudents[i];
    const tableId = tableIds[i % tableIds.length];

    await prisma.student.create({
      data: {
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        address: s.address,
        birthdate: new Date(s.birthdate),
        tableId: tableId,
        profileNotes: {
          "¿Quién te invitó?": ["Un amigo", "Un familiar", "Redes sociales", "Pastor"][Math.floor(Math.random() * 4)],
          "¿Es tu primera vez en la iglesia?": Math.random() > 0.4 ? "Sí" : "No",
          "¿Cómo te enteraste del curso?": ["Invitación personal", "Anuncio en servicio", "WhatsApp", "Facebook"][Math.floor(Math.random() * 4)],
        },
      },
    });
    totalStudents++;
  }
  console.log(`✓ ${totalStudents} students created`);

  // ─── SUMMARY ───────────────────────────────────────────
  console.log("\n🎉 Seed complete!");
  console.log("───────────────────────────────");
  console.log(`   Admin:        admin@discipulado.app`);
  console.log(`   Course:       Course 1 - 2026`);
  console.log(`   Schedules:    4`);
  console.log(`   Classes:      84 (21 × 4)`);
  console.log(`   Facilitators: ${totalFacilitators}`);
  console.log(`   Tables:       ${totalTables}`);
  console.log(`   Students:     ${totalStudents}`);
  console.log("───────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });