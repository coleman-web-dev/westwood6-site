'use client';

import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';

interface AboutEditorProps {
  aboutTitle: string | null;
  aboutBody: string | null;
  onTitleChange: (val: string | null) => void;
  onBodyChange: (val: string | null) => void;
}

export function LandingPageAboutEditor({
  aboutTitle,
  aboutBody,
  onTitleChange,
  onBodyChange,
}: AboutEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Section Title
        </label>
        <Input
          placeholder="About Our Community"
          value={aboutTitle || ''}
          onChange={(e) => onTitleChange(e.target.value || null)}
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Description
        </label>
        <Textarea
          placeholder="Tell visitors about your community..."
          value={aboutBody || ''}
          onChange={(e) => onBodyChange(e.target.value || null)}
          rows={6}
          className="resize-none"
        />
      </div>
    </div>
  );
}
