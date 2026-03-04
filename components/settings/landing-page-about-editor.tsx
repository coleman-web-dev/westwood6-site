'use client';

import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { AiGenerateButton } from './ai-generate-button';

interface AboutEditorProps {
  communityName: string;
  aboutTitle: string | null;
  aboutBody: string | null;
  onTitleChange: (val: string | null) => void;
  onBodyChange: (val: string | null) => void;
}

export function LandingPageAboutEditor({
  communityName,
  aboutTitle,
  aboutBody,
  onTitleChange,
  onBodyChange,
}: AboutEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Section Title
          </label>
          <AiGenerateButton
            field="about_title"
            communityName={communityName}
            onGenerated={(text) => onTitleChange(text)}
          />
        </div>
        <Input
          placeholder="About Our Community"
          value={aboutTitle || ''}
          onChange={(e) => onTitleChange(e.target.value || null)}
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Description
          </label>
          <AiGenerateButton
            field="about_body"
            communityName={communityName}
            onGenerated={(text) => onBodyChange(text)}
          />
        </div>
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
