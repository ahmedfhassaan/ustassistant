// XLSX exporter using SheetJS. Arabic supported natively.
export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export async function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const aoa = [s.headers, ...s.rows.map((r) => r.map((v) => (v == null ? "" : v)))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Set RTL
    (ws as any)["!views"] = [{ RTL: true }];
    // Auto column widths (rough)
    const colWidths = s.headers.map((h, i) => {
      const max = Math.max(
        h.length,
        ...s.rows.map((r) => String(r[i] ?? "").length).slice(0, 200)
      );
      return { wch: Math.min(60, Math.max(10, max + 2)) };
    });
    (ws as any)["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}
