-- Migration: event cost items for planned event costs

DO $$ BEGIN
  CREATE TYPE "EventCostScope" AS ENUM ('event', 'facilitator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventCostCategory" AS ENUM (
    'facilitator_fee',
    'facilitator_lodging',
    'extra_cost',
    'organization_profit'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventCostStatus" AS ENUM ('planned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "event_cost_items" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "event_person_id" TEXT,
  "scope" "EventCostScope" NOT NULL,
  "category" "EventCostCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(10,2),
  "unit_amount" DECIMAL(10,2),
  "total_amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "EventCostStatus" NOT NULL DEFAULT 'planned',
  "source" TEXT NOT NULL DEFAULT 'cost_manager',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "event_cost_items_event_id_source_idx"
  ON "event_cost_items"("event_id", "source");

CREATE INDEX IF NOT EXISTS "event_cost_items_event_person_id_idx"
  ON "event_cost_items"("event_person_id");

DO $$ BEGIN
  ALTER TABLE "event_cost_items"
    ADD CONSTRAINT "event_cost_items_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_cost_items"
    ADD CONSTRAINT "event_cost_items_event_person_id_fkey"
    FOREIGN KEY ("event_person_id") REFERENCES "event_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
