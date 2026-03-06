'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
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
} from '@/components/shared/ui/dialog';
import {
  Upload,
  FileText,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { batchApplyAICategorizations } from '@/lib/actions/ai-statement-actions';
import type { StatementUpload, AIStatementResults } from '@/lib/types/banking';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AIStatementProcessorProps {
  communityId: string;
}

export function AIStatementProcessor({ communityId }: AIStatementProcessorProps) {
  const [uploads, setUploads] = useState<StatementUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<StatementUpload | null>(null);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUploads = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('statement_uploads')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    setUploads((data as StatementUpload[]) || []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('communityId', communityId);
      formData.append('periodMonth', month);
      formData.append('periodYear', year);

      const response = await fetch('/api/accounting/process-statement', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      toast.success(
        `Statement processed. Found ${result.results.transactions.length} transactions and ${result.results.checks.length} checks.`,
      );
      fetchUploads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process statement.');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleApplyAll(uploadId: string) {
    setApplying(uploadId);
    try {
      const result = await batchApplyAICategorizations(communityId, uploadId);
      toast.success(
        `Applied ${result.applied} categorizations. ${result.skipped} skipped.`,
      );
      fetchUploads();
    } catch {
      toast.error('Failed to apply categorizations.');
    }
    setApplying(null);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'uploaded':
        return <Badge variant="outline" className="text-meta">Uploaded</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="text-meta">Processing</Badge>;
      case 'completed':
        return <Badge className="text-meta bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-meta">Failed</Badge>;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-32 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-secondary-400" />
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            AI Statement Processor
          </h3>
        </div>

        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-4">
          Upload a monthly bank statement PDF. AI will extract transactions, read check images,
          match payees to vendors, and identify homeowner payments.
        </p>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-meta">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32 h-8 text-meta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24 h-8 text-meta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload Statement
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Previous Uploads */}
      {uploads.length > 0 && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Processed Statements
            </h3>
          </div>

          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {uploads.map((upload) => {
              const results = upload.ai_results as AIStatementResults | null;

              return (
                <div
                  key={upload.id}
                  className="px-card-padding py-3 flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {MONTHS[upload.period_month - 1]} {upload.period_year}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {upload.file_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {upload.status === 'completed' && results && (
                      <>
                        <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                          {upload.transactions_found} txns
                        </span>
                        <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                          {upload.checks_found} checks
                        </span>
                        {upload.auto_categorized > 0 && (
                          <Badge variant="outline" className="text-meta text-green-600">
                            {upload.auto_categorized} matched
                          </Badge>
                        )}
                      </>
                    )}

                    {getStatusBadge(upload.status)}

                    {upload.status === 'completed' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUpload(upload)}
                          className="h-7 text-meta"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplyAll(upload.id)}
                          disabled={applying === upload.id}
                          className="h-7 text-meta"
                        >
                          {applying === upload.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Apply All'
                          )}
                        </Button>
                      </div>
                    )}

                    {upload.status === 'failed' && (
                      <span className="text-meta text-red-500" title={upload.error_message || ''}>
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Detail Dialog */}
      {selectedUpload && (
        <AIResultsDialog
          upload={selectedUpload}
          open={!!selectedUpload}
          onOpenChange={(open) => !open && setSelectedUpload(null)}
        />
      )}
    </div>
  );
}

function AIResultsDialog({
  upload,
  open,
  onOpenChange,
}: {
  upload: StatementUpload;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const results = upload.ai_results as AIStatementResults | null;
  if (!results) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-page-title">
            {MONTHS[upload.period_month - 1]} {upload.period_year} Statement Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 text-center">
              <p className="text-metric-xl text-green-600 dark:text-green-400 tabular-nums">
                {(results.summary.total_deposits / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Deposits</p>
            </div>
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 text-center">
              <p className="text-metric-xl text-red-500 dark:text-red-400 tabular-nums">
                {(results.summary.total_withdrawals / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Withdrawals</p>
            </div>
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 text-center">
              <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark tabular-nums">
                {results.summary.ending_balance
                  ? (results.summary.ending_balance / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })
                  : '-'}
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Ending Balance
              </p>
            </div>
          </div>

          {/* Checks */}
          {results.checks.length > 0 && (
            <div>
              <h4 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
                Checks ({results.checks.length})
              </h4>
              <div className="space-y-2">
                {results.checks.map((check, i) => (
                  <div
                    key={i}
                    className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark">
                        #{check.check_number}
                      </span>
                      <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
                        {(check.amount / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </span>
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        {new Date(check.date).toLocaleDateString()}
                      </span>
                      {check.is_vendor_check && (
                        <Badge variant="outline" className="text-meta gap-1">
                          <Building2 className="h-3 w-3" />
                          Vendor
                        </Badge>
                      )}
                      {check.is_homeowner_check && (
                        <Badge variant="outline" className="text-meta gap-1">
                          <Users className="h-3 w-3" />
                          Homeowner
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-meta text-text-secondary-light dark:text-text-secondary-dark">
                      <span>{check.payer}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{check.payee}</span>
                    </div>
                    {check.memo && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                        Memo: {check.memo}
                      </p>
                    )}
                    {check.matched_vendor_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-meta text-green-600 dark:text-green-400">
                          Matched to vendor
                        </span>
                      </div>
                    )}
                    {check.matched_member_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-meta text-green-600 dark:text-green-400">
                          Matched to homeowner
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div>
            <h4 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
              All Transactions ({results.transactions.length})
            </h4>
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
              <div className="divide-y divide-stroke-light dark:divide-stroke-dark max-h-64 overflow-y-auto">
                {results.transactions.map((txn, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2">
                    <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-16 shrink-0">
                      {new Date(txn.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 truncate">
                      {txn.description}
                    </span>
                    {txn.matched_vendor_name && (
                      <Badge variant="outline" className="text-meta shrink-0">
                        {txn.matched_vendor_name}
                      </Badge>
                    )}
                    <span
                      className={`text-body tabular-nums shrink-0 ${
                        txn.amount > 0
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {txn.amount > 0 ? '-' : '+'}
                      {(Math.abs(txn.amount) / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
