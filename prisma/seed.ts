import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "demo@orqestra.test" },
    update: {},
    create: {
      email: "demo@orqestra.test",
      password: hashedPassword,
      name: "Demo User",
    },
  });

  console.log("Seed completed: demo user created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
