import Papa from 'papaparse';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Build a CSV blob from data + columns. */
export function buildCsvBlob<T>(data: T[], columns: CsvColumn<T>[]): Blob {
  const rows = data.map((row) =>
    columns.reduce(
      (acc, col) => {
        acc[col.header] = col.value(row) ?? '';
        return acc;
      },
      {} as Record<string, string | number>
    )
  );

  const csv = Papa.unparse(rows, { columns: columns.map((c) => c.header) });
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/** Generate a CSV from data and trigger a browser download. */
export function downloadCsv<T>(filename: string, data: T[], columns: CsvColumn<T>[]) {
  const blob = buildCsvBlob(data, columns);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Upload a CSV to Supabase Storage and insert a documents row. */
export async function saveCsvToDocuments(
  supabase: SupabaseClient,
  params: {
    filename: string;
    blob: Blob;
    communityId: string;
    memberId: string;
    folderId?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const { filename, communityId, memberId, folderId } = params;

  const blob = params.blob;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  const filePath = `${communityId}/reports/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('hoa-documents')
    .upload(filePath, blob);

  if (uploadError) {
    return { success: false, error: 'Failed to upload file.' };
  }

  const { error: insertError } = await supabase.from('documents').insert({
    community_id: communityId,
    title: filename.replace(/\.csv$/, ''),
    category: 'financial',
    folder_id: folderId ?? null,
    file_path: filePath,
    file_size: blob.size,
    uploaded_by: memberId,
  });

  if (insertError) {
    await supabase.storage.from('hoa-documents').remove([filePath]);
    return { success: false, error: 'Failed to save document record.' };
  }

  return { success: true };
}
