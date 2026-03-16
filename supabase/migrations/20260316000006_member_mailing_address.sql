-- Add mailing address fields to members table
-- Supports absentee owners/landlords who live at a different address than their unit
ALTER TABLE members
  ADD COLUMN mailing_address_line1 text,
  ADD COLUMN mailing_address_line2 text,
  ADD COLUMN mailing_city text,
  ADD COLUMN mailing_state text,
  ADD COLUMN mailing_zip text,
  ADD COLUMN use_unit_address boolean NOT NULL DEFAULT true;
