'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { CSVUpload } from '@/components/onboarding/csv-upload';
import { parseMembersCSV, type ParsedMember } from '@/lib/utils/csv-parser';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { toast } from 'sonner';

interface StepImportMembersProps {
  onNext: () => void;
  onBack: () => void;
  unitIds: Record<string, string>;
}

export function StepImportMembers({
  onNext,
  onBack,
  unitIds,
}: StepImportMembersProps) {
  const { community } = useCommunity();
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const validUnitNumbers = Object.keys(unitIds);

  const handleFileLoaded = useCallback(
    (content: string) => {
      const result = parseMembersCSV(content, validUnitNumbers);
      setParsedMembers(result.data);
      setParseErrors(result.errors);
    },
    [validUnitNumbers],
  );

  function hasUnknownUnit(member: ParsedMember): boolean {
    return (
      member.unit_number !== '' &&
      validUnitNumbers.length > 0 &&
      !unitIds[member.unit_number]
    );
  }

  async function handleImport() {
    if (parsedMembers.length === 0) {
      toast.error('No members to import. Upload a CSV file first.');
      return;
    }

    setImporting(true);
    try {
      const supabase = createClient();

      const rows = parsedMembers.map((m) => {
        const hasMailing = !!m.mailing_address;
        return {
          community_id: community.id,
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email || null,
          unit_id: m.unit_number ? unitIds[m.unit_number] ?? null : null,
          member_role: m.role,
          system_role: 'resident' as const,
          is_approved: true,
          show_in_directory: true,
          use_unit_address: !hasMailing,
          mailing_address_line1: hasMailing ? m.mailing_address : null,
        };
      });

      const { data: inserted, error } = await supabase
        .from('members')
        .insert(rows)
        .select('id');

      if (error) {
        toast.error('Failed to import members: ' + error.message);
        return;
      }

      toast.success(
        `${inserted?.length ?? 0} members imported successfully.`,
      );
      onNext();
    } catch (err) {
      console.error('Error importing members:', err);
      toast.error('An unexpected error occurred during import.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Import Members
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Upload a CSV file with your community&apos;s members. Expected columns:{' '}
        <code className="text-meta">first_name</code>,{' '}
        <code className="text-meta">last_name</code>,{' '}
        <code className="text-meta">email</code>,{' '}
        <code className="text-meta">unit_number</code>,{' '}
        <code className="text-meta">role</code> (owner/member/tenant).
        Optional: <code className="text-meta">mailing_address</code> (for absentee owners).
      </p>

      <CSVUpload
        onFileLoaded={handleFileLoaded}
        label="Upload Members CSV"
        description="Expected columns: first_name, last_name, email, unit_number, role"
      />

      {parseErrors.length > 0 && (
        <div className="mt-4 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
          <p className="text-label text-red-700 dark:text-red-400 font-semibold mb-2">
            Parsing Warnings & Errors
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

      {parsedMembers.length > 0 && (
        <div className="mt-4">
          <p className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Preview ({parsedMembers.length} member
            {parsedMembers.length !== 1 ? 's' : ''})
          </p>
          <div className="max-h-64 overflow-auto rounded-md border border-stroke-light dark:border-stroke-dark">
            <table className="w-full text-left">
              <thead className="bg-surface-light dark:bg-surface-dark sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    First Name
                  </th>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Last Name
                  </th>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Email
                  </th>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Unit
                  </th>
                  <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                {parsedMembers.map((member, i) => {
                  const unknownUnit = hasUnknownUnit(member);
                  return (
                    <tr
                      key={i}
                      className={
                        unknownUnit
                          ? 'bg-yellow-50 dark:bg-yellow-950/20'
                          : ''
                      }
                    >
                      <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                        {member.first_name}
                      </td>
                      <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                        {member.last_name}
                      </td>
                      <td className="px-3 py-2 text-body text-text-secondary-light dark:text-text-secondary-dark">
                        {member.email || '\u2014'}
                      </td>
                      <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                        <span className="flex items-center gap-1">
                          {member.unit_number || '\u2014'}
                          {unknownUnit && (
                            <span
                              className="text-meta text-yellow-600 dark:text-yellow-400"
                              title="This unit number was not found in imported units"
                            >
                              (unknown)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-body text-text-secondary-light dark:text-text-secondary-dark capitalize">
                        {member.role}
                      </td>
                    </tr>
                  );
                })}
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
          <Button type="button" variant="ghost" onClick={onNext}>
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || parsedMembers.length === 0}
          >
            {importing ? 'Importing...' : 'Import & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
