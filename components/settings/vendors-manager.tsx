'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Upload, X, Pencil, Eye, EyeOff, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { toast } from 'sonner';
import { DEFAULT_VENDORS_DISCLAIMER, DEFAULT_VENDORS_CONFIG } from '@/lib/types/landing';
import type { CommunityVendor, CommunityVendorsConfig, VendorVisibility } from '@/lib/types/landing';
import type { CommunityTheme } from '@/lib/types/database';

interface Props {
  communityId: string;
  communityName: string;
  communityTheme: CommunityTheme;
}

const EMPTY_VENDOR: CommunityVendor = {
  name: '',
  description: '',
  image_url: null,
  phone: null,
  email: null,
  website: null,
  category: null,
  visibility: 'public',
};

const VISIBILITY_LABELS: Record<VendorVisibility, string> = {
  public: 'Public',
  community: 'Community Only',
  hidden: 'Hidden',
};

const VISIBILITY_DESCRIPTIONS: Record<VendorVisibility, string> = {
  public: 'Landing page + dashboard',
  community: 'Dashboard only',
  hidden: 'Board management only',
};

export function VendorsManager({ communityId, communityName, communityTheme }: Props) {
  const router = useRouter();
  const config = communityTheme.vendors_config ?? DEFAULT_VENDORS_CONFIG;
  const vendors = config.vendors ?? [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<CommunityVendor>(EMPTY_VENDOR);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(config.title ?? '');
  const [disclaimer, setDisclaimer] = useState(config.disclaimer ?? '');
  const [savingMeta, setSavingMeta] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveConfig(updated: CommunityVendorsConfig) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...communityTheme,
          vendors_config: updated,
        },
      })
      .eq('id', communityId);

    setSaving(false);
    if (error) {
      toast.error('Failed to save vendors.');
      return false;
    }
    router.refresh();
    return true;
  }

  function openNew() {
    setEditingIndex(-1);
    setDraft(EMPTY_VENDOR);
    // Auto-populate disclaimer on first vendor add
    if (vendors.length === 0 && !config.disclaimer) {
      setDisclaimer(DEFAULT_VENDORS_DISCLAIMER.replace('{community_name}', communityName));
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

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Vendor name is required.');
      return;
    }
    if (!draft.description.trim()) {
      toast.error('Vendor description is required.');
      return;
    }

    let newVendors: CommunityVendor[];
    if (editingIndex === -1) {
      newVendors = [...vendors, draft];
    } else if (editingIndex !== null) {
      newVendors = vendors.map((v, i) => (i === editingIndex ? draft : v));
    } else {
      return;
    }

    const ok = await saveConfig({
      title: title || null,
      disclaimer: disclaimer || null,
      vendors: newVendors,
    });
    if (ok) {
      toast.success(editingIndex === -1 ? 'Vendor added.' : 'Vendor updated.');
      handleClose();
    }
  }

  async function handleDelete(index: number) {
    const newVendors = vendors.filter((_, i) => i !== index);
    const ok = await saveConfig({
      title: title || null,
      disclaimer: disclaimer || null,
      vendors: newVendors,
    });
    if (ok) toast.success('Vendor removed.');
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    const ok = await saveConfig({
      title: title || null,
      disclaimer: disclaimer || null,
      vendors,
    });
    setSavingMeta(false);
    if (ok) toast.success('Vendor settings updated.');
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
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
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

  function visibilityIcon(vis: VendorVisibility) {
    switch (vis) {
      case 'public': return <Globe className="h-3.5 w-3.5 text-green-500" />;
      case 'community': return <Eye className="h-3.5 w-3.5 text-blue-500" />;
      case 'hidden': return <EyeOff className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />;
    }
  }

  const dialogOpen = editingIndex !== null;

  return (
    <div className="space-y-4">
      {/* Section title */}
      <div className="space-y-1.5">
        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Section Title
        </label>
        <Input
          placeholder="Local Vendors & Businesses"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Disclaimer */}
      {vendors.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Disclaimer
          </label>
          <Textarea
            placeholder="Optional disclaimer text..."
            value={disclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      {/* Save title/disclaimer */}
      {vendors.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveMeta}
          disabled={savingMeta}
        >
          {savingMeta ? 'Saving...' : 'Save Title & Disclaimer'}
        </Button>
      )}

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
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                  <span className="text-sm font-bold text-gray-400">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                  {vendor.name}
                </p>
                <div className="flex items-center gap-2">
                  {vendor.category && (
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {vendor.category}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-meta">
                    {visibilityIcon(vendor.visibility)}
                    <span className="text-text-muted-light dark:text-text-muted-dark">
                      {VISIBILITY_LABELS[vendor.visibility]}
                    </span>
                  </span>
                </div>
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

      <Button variant="outline" size="sm" onClick={openNew} disabled={saving}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Vendor
      </Button>

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

            {/* Visibility */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Visibility
              </label>
              <Select
                value={draft.visibility}
                onValueChange={(v) => setDraft({ ...draft, visibility: v as VendorVisibility })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['public', 'community', 'hidden'] as VendorVisibility[]).map((vis) => (
                    <SelectItem key={vis} value={vis}>
                      <div className="flex items-center gap-2">
                        {VISIBILITY_LABELS[vis]}
                        <span className="text-text-muted-light dark:text-text-muted-dark text-meta">
                          ({VISIBILITY_DESCRIPTIONS[vis]})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingIndex === -1 ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
