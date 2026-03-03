'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Switch } from '@/components/shared/ui/switch';
import { Textarea } from '@/components/shared/ui/textarea';
import { toast } from 'sonner';
import { LandingPageThemePicker } from './landing-page-theme-picker';
import { LandingPageSectionManager } from './landing-page-section-manager';
import { LandingPageHeroEditor } from './landing-page-hero-editor';
import { LandingPageAboutEditor } from './landing-page-about-editor';
import { LandingPageLinksEditor } from './landing-page-links-editor';
import { LandingPageGalleryEditor } from './landing-page-gallery-editor';
import { LandingPageFaqEditor } from './landing-page-faq-editor';
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing';
import type {
  LandingPageConfig,
  LandingPageSection,
  LandingQuickLink,
  LandingGalleryImage,
  LandingFaqItem,
} from '@/lib/types/landing';

export function LandingPageSettings() {
  const { community } = useCommunity();
  const [saving, setSaving] = useState(false);

  // All config state
  const [sections, setSections] = useState<LandingPageSection[]>(DEFAULT_LANDING_CONFIG.sections);
  const [themePreset, setThemePreset] = useState<string | null>(DEFAULT_LANDING_CONFIG.theme_preset);
  const [customPrimary, setCustomPrimary] = useState<string | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroHeadline, setHeroHeadline] = useState<string | null>(null);
  const [heroSubheadline, setHeroSubheadline] = useState<string | null>(null);
  const [aboutTitle, setAboutTitle] = useState<string | null>(null);
  const [aboutBody, setAboutBody] = useState<string | null>(null);
  const [boardMembersTitle, setBoardMembersTitle] = useState<string | null>(null);
  const [showBoardTitles, setShowBoardTitles] = useState(true);
  const [contactTitle, setContactTitle] = useState<string | null>(null);
  const [contactBody, setContactBody] = useState<string | null>(null);
  const [quickLinks, setQuickLinks] = useState<LandingQuickLink[]>([]);
  const [amenitiesTitle, setAmenitiesTitle] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<LandingGalleryImage[]>([]);
  const [faqItems, setFaqItems] = useState<LandingFaqItem[]>([]);
  const [announcementsTitle, setAnnouncementsTitle] = useState<string | null>(null);
  const [maxPublicAnnouncements, setMaxPublicAnnouncements] = useState(5);
  const [footerText, setFooterText] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    if (!community?.theme?.landing_page) return;
    const lp = community.theme.landing_page;
    setSections(lp.sections || DEFAULT_LANDING_CONFIG.sections);
    setThemePreset(lp.theme_preset ?? DEFAULT_LANDING_CONFIG.theme_preset);
    setCustomPrimary(lp.custom_primary_color);
    setCustomAccent(lp.custom_accent_color);
    setHeroImageUrl(lp.hero_image_url);
    setHeroHeadline(lp.hero_headline);
    setHeroSubheadline(lp.hero_subheadline);
    setAboutTitle(lp.about_title);
    setAboutBody(lp.about_body);
    setBoardMembersTitle(lp.board_members_title);
    setShowBoardTitles(lp.show_board_titles ?? true);
    setContactTitle(lp.contact_title);
    setContactBody(lp.contact_body);
    setQuickLinks(lp.quick_links || []);
    setAmenitiesTitle(lp.amenities_title);
    setGalleryImages(lp.gallery_images || []);
    setFaqItems(lp.faq_items || []);
    setAnnouncementsTitle(lp.announcements_title);
    setMaxPublicAnnouncements(lp.max_public_announcements ?? 5);
    setFooterText(lp.footer_text);
  }, [community]);

  const buildConfig = useCallback((): LandingPageConfig => ({
    sections,
    theme_preset: themePreset,
    custom_primary_color: customPrimary,
    custom_accent_color: customAccent,
    hero_image_url: heroImageUrl,
    hero_headline: heroHeadline,
    hero_subheadline: heroSubheadline,
    about_title: aboutTitle,
    about_body: aboutBody,
    board_members_title: boardMembersTitle,
    show_board_titles: showBoardTitles,
    contact_title: contactTitle,
    contact_body: contactBody,
    quick_links: quickLinks,
    amenities_title: amenitiesTitle,
    gallery_images: galleryImages,
    faq_items: faqItems,
    announcements_title: announcementsTitle,
    max_public_announcements: maxPublicAnnouncements,
    footer_text: footerText,
  }), [
    sections, themePreset, customPrimary, customAccent,
    heroImageUrl, heroHeadline, heroSubheadline,
    aboutTitle, aboutBody, boardMembersTitle, showBoardTitles,
    contactTitle, contactBody, quickLinks, amenitiesTitle,
    galleryImages, faqItems, announcementsTitle, maxPublicAnnouncements, footerText,
  ]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const config = buildConfig();

    const updatedTheme = {
      ...community.theme,
      landing_page: config,
    };

    const { error } = await supabase
      .from('communities')
      .update({ theme: updatedTheme })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save landing page settings.');
      return;
    }

    toast.success('Landing page saved.');
  }

  function handlePreview() {
    window.open(`/${community.slug}`, '_blank');
  }

  return (
    <div className="space-y-6">
      {/* Theme & Colors */}
      <Section title="Theme & Colors" description="Choose a color preset or set custom colors.">
        <LandingPageThemePicker
          selectedPreset={themePreset}
          customPrimary={customPrimary}
          customAccent={customAccent}
          onPresetChange={setThemePreset}
          onCustomPrimaryChange={setCustomPrimary}
          onCustomAccentChange={setCustomAccent}
        />
      </Section>

      {/* Section Manager */}
      <Section title="Sections" description="Toggle and reorder the sections shown on your landing page. Drag to reorder.">
        <LandingPageSectionManager
          sections={sections}
          onChange={setSections}
        />
      </Section>

      {/* Hero */}
      <Section title="Hero Banner" description="Customize the hero area at the top of the page.">
        <LandingPageHeroEditor
          communityId={community.id}
          heroImageUrl={heroImageUrl}
          heroHeadline={heroHeadline}
          heroSubheadline={heroSubheadline}
          onImageChange={setHeroImageUrl}
          onHeadlineChange={setHeroHeadline}
          onSubheadlineChange={setHeroSubheadline}
        />
      </Section>

      {/* About */}
      <Section title="About" description="Introduce your community to visitors.">
        <LandingPageAboutEditor
          aboutTitle={aboutTitle}
          aboutBody={aboutBody}
          onTitleChange={setAboutTitle}
          onBodyChange={setAboutBody}
        />
      </Section>

      {/* Board Members */}
      <Section
        title="Board Members"
        description="Board members are shown automatically based on system role. Edit board titles in member profiles."
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Section Title
            </label>
            <Input
              placeholder="Board of Directors"
              value={boardMembersTitle || ''}
              onChange={(e) => setBoardMembersTitle(e.target.value || null)}
              maxLength={100}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-body text-text-primary-light dark:text-text-primary-dark">
              Show board titles
            </label>
            <Switch
              checked={showBoardTitles}
              onCheckedChange={setShowBoardTitles}
            />
          </div>
        </div>
      </Section>

      {/* Documents */}
      <Section
        title="Documents"
        description="Public documents are shown automatically. Toggle documents as public from the Documents page."
      >
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Documents marked as public will appear on the landing page for download.
        </p>
      </Section>

      {/* Quick Links */}
      <Section title="Quick Links" description="Add helpful links for visitors.">
        <LandingPageLinksEditor
          links={quickLinks}
          onChange={setQuickLinks}
        />
      </Section>

      {/* Amenities */}
      <Section
        title="Amenities"
        description="Active amenities are shown automatically."
      >
        <div className="space-y-1.5">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Section Title
          </label>
          <Input
            placeholder="Community Amenities"
            value={amenitiesTitle || ''}
            onChange={(e) => setAmenitiesTitle(e.target.value || null)}
            maxLength={100}
          />
        </div>
      </Section>

      {/* Gallery */}
      <Section title="Photo Gallery" description="Upload photos of your community.">
        <LandingPageGalleryEditor
          communityId={community.id}
          images={galleryImages}
          onChange={setGalleryImages}
        />
      </Section>

      {/* FAQ */}
      <Section title="FAQ" description="Add frequently asked questions.">
        <LandingPageFaqEditor
          items={faqItems}
          onChange={setFaqItems}
        />
      </Section>

      {/* Announcements */}
      <Section
        title="Announcements"
        description="Mark announcements as public from the Announcements page."
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Section Title
            </label>
            <Input
              placeholder="Community Updates"
              value={announcementsTitle || ''}
              onChange={(e) => setAnnouncementsTitle(e.target.value || null)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Max announcements to show
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxPublicAnnouncements}
              onChange={(e) => setMaxPublicAnnouncements(parseInt(e.target.value) || 5)}
            />
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact" description="Customize the contact section. Email, phone, and address come from Community settings.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Section Title
            </label>
            <Input
              placeholder="Contact Us"
              value={contactTitle || ''}
              onChange={(e) => setContactTitle(e.target.value || null)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Additional Text
            </label>
            <Textarea
              placeholder="Office hours, mailing address, etc."
              value={contactBody || ''}
              onChange={(e) => setContactBody(e.target.value || null)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Footer */}
      <Section title="Footer" description="Optional footer text at the bottom of the page.">
        <Input
          placeholder="&copy; 2026 Your Community HOA"
          value={footerText || ''}
          onChange={(e) => setFooterText(e.target.value || null)}
          maxLength={200}
        />
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Landing Page'}
        </Button>
        <Button variant="outline" onClick={handlePreview}>
          <ExternalLink className="h-4 w-4 mr-1.5" />
          Preview
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        {title}
      </h2>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
        {description}
      </p>
      {children}
    </div>
  );
}
