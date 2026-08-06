
-- Migration to add manual statistics to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS manual_tickets_sold INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
