-- Migration 061: Additional sales rep fields (Zach/Marlie feedback)
-- Adds recheck_id, blacklisted flag, and blacklist_reason

ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS recheck_id TEXT;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT false;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS days_since_last_sale INTEGER;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS days_since_last_install INTEGER;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS days_since_last_commission INTEGER;
