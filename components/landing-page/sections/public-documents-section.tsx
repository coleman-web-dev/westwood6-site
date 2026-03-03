import { FileText, Download } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PublicDocumentsSection({ data }: Props) {
  if (data.publicDocs.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Community Documents
        </h2>
        <div className="space-y-3">
          {data.publicDocs.map((doc) => (
            <a
              key={doc.id}
              href={doc.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors group"
            >
              <div className="shrink-0 text-gray-400 group-hover:text-gray-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.title}
                </p>
                {doc.file_size != null && doc.file_size > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFileSize(doc.file_size)}
                  </p>
                )}
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
