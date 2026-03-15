import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error("Usage: npx tsx scripts/set-admin-password.ts <password>");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email: "admin@discipulado.app" },
    data: { password: hashed },
  });

  console.log("✓ Admin password updated successfully");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });