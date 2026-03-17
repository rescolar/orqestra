-- Add auto_assigned and auto_assign_managed fields to event_persons
ALTER TABLE "event_persons" ADD COLUMN "auto_assigned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_persons" ADD COLUMN "auto_assign_managed" BOOLEAN NOT NULL DEFAULT false;
