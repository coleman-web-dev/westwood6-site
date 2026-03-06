'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Printer } from 'lucide-react';
import type { CheckWithDetails, CheckSignature } from '@/lib/types/check';

interface CheckPrintPreviewProps {
  check: CheckWithDetails;
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero';

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  }

  const dollars = Math.floor(amount / 100);
  const cents = amount % 100;

  return `${convert(dollars)} and ${cents.toString().padStart(2, '0')}/100`;
}

export function CheckPrintPreview({
  check,
  communityId,
  open,
  onOpenChange,
}: CheckPrintPreviewProps) {
  const [signatures, setSignatures] = useState<(CheckSignature & { signedUrl?: string })[]>([]);

  useEffect(() => {
    if (!open) return;

    async function fetchSignatures() {
      if (!check.approvals?.length) return;

      const supabase = createClient();
      const sigIds = check.approvals
        .filter((a) => a.status === 'approved' && a.signature_id)
        .map((a) => a.signature_id!);

      if (sigIds.length === 0) return;

      const { data: sigs } = await supabase
        .from('check_signatures')
        .select('*')
        .in('id', sigIds);

      if (!sigs) return;

      // Get signed URLs for each signature
      const withUrls = await Promise.all(
        sigs.map(async (sig) => {
          const { data } = await supabase.storage
            .from('hoa-documents')
            .createSignedUrl(sig.file_path, 300);
          return { ...sig, signedUrl: data?.signedUrl };
        }),
      );

      setSignatures(withUrls as (CheckSignature & { signedUrl?: string })[]);
    }

    fetchSignatures();
  }, [open, check.approvals, communityId]);

  function handlePrint() {
    window.print();
  }

  const formattedAmount = (check.amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const amountInWords = numberToWords(check.amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl print:max-w-none print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Print Preview</DialogTitle>
        </DialogHeader>

        <div className="print:hidden flex justify-end mb-2">
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

        {/* Check Layout */}
        <div
          className="border-2 border-gray-800 rounded-lg p-6 bg-white text-black"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {/* Top row: Check number and date */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-lg font-bold">Check #{check.check_number}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Date</div>
              <div className="text-base border-b border-gray-400 pb-0.5 min-w-[140px]">
                {new Date(check.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Pay to the order of */}
          <div className="mb-4">
            <div className="flex items-end gap-2">
              <span className="text-xs text-gray-600 shrink-0 pb-0.5">PAY TO THE ORDER OF</span>
              <div className="flex-1 border-b border-gray-400 pb-0.5 text-base font-medium">
                {check.payee_name}
              </div>
              <div className="shrink-0 border border-gray-800 px-3 py-1 text-base font-bold">
                {formattedAmount}
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="mb-6">
            <div className="flex items-end gap-2">
              <div className="flex-1 border-b border-gray-400 pb-0.5 text-sm">
                {amountInWords}
              </div>
              <span className="text-xs text-gray-600 shrink-0 pb-0.5">DOLLARS</span>
            </div>
          </div>

          {/* Memo */}
          <div className="mb-6">
            <div className="flex items-end gap-2">
              <span className="text-xs text-gray-600 shrink-0 pb-0.5">MEMO</span>
              <div className="flex-1 border-b border-gray-400 pb-0.5 text-sm">
                {check.memo || ''}
              </div>
            </div>
          </div>

          {/* Signature line(s) */}
          <div className="flex justify-end gap-8">
            {signatures.length > 0 ? (
              signatures.map((sig, i) => (
                <div key={sig.id} className="text-center">
                  {sig.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sig.signedUrl}
                      alt={`Signature ${i + 1}`}
                      className="h-12 object-contain mb-1"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="border-t border-gray-400 pt-0.5 text-xs text-gray-600 min-w-[160px]">
                    Authorized Signature
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center">
                <div className="h-12" />
                <div className="border-t border-gray-400 pt-0.5 text-xs text-gray-600 min-w-[200px]">
                  Authorized Signature
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print-only: add check stub below */}
        <div className="hidden print:block mt-8 border-t-2 border-dashed border-gray-400 pt-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Check #</div>
              <div>{check.check_number}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Date</div>
              <div>{new Date(check.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Payee</div>
              <div>{check.payee_name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Amount</div>
              <div>{formattedAmount}</div>
            </div>
          </div>
          {check.memo && (
            <div className="mt-2">
              <div className="text-xs text-gray-500">Memo</div>
              <div className="text-sm">{check.memo}</div>
            </div>
          )}
          {check.expense_account && (
            <div className="mt-2">
              <div className="text-xs text-gray-500">Expense Category</div>
              <div className="text-sm">
                {check.expense_account.code} - {check.expense_account.name}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
