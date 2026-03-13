'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCommunityDialog({ open, onOpenChange }: CreateCommunityDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
    setError('');
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setError('');
  }

  function handleClose() {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setError('');
    onOpenChange(false);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Community name is required');
      return;
    }
    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create community');
        return;
      }

      toast.success(`Created ${data.community.name}`);
      handleClose();
      window.location.href = `/${data.community.slug}/dashboard`;
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark">
        <DialogHeader>
          <DialogTitle className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            New Community
          </DialogTitle>
          <DialogDescription className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            Create a new community to manage on DuesIQ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="community-name" className="text-label text-text-primary-light dark:text-text-primary-dark">
              Community Name
            </Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Westwood Community"
              className="rounded-pill"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-slug" className="text-label text-text-primary-light dark:text-text-primary-dark">
              URL Slug
            </Label>
            <Input
              id="community-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="westwood"
              className="rounded-pill"
            />
            {slug && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                duesiq.com/{slug}
              </p>
            )}
          </div>

          {error && (
            <p className="text-meta text-[#FF5A5A]">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="rounded-pill"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !slug.trim()}
            className="rounded-pill bg-secondary-400 text-primary-900 hover:bg-secondary-400/90"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
