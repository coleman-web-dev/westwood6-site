'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { compareAddresses } from '@/lib/utils/address-normalize';
import {
  importWalletBalances,
  checkPreviousWalletImport,
  undoWalletImport,
  type WalletImportRow,
  type PreviousImportInfo,
} from '@/lib/actions/wallet-import-actions';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wallet,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Undo2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────

interface ParsedWalletRow {
  timestamp: string;
  household: string;
  address: string;
  txId: string;
  amount: number; // dollars, signed
  name: string;
  notes: string;
  voided: boolean;
}

interface AddressBalance {
  address: string;
  household: string;
  netCents: number;
  credits: number;
  charges: number;
  invoicesCents: number; // amounts owed from invoice-type rows
  txCount: number;
  rows: ParsedWalletRow[];
}

interface MatchedBalance extends AddressBalance {
  unitId: string | null;
  unitAddress: string;
  confidence: 'exact' | 'fuzzy' | 'unmatched';
}

type Step = 'upload' | 'review' | 'executing' | 'done';

interface UnitRecord {
  id: string;
  address: string;
  unit_number: string;
}

// ─── CSV Parser ──────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function parseWalletCSV(text: string): ParsedWalletRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    return {
      timestamp: cols[0] || '',
      household: (cols[1] || '').trim(),
      address: (cols[3] || '').trim(),
      txId: (cols[8] || '').trim(),
      amount: parseFloat(cols[9]) || 0,
      name: (cols[10] || '').trim(),
      notes: (cols[11] || '').trim(),
      voided: (cols[12] || '').trim().toUpperCase() === 'TRUE',
    };
  });
}

/**
 * Detect if a row is an invoice (bill/amount owed) rather than a wallet transaction.
 * Invoice rows have no household name and # prefixed transaction IDs.
 * Their positive amounts represent money OWED, not credits.
 */
function isInvoiceRow(row: ParsedWalletRow): boolean {
  // No household name + # prefixed ID = invoice created in Membershine
  if (!row.household && row.txId.startsWith('#')) return true;
  // "Past Due" in name with no household = definitely an invoice
  if (!row.household && row.name.toLowerCase().includes('past due')) return true;
  return false;
}

function computeBalances(rows: ParsedWalletRow[]): AddressBalance[] {
  const active = rows.filter((r) => !r.voided);
  const byAddress: Record<string, AddressBalance> = {};

  for (const r of active) {
    if (!r.address) continue;
    const addr = r.address;
    if (!byAddress[addr]) {
      byAddress[addr] = {
        address: addr,
        household: r.household || '',
        netCents: 0,
        credits: 0,
        charges: 0,
        invoicesCents: 0,
        txCount: 0,
        rows: [],
      };
    }
    if (!byAddress[addr].household && r.household) {
      byAddress[addr].household = r.household;
    }

    const cents = Math.round(r.amount * 100);

    if (isInvoiceRow(r)) {
      // Invoice rows: positive amounts are debts, not credits.
      // They don't affect wallet balance - they're outstanding invoices.
      byAddress[addr].invoicesCents += cents;
    } else {
      // Wallet transactions: positive = credit, negative = charge
      byAddress[addr].netCents += cents;
      if (r.amount > 0) byAddress[addr].credits += cents;
      else byAddress[addr].charges += cents;
    }

    byAddress[addr].txCount++;
    byAddress[addr].rows.push(r);
  }

  return Object.values(byAddress).sort((a, b) => a.address.localeCompare(b.address));
}

function matchToUnits(balances: AddressBalance[], units: UnitRecord[]): MatchedBalance[] {
  return balances.map((b) => {
    // Try exact normalized match first
    let bestUnit: UnitRecord | null = null;
    let bestScore = 0;
    let confidence: 'exact' | 'fuzzy' | 'unmatched' = 'unmatched';

    for (const u of units) {
      const score = compareAddresses(b.address, u.address);
      if (score > bestScore) {
        bestScore = score;
        bestUnit = u;
      }
    }

    if (bestScore >= 0.95) confidence = 'exact';
    else if (bestScore >= 0.6) confidence = 'fuzzy';
    else {
      bestUnit = null;
      confidence = 'unmatched';
    }

    return {
      ...b,
      unitId: bestUnit?.id || null,
      unitAddress: bestUnit?.address || '',
      confidence,
    };
  });
}

// ─── Component ──────────────────────────────────────

export function WalletImportSection() {
  const { community } = useCommunity();
  const [step, setStep] = useState<Step>('upload');
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [matches, setMatches] = useState<MatchedBalance[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    processed: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Previous import detection
  const [previousImport, setPreviousImport] = useState<PreviousImportInfo | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (community?.id) {
      checkPreviousWalletImport(community.id).then(setPreviousImport);
    }
  }, [community?.id]);

  const handleUndo = useCallback(async () => {
    if (!community?.id) return;
    setUndoing(true);
    try {
      const result = await undoWalletImport(community.id);
      if (result.success) {
        toast.success(`Reversed ${result.reversed} wallet imports. Balances reset.`);
        setPreviousImport({ found: false, count: 0, totalCents: 0, importedAt: null });
      } else {
        toast.error(`Reversed ${result.reversed} of ${previousImport?.count || 0}. ${result.errors.length} error(s).`);
        // Refresh state
        checkPreviousWalletImport(community.id).then(setPreviousImport);
      }
    } catch (err) {
      toast.error('Undo failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUndoing(false);
    }
  }, [community?.id, previousImport?.count]);

  // Stats
  const stats = useMemo(() => {
    const matched = matches.filter((m) => m.unitId && m.netCents > 0);
    const unmatched = matches.filter((m) => !m.unitId && m.netCents > 0);
    const zero = matches.filter((m) => m.netCents <= 0 && m.invoicesCents === 0);
    const pastDue = matches.filter((m) => m.invoicesCents > 0 && m.netCents <= 0);
    const totalCredits = matched.reduce((s, m) => s + m.netCents, 0);
    const totalOwed = matches.reduce((s, m) => s + m.invoicesCents, 0);
    return { matched, unmatched, zero, pastDue, totalCredits, totalOwed };
  }, [matches]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const rows = parseWalletCSV(text);
      if (rows.length === 0) {
        toast.error('No data found in CSV');
        return;
      }

      // Fetch units
      const supabase = createClient();
      const { data: unitData, error } = await supabase
        .from('units')
        .select('id, address, unit_number')
        .eq('community_id', community.id)
        .order('address');

      if (error || !unitData) {
        toast.error('Failed to load units');
        return;
      }

      setUnits(unitData);

      const balances = computeBalances(rows);
      const matched = matchToUnits(balances, unitData);
      setMatches(matched);
      setStep('review');

      toast.success(`Parsed ${rows.length} transactions across ${balances.length} addresses`);
    },
    [community.id]
  );

  const handleUnitChange = useCallback(
    (address: string, unitId: string) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.address !== address) return m;
          const unit = units.find((u) => u.id === unitId);
          return {
            ...m,
            unitId: unitId || null,
            unitAddress: unit?.address || '',
            confidence: unitId ? 'exact' : 'unmatched',
          };
        })
      );
      setEditingUnit(null);
    },
    [units]
  );

  const toggleExpanded = useCallback((address: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const handleImport = useCallback(async () => {
    const toImport: WalletImportRow[] = matches
      .filter((m) => m.unitId && m.netCents > 0)
      .map((m) => ({
        unitId: m.unitId!,
        address: m.address,
        household: m.household,
        amountCents: m.netCents,
        description: `Wallet balance imported from previous system (${m.household || m.address})`,
      }));

    if (toImport.length === 0) {
      toast.error('No matched balances to import');
      return;
    }

    setImporting(true);
    setStep('executing');

    try {
      const result = await importWalletBalances(community.id, toImport);
      setImportResult({
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
      });
      setStep('done');

      if (result.errors.length === 0) {
        toast.success(`Successfully imported ${result.processed} wallet balances`);
      } else {
        toast.error(`Imported ${result.processed} wallets with ${result.errors.length} errors`);
      }
    } catch (err) {
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setStep('review');
    } finally {
      setImporting(false);
    }
  }, [matches, community.id]);

  return (
    <div className="rounded-panel bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark p-card-padding space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-inner-card bg-secondary-100 dark:bg-secondary-900/30">
          <Wallet className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
        </div>
        <div>
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Import Wallet Balances
          </h3>
          <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            Upload a wallet export CSV from your previous system to set starting balances
          </p>
        </div>
      </div>

      {/* Previous Import Warning / Undo */}
      {previousImport?.found && (
        <div className="flex items-center justify-between p-4 rounded-inner-card bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-body font-semibold text-amber-700 dark:text-amber-300">
                Previous Import Detected
              </p>
              <p className="text-meta text-amber-600 dark:text-amber-400">
                {previousImport.count} wallet credits totaling $
                {(previousImport.totalCents / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
                {previousImport.importedAt &&
                  ` (imported ${new Date(previousImport.importedAt).toLocaleDateString()})`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={undoing}
            className="gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            {undoing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4" />
            )}
            {undoing ? 'Reversing...' : 'Undo Import'}
          </Button>
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="border-2 border-dashed border-stroke-light dark:border-stroke-dark rounded-inner-card p-8 text-center space-y-3">
          <FileSpreadsheet className="h-8 w-8 mx-auto text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            Upload your wallet transactions CSV
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Expected columns: Timestamp, Household, Address, Amount, Transaction Name, Is Voided
          </p>
          <label className="inline-block cursor-pointer">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-primary-700 dark:bg-primary-600 text-white text-body hover:bg-primary-800 dark:hover:bg-primary-500 transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              Choose CSV File
            </span>
          </label>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-inner-card bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-3">
              <p className="text-meta text-emerald-600 dark:text-emerald-400">Matched Credits</p>
              <p className="text-metric-xl text-emerald-700 dark:text-emerald-300">
                {stats.matched.length}
              </p>
              <p className="text-meta text-emerald-600/70 dark:text-emerald-400/70">
                ${(stats.totalCredits / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-inner-card bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 p-3">
              <p className="text-meta text-amber-600 dark:text-amber-400">Unmatched</p>
              <p className="text-metric-xl text-amber-700 dark:text-amber-300">
                {stats.unmatched.length}
              </p>
              <p className="text-meta text-amber-600/70 dark:text-amber-400/70">
                Need manual match
              </p>
            </div>
            <div className="rounded-inner-card bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-3">
              <p className="text-meta text-red-600 dark:text-red-400">Past Due (Invoices)</p>
              <p className="text-metric-xl text-red-700 dark:text-red-300">
                {stats.pastDue.length}
              </p>
              <p className="text-meta text-red-600/70 dark:text-red-400/70">
                ${(stats.totalOwed / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} owed
              </p>
            </div>
            <div className="rounded-inner-card bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800/30 p-3">
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Zero Balance
              </p>
              <p className="text-metric-xl text-text-secondary-light dark:text-text-secondary-dark">
                {stats.zero.length}
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Skipped</p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-body">
                <thead className="bg-surface-light-2 dark:bg-surface-dark-2 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark w-8" />
                    <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark">
                      CSV Address
                    </th>
                    <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Household
                    </th>
                    <th className="text-right p-3 text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Wallet Credit
                    </th>
                    <th className="text-right p-3 text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Invoices Owed
                    </th>
                    <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Matched Unit
                    </th>
                    <th className="text-center p-3 text-label text-text-secondary-light dark:text-text-secondary-dark w-20">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                  {matches
                    .filter((m) => m.netCents > 0 || m.invoicesCents > 0)
                    .map((m) => {
                      const isExpanded = expandedRows.has(m.address);
                      const isEditing = editingUnit === m.address;
                      return (
                        <MatchRow
                          key={m.address}
                          match={m}
                          units={units}
                          isExpanded={isExpanded}
                          isEditing={isEditing}
                          onToggleExpand={() => toggleExpanded(m.address)}
                          onStartEdit={() => setEditingUnit(m.address)}
                          onUnitChange={(unitId) => handleUnitChange(m.address, unitId)}
                          onCancelEdit={() => setEditingUnit(null)}
                        />
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zero/negative balances info */}
          {stats.zero.length > 0 && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {stats.zero.length} address(es) with zero or negative balance will be skipped.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload');
                setMatches([]);
                setExpandedRows(new Set());
              }}
            >
              Start Over
            </Button>
            <Button
              onClick={handleImport}
              disabled={stats.matched.length === 0}
              className="gap-2"
            >
              Import {stats.matched.length} Wallet Balances
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Executing Step */}
      {step === 'executing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            Importing wallet balances and posting GL entries...
          </p>
        </div>
      )}

      {/* Done Step */}
      {step === 'done' && importResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-inner-card bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-body font-semibold text-emerald-700 dark:text-emerald-300">
                Import Complete
              </p>
              <p className="text-meta text-emerald-600 dark:text-emerald-400">
                {importResult.processed} wallets credited, {importResult.skipped} skipped
              </p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="p-4 rounded-inner-card bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 space-y-2">
              <p className="text-body font-semibold text-red-700 dark:text-red-300">
                {importResult.errors.length} Error(s)
              </p>
              <ul className="text-meta text-red-600 dark:text-red-400 space-y-1">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setStep('upload');
              setMatches([]);
              setImportResult(null);
              setExpandedRows(new Set());
            }}
          >
            Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Match Row Component ──────────────────────────────

function MatchRow({
  match,
  units,
  isExpanded,
  isEditing,
  onToggleExpand,
  onStartEdit,
  onUnitChange,
  onCancelEdit,
}: {
  match: MatchedBalance;
  units: UnitRecord[];
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onUnitChange: (unitId: string) => void;
  onCancelEdit: () => void;
}) {
  const dollars = (match.netCents / 100).toFixed(2);

  return (
    <>
      <tr
        className={`hover:bg-surface-light-2/50 dark:hover:bg-surface-dark-2/50 ${
          !match.unitId ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
        }`}
      >
        {/* Expand toggle */}
        <td className="p-3">
          <button
            onClick={onToggleExpand}
            className="text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>

        {/* CSV Address */}
        <td className="p-3 text-text-primary-light dark:text-text-primary-dark font-medium">
          {match.address}
        </td>

        {/* Household */}
        <td className="p-3 text-text-secondary-light dark:text-text-secondary-dark">
          {match.household || <span className="text-text-muted-light dark:text-text-muted-dark italic">none</span>}
        </td>

        {/* Wallet Credit */}
        <td className={`p-3 text-right tabular-nums font-semibold ${
          match.netCents > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-text-muted-light dark:text-text-muted-dark'
        }`}>
          {match.netCents > 0 ? `$${dollars}` : '$0.00'}
        </td>

        {/* Invoices Owed */}
        <td className={`p-3 text-right tabular-nums font-semibold ${
          match.invoicesCents > 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-text-muted-light dark:text-text-muted-dark'
        }`}>
          {match.invoicesCents > 0
            ? `$${(match.invoicesCents / 100).toFixed(2)}`
            : '-'}
        </td>

        {/* Matched Unit */}
        <td className="p-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Select onValueChange={onUnitChange} defaultValue={match.unitId || undefined}>
                <SelectTrigger className="h-8 text-meta w-64">
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-meta">
                      {u.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={onCancelEdit}>
                <X className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
              </button>
            </div>
          ) : (
            <button
              onClick={onStartEdit}
              className="text-left text-text-secondary-light dark:text-text-secondary-dark hover:underline"
            >
              {match.unitAddress || (
                <span className="text-amber-600 dark:text-amber-400">Click to match</span>
              )}
            </button>
          )}
        </td>

        {/* Status */}
        <td className="p-3 text-center">
          {match.confidence === 'exact' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
          )}
          {match.confidence === 'fuzzy' && (
            <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
          )}
          {match.confidence === 'unmatched' && (
            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
          )}
        </td>
      </tr>

      {/* Expanded transaction rows */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-surface-light-2/50 dark:bg-surface-dark-2/50 px-6 py-3 border-t border-stroke-light dark:border-stroke-dark">
              <p className="text-label text-text-muted-light dark:text-text-muted-dark mb-2">
                {match.txCount} transactions
              </p>
              <table className="w-full text-meta">
                <thead>
                  <tr className="text-text-muted-light dark:text-text-muted-dark">
                    <th className="text-left pb-1 pr-3">Date</th>
                    <th className="text-left pb-1 pr-3">Type</th>
                    <th className="text-right pb-1 pr-3">Amount</th>
                    <th className="text-left pb-1">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary-light dark:text-text-secondary-dark">
                  {match.rows
                    .sort(
                      (a, b) =>
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    )
                    .map((r, i) => {
                      const invoice = isInvoiceRow(r);
                      return (
                      <tr key={i} className={`border-t border-stroke-light/50 dark:border-stroke-dark/50 ${invoice ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                        <td className="py-1 pr-3 whitespace-nowrap">{r.timestamp}</td>
                        <td className="py-1 pr-3">
                          {r.name.substring(0, 50)}
                          {invoice && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
                              INVOICE
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-1 pr-3 text-right tabular-nums ${
                            invoice
                              ? 'text-red-600 dark:text-red-400'
                              : r.amount > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {invoice ? `$${r.amount.toFixed(2)} owed` : `${r.amount > 0 ? '+' : ''}$${r.amount.toFixed(2)}`}
                        </td>
                        <td className="py-1 text-text-muted-light dark:text-text-muted-dark truncate max-w-[300px]">
                          {r.notes}
                        </td>
                      </tr>
                    );
                    })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
