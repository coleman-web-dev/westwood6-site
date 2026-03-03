// ─── Landing Page Types ────────────────────────────

export type LandingSectionId =
  | 'hero'
  | 'about'
  | 'board_members'
  | 'documents'
  | 'amenities'
  | 'quick_links'
  | 'gallery'
  | 'faq'
  | 'contact'
  | 'announcements';

export interface LandingPageSection {
  id: LandingSectionId;
  enabled: boolean;
  order: number;
}

export interface LandingQuickLink {
  label: string;
  url: string;
  icon?: string;
}

export interface LandingGalleryImage {
  url: string;
  caption: string | null;
}

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingPageConfig {
  sections: LandingPageSection[];

  // Theme
  theme_preset: string | null;
  custom_primary_color: string | null;
  custom_accent_color: string | null;

  // Hero
  hero_image_url: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;

  // About
  about_title: string | null;
  about_body: string | null;

  // Board members
  board_members_title: string | null;
  show_board_titles: boolean;

  // Contact
  contact_title: string | null;
  contact_body: string | null;

  // Quick links
  quick_links: LandingQuickLink[];

  // Amenities
  amenities_title: string | null;

  // Gallery
  gallery_images: LandingGalleryImage[];

  // FAQ
  faq_items: LandingFaqItem[];

  // Announcements
  announcements_title: string | null;
  max_public_announcements: number;

  // Footer
  footer_text: string | null;
}

// ─── Theme Presets ─────────────────────────────────

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'classic', name: 'Classic', primary: '#1D2024', accent: '#2563EB' },
  { id: 'modern', name: 'Modern', primary: '#0F172A', accent: '#8B5CF6' },
  { id: 'natural', name: 'Natural', primary: '#1B3A2D', accent: '#7BD6AA' },
  { id: 'professional', name: 'Professional', primary: '#1E293B', accent: '#0EA5E9' },
  { id: 'coastal', name: 'Coastal', primary: '#164E63', accent: '#22D3EE' },
  { id: 'warm', name: 'Warm', primary: '#451A03', accent: '#F4AE90' },
];

// ─── Section Labels ────────────────────────────────

export const SECTION_LABELS: Record<LandingSectionId, string> = {
  hero: 'Hero Banner',
  about: 'About',
  board_members: 'Board Members',
  documents: 'Documents',
  amenities: 'Amenities',
  quick_links: 'Quick Links',
  gallery: 'Photo Gallery',
  faq: 'FAQ',
  contact: 'Contact Info',
  announcements: 'Announcements',
};

// ─── Defaults ──────────────────────────────────────

export const DEFAULT_SECTIONS: LandingPageSection[] = [
  { id: 'hero', enabled: true, order: 0 },
  { id: 'about', enabled: false, order: 1 },
  { id: 'announcements', enabled: false, order: 2 },
  { id: 'board_members', enabled: false, order: 3 },
  { id: 'documents', enabled: false, order: 4 },
  { id: 'amenities', enabled: false, order: 5 },
  { id: 'quick_links', enabled: false, order: 6 },
  { id: 'gallery', enabled: false, order: 7 },
  { id: 'faq', enabled: false, order: 8 },
  { id: 'contact', enabled: true, order: 9 },
];

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  sections: DEFAULT_SECTIONS,
  theme_preset: 'classic',
  custom_primary_color: null,
  custom_accent_color: null,
  hero_image_url: null,
  hero_headline: null,
  hero_subheadline: null,
  about_title: null,
  about_body: null,
  board_members_title: null,
  show_board_titles: true,
  contact_title: null,
  contact_body: null,
  quick_links: [],
  amenities_title: null,
  gallery_images: [],
  faq_items: [],
  announcements_title: null,
  max_public_announcements: 5,
  footer_text: null,
};

/** Resolve the active primary/accent colors from a config */
export function resolveLandingColors(config: LandingPageConfig): {
  primary: string;
  accent: string;
} {
  if (config.custom_primary_color && config.custom_accent_color) {
    return { primary: config.custom_primary_color, accent: config.custom_accent_color };
  }
  const preset = THEME_PRESETS.find((p) => p.id === config.theme_preset);
  return {
    primary: config.custom_primary_color || preset?.primary || THEME_PRESETS[0].primary,
    accent: config.custom_accent_color || preset?.accent || THEME_PRESETS[0].accent,
  };
}
