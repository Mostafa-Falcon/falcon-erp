/**
 * 📊 Falcon ERP - Universal Report Exporter (CSV, Excel & PDF Print)
 * Supports Arabic UTF-8 BOM encoding for perfect Excel compatibility.
 */

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;

  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Arabic Excel opening
    keys.join(separator) +
    '\n' +
    rows
      .map((row) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator)
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerReportPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
