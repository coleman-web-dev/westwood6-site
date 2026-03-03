import Papa from 'papaparse';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Generate a CSV from data and trigger a browser download.
 */
export function downloadCsv<T>(filename: string, data: T[], columns: CsvColumn<T>[]) {
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
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
