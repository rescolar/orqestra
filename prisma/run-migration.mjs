import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Step 1: Add new enum values
  const newValues = ["inscrito", "reservado", "pagado", "confirmado_sin_pago", "solicita_cancelacion", "cancelado"];
  for (const val of newValues) {
    try {
      await db.$executeRawUnsafe(`ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`Added enum value: ${val}`);
    } catch (e) {
      console.log(`Enum value ${val} already exists or error:`, e.message);
    }
  }

  // Step 2: Migrate existing data
  const updated1 = await db.$executeRawUnsafe(`UPDATE event_persons SET status = 'inscrito' WHERE status IN ('confirmed', 'tentative')`);
  console.log(`Migrated confirmed/tentative → inscrito: ${updated1} rows`);

  const updated2 = await db.$executeRawUnsafe(`UPDATE event_persons SET status = 'cancelado' WHERE status = 'cancelled'`);
  console.log(`Migrated cancelled → cancelado: ${updated2} rows`);

  // Step 3: Recreate enum without old values
  await db.$executeRawUnsafe(`ALTER TYPE "EventPersonStatus" RENAME TO "EventPersonStatus_old"`);
  await db.$executeRawUnsafe(`CREATE TYPE "EventPersonStatus" AS ENUM ('inscrito', 'reservado', 'pagado', 'confirmado_sin_pago', 'solicita_cancelacion', 'cancelado')`);
  await db.$executeRawUnsafe(`ALTER TABLE event_persons ALTER COLUMN status DROP DEFAULT`);
  await db.$executeRawUnsafe(`ALTER TABLE event_persons ALTER COLUMN status TYPE "EventPersonStatus" USING status::text::"EventPersonStatus"`);
  await db.$executeRawUnsafe(`ALTER TABLE event_persons ALTER COLUMN status SET DEFAULT 'inscrito'`);
  await db.$executeRawUnsafe(`DROP TYPE "EventPersonStatus_old"`);
  console.log("Recreated enum without old values");

  console.log("Migration complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
