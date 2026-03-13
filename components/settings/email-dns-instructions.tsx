'use client';

import { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shared/ui/collapsible';
import type { DnsRecord } from '@/lib/types/database';

interface DnsInstructionsProps {
  records: DnsRecord[];
  onVerify: () => void;
  verifying: boolean;
}

export function DnsInstructions({ records, onVerify, verifying }: DnsInstructionsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  async function copyToClipboard(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'temporary_failure':
        return 'Pending';
      default:
        return 'Pending';
    }
  }

  const allVerified = records.length > 0 && records.every((r) => r.status === 'verified');

  return (
    <div className="space-y-4">
      <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-3">
          Add these DNS records to your domain to authorize DuesIQ to send email on your behalf.
          DNS changes can take up to 72 hours to propagate.
        </p>

        {/* DNS records table */}
        <div className="overflow-x-auto">
          <table className="w-full text-meta">
            <thead>
              <tr className="border-b border-stroke-light dark:border-stroke-dark">
                <th className="text-left py-2 pr-3 text-text-muted-light dark:text-text-muted-dark font-medium">
                  Type
                </th>
                <th className="text-left py-2 pr-3 text-text-muted-light dark:text-text-muted-dark font-medium">
                  Name
                </th>
                <th className="text-left py-2 pr-3 text-text-muted-light dark:text-text-muted-dark font-medium">
                  Value
                </th>
                <th className="text-left py-2 pr-3 text-text-muted-light dark:text-text-muted-dark font-medium">
                  Status
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {records.map((record, i) => (
                <tr key={i} className="border-b border-stroke-light/50 dark:border-stroke-dark/50">
                  <td className="py-2 pr-3 text-text-primary-light dark:text-text-primary-dark font-mono">
                    {record.type}
                  </td>
                  <td className="py-2 pr-3 text-text-primary-light dark:text-text-primary-dark font-mono text-[10px] break-all max-w-[200px]">
                    {record.name}
                  </td>
                  <td className="py-2 pr-3 text-text-primary-light dark:text-text-primary-dark font-mono text-[10px] break-all max-w-[300px]">
                    {record.value}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1">
                      {statusIcon(record.status)}
                      <span className="text-text-secondary-light dark:text-text-secondary-dark">
                        {statusLabel(record.status)}
                      </span>
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => copyToClipboard(record.value, i)}
                      className="p-1 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                      title="Copy value"
                    >
                      {copiedIndex === i ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify button */}
      <div className="flex items-center gap-3">
        <Button onClick={onVerify} disabled={verifying || allVerified} size="sm">
          {verifying ? 'Checking...' : allVerified ? 'All Records Verified' : 'Check Verification'}
        </Button>
        {allVerified && (
          <span className="text-meta text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Domain is verified and active
          </span>
        )}
      </div>

      {/* How-to guide */}
      <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-body text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400 transition-colors">
          {guideOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          How to add DNS records
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-2 text-meta text-text-secondary-light dark:text-text-secondary-dark">
            <p>
              Log into your domain registrar (where you purchased your domain) and find the DNS
              settings page. Add each record from the table above.
            </p>
            <p className="font-medium text-text-primary-light dark:text-text-primary-dark">
              Common registrars:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <a href="https://www.godaddy.com/help/manage-dns-records-680" target="_blank" rel="noopener noreferrer" className="text-secondary-500 hover:underline">
                  GoDaddy
                </a>
              </li>
              <li>
                <a href="https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/" target="_blank" rel="noopener noreferrer" className="text-secondary-500 hover:underline">
                  Namecheap
                </a>
              </li>
              <li>
                <a href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/" target="_blank" rel="noopener noreferrer" className="text-secondary-500 hover:underline">
                  Cloudflare
                </a>
              </li>
              <li>
                <a href="https://support.google.com/domains/answer/3290350" target="_blank" rel="noopener noreferrer" className="text-secondary-500 hover:underline">
                  Google Domains
                </a>
              </li>
            </ul>
            <p>
              After adding the records, click &quot;Check Verification&quot; above. It may take a few minutes
              to several hours for DNS changes to propagate.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
