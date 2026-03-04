'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Upload, X, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { toast } from 'sonner';
import { DEFAULT_VENDORS_DISCLAIMER } from '@/lib/types/landing';
import type { LandingVendor } from '@/lib/types/landing';

interface VendorsEditorProps {
  communityId: string;
  communityName: string;
  vendorsTitle: string | null;
  vendorsDisclaimer: string | null;
  vendors: LandingVendor[];
  onTitleChange: (val: string | null) => void;
  onDisclaimerChange: (val: string | null) => void;
  onVendorsChange: (vendors: LandingVendor[]) => void;
}

const EMPTY_VENDOR: LandingVendor = {
  name: '',
  description: '',
  image_url: null,
  phone: null,
  email: null,
  website: null,
  category: null,
};

export function LandingPageVendorsEditor({
  communityId,
  communityName,
  vendorsTitle,
  vendorsDisclaimer,
  vendors,
  onTitleChange,
  onDisclaimerChange,
  onVendorsChange,
}: VendorsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<LandingVendor>(EMPTY_VENDOR);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditingIndex(-1);
    setDraft(EMPTY_VENDOR);
    // Auto-populate disclaimer on first vendor add
    if (vendors.length === 0 && !vendorsDisclaimer) {
      onDisclaimerChange(
        DEFAULT_VENDORS_DISCLAIMER.replace('{community_name}', communityName)
      );
    }
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDraft({ ...vendors[index] });
  }

  function handleClose() {
    setEditingIndex(null);
    setDraft(EMPTY_VENDOR);
  }

  function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Vendor name is required.');
      return;
    }
    if (!draft.description.trim()) {
      toast.error('Vendor description is required.');
      return;
    }

    if (editingIndex === -1) {
      onVendorsChange([...vendors, draft]);
    } else if (editingIndex !== null) {
      onVendorsChange(vendors.map((v, i) => (i === editingIndex ? draft : v)));
    }
    handleClose();
  }

  function handleDelete(index: number) {
    onVendorsChange(vendors.filter((_, i) => i !== index));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
    const path = `${communityId}/landing/vendors/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage
      .from('community-assets')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      toast.error(error.message || 'Failed to upload image.');
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('community-assets')
      .getPublicUrl(path);

    setDraft({ ...draft, image_url: urlData.publicUrl });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    toast.success('Vendor image uploaded.');
  }

  const dialogOpen = editingIndex !== null;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Section Title
        </label>
        <Input
          placeholder="Local Vendors & Businesses"
          value={vendorsTitle || ''}
          onChange={(e) => onTitleChange(e.target.value || null)}
          maxLength={100}
        />
      </div>

      {/* Vendor list */}
      {vendors.length > 0 && (
        <div className="space-y-2">
          {vendors.map((vendor, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3"
            >
              {vendor.image_url ? (
                <img
                  src={vendor.image_url}
                  alt={vendor.name}
                  className="h-10 w-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800"
                >
                  <span className="text-sm font-bold text-gray-400">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                  {vendor.name}
                </p>
                {vendor.category && (
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {vendor.category}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => openEdit(i)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                onClick={() => handleDelete(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={openNew}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Vendor
      </Button>

      {/* Disclaimer */}
      {vendors.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Disclaimer
          </label>
          <Textarea
            placeholder="Optional disclaimer text..."
            value={vendorsDisclaimer || ''}
            onChange={(e) => onDisclaimerChange(e.target.value || null)}
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIndex === -1 ? 'Add Vendor' : 'Edit Vendor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Image
              </label>
              {draft.image_url ? (
                <div className="relative rounded-lg overflow-hidden border border-stroke-light dark:border-stroke-dark">
                  <img
                    src={draft.image_url}
                    alt="Vendor"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setDraft({ ...draft, image_url: null })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 w-full h-24 rounded-lg border-2 border-dashed border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-gray-400 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-body">
                    {uploading ? 'Uploading...' : 'Upload image'}
                  </span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Name *
              </label>
              <Input
                placeholder="Business name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Category
              </label>
              <Input
                placeholder="e.g. Landscaping, Plumbing, Realtor"
                value={draft.category || ''}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value || null })
                }
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description *
              </label>
              <Textarea
                placeholder="Describe the vendor's services..."
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Phone
                </label>
                <Input
                  placeholder="(555) 123-4567"
                  value={draft.phone || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Email
                </label>
                <Input
                  placeholder="contact@vendor.com"
                  value={draft.email || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Website
              </label>
              <Input
                placeholder="https://vendor.com"
                value={draft.website || ''}
                onChange={(e) =>
                  setDraft({ ...draft, website: e.target.value || null })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingIndex === -1 ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
