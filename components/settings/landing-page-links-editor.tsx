'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import type { LandingQuickLink } from '@/lib/types/landing';

interface LinksEditorProps {
  links: LandingQuickLink[];
  onChange: (links: LandingQuickLink[]) => void;
}

export function LandingPageLinksEditor({ links, onChange }: LinksEditorProps) {
  function handleAdd() {
    onChange([...links, { label: '', url: '' }]);
  }

  function handleRemove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  function handleUpdate(index: number, field: keyof LandingQuickLink, value: string) {
    onChange(links.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  return (
    <div className="space-y-3">
      {links.map((link, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Link label"
              value={link.label}
              onChange={(e) => handleUpdate(i, 'label', e.target.value)}
              maxLength={50}
            />
            <Input
              placeholder="https://..."
              value={link.url}
              onChange={(e) => handleUpdate(i, 'url', e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => handleRemove(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1" />
        Add Link
      </Button>
    </div>
  );
}
