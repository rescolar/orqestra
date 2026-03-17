-- Migration: RoomType + OccupancyPricing (replaces VenueRoom + RoomPricing)
-- Run BEFORE `pnpm db:push`

-- 1. Create new tables
CREATE TABLE IF NOT EXISTS "room_types" (
  "id" TEXT NOT NULL,
  "venue_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER NOT NULL,
  "has_private_bathroom" BOOLEAN NOT NULL DEFAULT false,
  "base_price" DECIMAL(10,2),
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "room_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_types_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "occupancy_pricings" (
  "id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL,
  "occupancy" INTEGER NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "occupancy_pricings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "occupancy_pricings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "occupancy_pricings_room_type_id_occupancy_key" ON "occupancy_pricings"("room_type_id", "occupancy");

-- 2. Add new columns to existing tables
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "pricing_mode" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "facilitation_cost_day" DECIMAL(10,2);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "facilitation_cost_half_day" DECIMAL(10,2);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "management_cost_day" DECIMAL(10,2);

ALTER TABLE "event_persons" ADD COLUMN IF NOT EXISTS "accommodation_room_type_id" TEXT;
ALTER TABLE "event_persons" ADD COLUMN IF NOT EXISTS "accommodation_occupancy" INTEGER;

ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "room_type_id" TEXT;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "is_template" BOOLEAN NOT NULL DEFAULT true;

-- 3. Migrate VenueRoom data → RoomType
-- Group venue_rooms by (venue_id, capacity, has_private_bathroom) to create one RoomType per unique combo
INSERT INTO "room_types" ("id", "venue_id", "name", "description", "capacity", "has_private_bathroom", "base_price", "position")
SELECT
  gen_random_uuid()::text,
  vr.venue_id,
  COALESCE(vr.display_name, 'Hab ' || vr.capacity || CASE WHEN vr.has_private_bathroom THEN ' (baño)' ELSE '' END),
  vr.description,
  vr.capacity,
  vr.has_private_bathroom,
  vr.price,
  ROW_NUMBER() OVER (PARTITION BY vr.venue_id ORDER BY vr.capacity, vr.has_private_bathroom::int) - 1
FROM "venue_rooms" vr
WHERE vr.id IN (
  -- Pick first venue_room per (venue_id, capacity, has_private_bathroom) group
  SELECT DISTINCT ON (venue_id, capacity, has_private_bathroom) id
  FROM "venue_rooms"
  ORDER BY venue_id, capacity, has_private_bathroom, internal_number
);

-- 4. Migrate RoomPricing → link rooms to room_types
-- For each room, find the matching RoomType from the event's venue
UPDATE "rooms" r
SET "room_type_id" = rt.id
FROM "events" e, "room_types" rt
WHERE r.event_id = e.id
  AND e.venue_id IS NOT NULL
  AND rt.venue_id = e.venue_id
  AND rt.capacity = r.capacity
  AND rt.has_private_bathroom = r.has_private_bathroom;

-- 5. Drop old columns/tables (after db:push syncs the schema, these will be dropped automatically)
-- We leave pricing_by_room_type on events for now (still used in code)
-- VenueRoom and RoomPricing tables will be dropped by db:push

-- 6. Drop old pricing_by_room_type from venues (replaced by is_template)
-- This will be handled by db:push
