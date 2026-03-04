'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { toast } from 'sonner';
import type { LandingGalleryImage } from '@/lib/types/landing';

interface GalleryEditorProps {
  communityId: string;
  images: LandingGalleryImage[];
  onChange: (images: LandingGalleryImage[]) => void;
}

export function LandingPageGalleryEditor({
  communityId,
  images,
  onChange,
}: GalleryEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const newImages: LandingGalleryImage[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5 MB).`);
        continue;
      }

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-');
      const path = `${communityId}/landing/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from('community-assets')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        console.error('Gallery upload error:', error);
        toast.error(error.message || `Failed to upload ${file.name}.`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('community-assets')
        .getPublicUrl(path);

      newImages.push({ url: urlData.publicUrl, caption: null });
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast.success(`${newImages.length} image${newImages.length > 1 ? 's' : ''} uploaded.`);
    }

    setUploading(false);
    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function handleCaptionChange(index: number, caption: string) {
    onChange(
      images.map((img, i) =>
        i === index ? { ...img, caption: caption || null } : img
      )
    );
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="rounded-xl border border-stroke-light dark:border-stroke-dark overflow-hidden"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={img.url}
                  alt={img.caption || `Gallery image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-6 w-6"
                  onClick={() => handleRemove(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2">
                <Input
                  placeholder="Caption (optional)"
                  value={img.caption || ''}
                  onChange={(e) => handleCaptionChange(i, e.target.value)}
                  className="text-meta h-7"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-gray-400 transition-colors"
      >
        <Upload className="h-5 w-5" />
        <span className="text-body">
          {uploading ? 'Uploading...' : 'Upload images'}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
