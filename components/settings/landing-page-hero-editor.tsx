'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { AiGenerateButton } from './ai-generate-button';
import { toast } from 'sonner';

interface HeroEditorProps {
  communityId: string;
  communityName: string;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  onImageChange: (url: string | null) => void;
  onHeadlineChange: (val: string | null) => void;
  onSubheadlineChange: (val: string | null) => void;
}

export function LandingPageHeroEditor({
  communityId,
  communityName,
  heroImageUrl,
  heroHeadline,
  heroSubheadline,
  onImageChange,
  onHeadlineChange,
  onSubheadlineChange,
}: HeroEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-');
    const path = `${communityId}/landing/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage
      .from('community-assets')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('Hero image upload error:', error);
      toast.error(error.message || 'Failed to upload image.');
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('community-assets')
      .getPublicUrl(path);

    onImageChange(urlData.publicUrl);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    toast.success('Hero image uploaded.');
  }

  function handleRemoveImage() {
    onImageChange(null);
  }

  return (
    <div className="space-y-4">
      {/* Image upload */}
      <div className="space-y-1.5">
        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Hero Image
        </label>
        {heroImageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-stroke-light dark:border-stroke-dark">
            <img
              src={heroImageUrl}
              alt="Hero preview"
              className="w-full h-40 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-gray-400 transition-colors"
          >
            <Upload className="h-5 w-5" />
            <span className="text-body">
              {uploading ? 'Uploading...' : 'Upload hero image'}
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Headline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Headline
          </label>
          <AiGenerateButton
            field="hero_headline"
            communityName={communityName}
            onGenerated={(text) => onHeadlineChange(text)}
          />
        </div>
        <Input
          placeholder="Welcome to our community"
          value={heroHeadline || ''}
          onChange={(e) => onHeadlineChange(e.target.value || null)}
          maxLength={100}
        />
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Leave blank to use your community name.
        </p>
      </div>

      {/* Subheadline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Subheadline
          </label>
          <AiGenerateButton
            field="hero_subheadline"
            communityName={communityName}
            onGenerated={(text) => onSubheadlineChange(text)}
          />
        </div>
        <Input
          placeholder="A brief welcome message"
          value={heroSubheadline || ''}
          onChange={(e) => onSubheadlineChange(e.target.value || null)}
          maxLength={200}
        />
      </div>
    </div>
  );
}
