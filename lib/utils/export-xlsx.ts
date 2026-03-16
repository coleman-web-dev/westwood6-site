import * as XLSX from 'xlsx';
import type { CsvColumn } from './export-csv';

/** Build an XLSX Blob from data + columns. */
export function buildXlsxBlob<T>(data: T[], columns: CsvColumn<T>[]): Blob {
  const rows = data.map((row) =>
    columns.reduce(
      (acc, col) => {
        acc[col.header] = col.value(row) ?? '';
        return acc;
      },
      {} as Record<string, string | number>,
    ),
  );

  const ws = XLSX.utils.json_to_sheet(rows, { header: columns.map((c) => c.header) });

  // Auto-fit column widths based on header + content length
  ws['!cols'] = columns.map((col) => {
    let maxLen = col.header.length;
    for (const row of rows) {
      const val = String(row[col.header] ?? '');
      if (val.length > maxLen) maxLen = val.length;
    }
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Directory');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Generate an XLSX file and trigger a browser download. */
export function downloadXlsx<T>(filename: string, data: T[], columns: CsvColumn<T>[]) {
  const blob = buildXlsxBlob(data, columns);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
