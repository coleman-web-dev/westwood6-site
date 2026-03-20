import { FileText, Download, ArrowDownToLine } from 'lucide-react';
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
      <section
        className="py-24 sm:py-28 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-6xl">
          {/* Two-column section header */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-16 mb-14">
            <div className="lg:w-2/5">
              <div className="inline-flex items-center gap-2 mb-4">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Documents
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Access important community documents
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                Documents
              </h2>
            </div>
          </div>

          {/* 2-column card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {data.publicDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-stone-50 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg group"
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--landing-primary) 8%, white)',
                  }}
                >
                  <FileText
                    className="h-6 w-6"
                    style={{ color: 'var(--landing-primary)' }}
                  />
                </div>
                <p
                  className="text-sm font-bold"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {doc.title}
                </p>
                {doc.category && (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-medium mt-2"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--landing-accent) 10%, white)',
                      color: 'var(--landing-accent)',
                    }}
                  >
                    {doc.category}
                  </span>
                )}
                {doc.file_size != null && doc.file_size > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatFileSize(doc.file_size)}
                  </p>
                )}
                <div className="flex items-center justify-end mt-3">
                  <Download className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern ─────────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: 'var(--landing-primary)' }}
            >
              Community Documents
            </h2>
            <div
              className="w-12 h-1 rounded-full mx-auto"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {data.publicDocs.map((doc, i) => (
              <a
                key={doc.id}
                href={doc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 px-6 py-4 transition-all group hover:bg-gray-50 ${
                  i > 0 ? 'border-t border-gray-100' : ''
                }`}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor =
                    'var(--landing-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                }}
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
                  {doc.title}
                </span>
                <span
                  className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  {doc.category}
                </span>
                {doc.file_size != null && doc.file_size > 0 && (
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {formatFileSize(doc.file_size)}
                  </span>
                )}
                <ArrowDownToLine
                  className="h-4 w-4 text-gray-300 shrink-0 transition-colors"
                  style={{ color: undefined }}
                  onMouseEnter={() => {}}
                />
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ──────────────────────────────────────────── */
  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl font-bold mb-16 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Community Documents
        </h2>
        <div className="space-y-0">
          {data.publicDocs.map((doc, i) => (
            <a
              key={doc.id}
              href={doc.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-6 group hover:opacity-70 transition-opacity py-6 border-b border-gray-100 last:border-b-0"
            >
              <span
                className="text-2xl font-bold shrink-0 w-10 text-right tabular-nums leading-tight"
                style={{ color: 'var(--landing-accent)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-base font-medium truncate"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    {doc.category}
                  </span>
                  {doc.file_size != null && doc.file_size > 0 && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Download className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
