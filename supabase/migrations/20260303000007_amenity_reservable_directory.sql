-- Add reservable toggle and public description for amenity directory support.
-- Existing amenities default to reservable=true so nothing breaks.
ALTER TABLE amenities
  ADD COLUMN IF NOT EXISTS reservable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_description TEXT;
