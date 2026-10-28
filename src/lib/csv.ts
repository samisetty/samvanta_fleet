export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export type CsvMetric = { label: string; value: CsvCell };

export type CsvFile = {
  filename: string;
  metrics?: CsvMetric[];
  headers: string[];
  rows: CsvCell[][];
};

function line(row: CsvCell[]) {
  return row.map(escapeCell).join(",");
}

export function toCsv(file: Pick<CsvFile, "headers" | "rows" | "metrics">) {
  const blocks: CsvCell[][] = [];
  if (file.metrics?.length) {
    blocks.push(
      ["Metric", "Value"],
      ...file.metrics.map((metric) => [metric.label, metric.value]),
      [],
    );
  }
  blocks.push(file.headers, ...file.rows);
  return `\uFEFF${blocks.map(line).join("\r\n")}`;
}

export function downloadCsv(file: CsvFile) {
  const blob = new Blob([toCsv(file)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadAllCsv(files: CsvFile[]) {
  files.forEach((file, index) => {
    window.setTimeout(() => downloadCsv(file), index * 300);
  });
}
