'use client';

import { useRef, useState, useEffect } from 'react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '@/components/landing-page/landing-page-shell';
import { LandingPageShell } from '@/components/landing-page/landing-page-shell';
import { Monitor } from 'lucide-react';

interface LandingPagePreviewProps {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
}

export function LandingPagePreview({
  community,
  config,
  data,
}: LandingPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setScale(width / 1280);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const hasData =
    data.boardMembers.length > 0 ||
    data.publicDocs.length > 0 ||
    data.amenities.length > 0 ||
    data.announcements.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Monitor className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
        <span className="text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
          Live Preview
        </span>
        {!hasData && (
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-auto">
            No community data yet
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative overflow-y-auto overflow-x-hidden rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-white"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        <div
          style={{
            width: 1280,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <LandingPageShell
            community={community}
            config={config}
            data={data}
            slug={community.slug}
            isMember={false}
          />
        </div>
      </div>
    </div>
  );
}
