import { FileText, Download } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
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

export function PublicDocumentsSection({ config, data }: Props) {
  if (data.publicDocs.length === 0) return null;

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.documents;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
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

  /* ── Modern (compact table rows) ─────────────────────────── */
  if (template === 'modern') {
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Community Documents
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {data.publicDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                  {doc.title}
                </span>
                <span
                  className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  {doc.category}
                </span>
                <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (numbered list) ───────────────────────────── */
  return (
    <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-10 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Community Documents
        </h2>
        <div className="space-y-5">
          {data.publicDocs.map((doc, i) => (
            <a
              key={doc.id}
              href={doc.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 group hover:opacity-80 transition-opacity"
            >
              <span
                className="text-lg font-bold shrink-0 w-8 text-right"
                style={{ color: 'var(--landing-accent)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{doc.category}</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
