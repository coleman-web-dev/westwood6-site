import {
  Waves,
  Dumbbell,
  Landmark,
  TreePine,
  Flame,
  Dog,
  Car,
  Bike,
  Mountain,
  Users,
  Music,
  BookOpen,
  Gamepad2,
  Baby,
  ShowerHead,
  Utensils,
  Wine,
  Tent,
  Sailboat,
  Fish,
  type LucideIcon,
} from 'lucide-react';

export interface AmenityIconDef {
  icon: LucideIcon;
  label: string;
}

// Curated set of amenity icons, keyed by a stable string stored in the DB.
// Keep sorted alphabetically by label for the picker UI.
export const AMENITY_ICONS: Record<string, AmenityIconDef> = {
  pool:       { icon: Waves,       label: 'Pool' },
  gym:        { icon: Dumbbell,    label: 'Gym / Fitness' },
  clubhouse:  { icon: Landmark,    label: 'Clubhouse' },
  park:       { icon: TreePine,    label: 'Park / Green Space' },
  grill:      { icon: Flame,       label: 'Grill / BBQ' },
  dogpark:    { icon: Dog,         label: 'Dog Park' },
  parking:    { icon: Car,         label: 'Parking' },
  bike:       { icon: Bike,        label: 'Bike Rack / Trail' },
  court:      { icon: Mountain,    label: 'Court / Sports' },
  meeting:    { icon: Users,       label: 'Meeting Room' },
  music:      { icon: Music,       label: 'Music Room' },
  library:    { icon: BookOpen,    label: 'Library / Lounge' },
  gameroom:   { icon: Gamepad2,    label: 'Game Room' },
  playground: { icon: Baby,        label: 'Playground' },
  shower:     { icon: ShowerHead,  label: 'Shower / Bath' },
  kitchen:    { icon: Utensils,    label: 'Kitchen / Cafe' },
  bar:        { icon: Wine,        label: 'Bar / Social' },
  pavilion:   { icon: Tent,        label: 'Pavilion' },
  boat:       { icon: Sailboat,    label: 'Boat / Dock' },
  fishing:    { icon: Fish,        label: 'Fishing' },
};

// Sorted entries for the picker
export const AMENITY_ICON_LIST = Object.entries(AMENITY_ICONS)
  .sort(([, a], [, b]) => a.label.localeCompare(b.label))
  .map(([key, def]) => ({ key, ...def }));

// Get icon component for a given key, with fallback
export function getAmenityIcon(key: string | null): LucideIcon | null {
  if (!key) return null;
  return AMENITY_ICONS[key]?.icon ?? null;
}
