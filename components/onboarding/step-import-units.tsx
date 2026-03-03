'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { CSVUpload } from '@/components/onboarding/csv-upload';
import { parseUnitsCSV, type ParsedUnit } from '@/lib/utils/csv-parser';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { toast } from 'sonner';

interface StepImportUnitsProps {
  onNext: () => void;
  onBack: () => void;
  onUnitsImported: (unitIds: Record<string, string>) => void;
}

export function StepImportUnits({
  onNext,
  onBack,
  onUnitsImported,
}: StepImportUnitsProps) {
  const { community } = useCommunity();
  const [parsedUnits, setParsedUnits] = useState<ParsedUnit[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [existingCount, setExistingCount] = useState<number>(0);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function fetchExistingUnits() {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community.id);

        if (error) {
          console.error('Error fetching existing units:', error);
        } else {
          setExistingCount(count ?? 0);
        }
      } finally {
        setLoadingExisting(false);
      }
    }

    fetchExistingUnits();
  }, [community.id]);

  const handleFileLoaded = useCallback((content: string) => {
    const result = parseUnitsCSV(content);
    setParsedUnits(result.data);
    setParseErrors(result.errors);
  }, []);

  async function handleImport() {
    if (parsedUnits.length === 0) {
      toast.error('No units to import. Upload a CSV file first.');
      return;
    }

    setImporting(true);
    try {
      const supabase = createClient();

      const rows = parsedUnits.map((u) => ({
        community_id: community.id,
        unit_number: u.unit_number,
        address: u.address || null,
        status: 'active' as const,
      }));

      const { data: inserted, error } = await supabase
        .from('units')
        .insert(rows)
        .select('id, unit_number');

      if (error) {
        toast.error('Failed to import units: ' + error.message);
        return;
      }

      if (!inserted || inserted.length === 0) {
        toast.error('No units were inserted.');
        return;
      }

      const unitMap: Record<string, string> = {};
      for (const row of inserted) {
        unitMap[row.unit_number] = row.id;
      }

      toast.success(`${inserted.length} units imported successfully.`);
      onUnitsImported(unitMap);
      onNext();
    } catch (err) {
      console.error('Error importing units:', err);
      toast.error('An unexpected error occurred during import.');
    } finally {
      setImporting(false);
    }
  }

  function handleSkip() {
    onNext();
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Import Units
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Upload a CSV file with your community&apos;s units. The CSV should have
        columns: <code className="text-meta">unit_number</code> and{' '}
        <code className="text-meta">address</code>.
      </p>

      {!loadingExisting && existingCount > 0 && (
        <div className="mb-4 rounded-md border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            Your community already has{' '}
            <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
              {existingCount}
            </span>{' '}
            unit{existingCount !== 1 ? 's' : ''} in the database. You can skip
            this step or import additional units.
          </p>
        </div>
      )}

      <CSVUpload
        onFileLoaded={handleFileLoaded}
        label="Upload Units CSV"
        description="Expected columns: unit_number, address"
      />

      {parseErrors.length > 0 && (
        <div className="mt-4 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
          <p className="text-label text-red-700 dark:text-red-400 font-semibold mb-2">
            Parsing Errors
          </p>
          <ul className="list-disc list-inside space-y-1">
            {parseErrors.map((err, i) => (
              <li
                key={i}
                className="text-meta text-red-600 dark:text-red-400"
              >
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsedUnits.length > 0 && (
        <div className="mt-4">
          <p className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Preview ({parsedUnits.length} unit{parsedUnits.length !== 1 ? 's' : ''})
          </p>
          <div className="max-h-64 overflow-auto rounded-md border border-stroke-light dark:border-stroke-dark">
            <table className="w-full text-left">
              <thead className="bg-surface-light dark:bg-surface-dark sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Unit Number
                  </th>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                {parsedUnits.map((unit, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                      {unit.unit_number}
                    </td>
                    <td className="px-3 py-2 text-body text-text-secondary-light dark:text-text-secondary-dark">
                      {unit.address || '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <div className="flex gap-2">
          {existingCount > 0 && (
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || parsedUnits.length === 0}
          >
            {importing ? 'Importing...' : 'Import & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
