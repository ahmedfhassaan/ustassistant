// CSV exporter with BOM for proper Arabic display in Excel.
// Optionally includes a title row at the top.
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options?: { title?: string }
) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines: string[] = [];
  if (options?.title) {
    lines.push(escape(options.title));
    lines.push(escape(`تم التوليد: ${new Date().toLocaleString("ar-SA")}`));
    lines.push("");
  }
  lines.push(headers.map(escape).join(","));
  for (const r of rows) lines.push(r.map(escape).join(","));

  const csv = "\uFEFF" + lines.join("\r\n"); // BOM for Excel/Arabic
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
