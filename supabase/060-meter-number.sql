-- Migration 060: Add meter_number field to projects (Zach's request)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meter_number TEXT;
