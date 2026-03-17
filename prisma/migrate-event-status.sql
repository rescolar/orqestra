-- Add new EventStatus values and migrate active → published
-- Run this BEFORE pnpm db:push

ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'finished';

-- Migrate existing active events to published
UPDATE events SET status = 'published' WHERE status = 'active';
