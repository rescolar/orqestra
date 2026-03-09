-- Migration: Status Lifecycle + Payment Tracking
-- Run this BEFORE `pnpm db:push` to migrate existing enum values.
--
-- Step 1: Add new enum values
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'inscrito';
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'reservado';
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'pagado';
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'confirmado_sin_pago';
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'solicita_cancelacion';
ALTER TYPE "EventPersonStatus" ADD VALUE IF NOT EXISTS 'cancelado';

-- Step 2: Migrate existing data
UPDATE event_persons SET status = 'inscrito' WHERE status IN ('confirmed', 'tentative');
UPDATE event_persons SET status = 'cancelado' WHERE status = 'cancelled';

-- Step 3: Remove old enum values (requires recreating the enum)
-- PostgreSQL doesn't support DROP VALUE, so we recreate:
ALTER TYPE "EventPersonStatus" RENAME TO "EventPersonStatus_old";

CREATE TYPE "EventPersonStatus" AS ENUM (
  'inscrito',
  'reservado',
  'pagado',
  'confirmado_sin_pago',
  'solicita_cancelacion',
  'cancelado'
);

ALTER TABLE event_persons
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "EventPersonStatus" USING status::text::"EventPersonStatus",
  ALTER COLUMN status SET DEFAULT 'inscrito';

DROP TYPE "EventPersonStatus_old";

-- Step 4: Add pricing columns (db push will also do this, but included for completeness)
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_price DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE event_persons ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2);
ALTER TABLE event_persons ADD COLUMN IF NOT EXISTS payment_note TEXT;
