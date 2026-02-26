import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_AMENITIES = [
  { code: "wifi", label: "Wi-Fi", icon: "wifi" },
  { code: "heating", label: "Calefacción", icon: "thermostat" },
  { code: "ac", label: "Aire Acondicionado", icon: "ac_unit" },
  { code: "kitchen", label: "Cocina", icon: "kitchen" },
  { code: "private_bathroom", label: "Baño Privado", icon: "bathroom" },
  { code: "parking", label: "Parking", icon: "local_parking" },
  { code: "accessibility", label: "Accesibilidad", icon: "accessible" },
];

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@orqestra.test" },
    update: {},
    create: {
      email: "demo@orqestra.test",
      password: hashedPassword,
      name: "Demo User",
    },
  });

  for (const amenity of DEFAULT_AMENITIES) {
    await prisma.amenity.upsert({
      where: { user_id_code: { user_id: user.id, code: amenity.code } },
      update: { label: amenity.label, icon: amenity.icon },
      create: {
        user_id: user.id,
        code: amenity.code,
        label: amenity.label,
        icon: amenity.icon,
      },
    });
  }

  console.log("Seed completed: demo user + 7 amenities");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
