// XLSX exporter using ExcelJS for full styling support (Arabic, RTL, colors).
export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

const BRAND = {
  primary: "FF70C8FF",
  primaryDark: "FF5BB5EC",
  headerText: "FFFFFFFF",
  bodyText: "FF1E293B",
  altRow: "FFF5FAFF",
  border: "FFE2E8F0",
  titleText: "FF0F172A",
  subtitleText: "FF64748B",
};

const FONT_NAME = "Tajawal";

export async function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const ExcelJSModule: any = await import("exceljs");
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;

  const wb = new ExcelJS.Workbook();
  wb.creator = "USTAssistant";
  wb.created = new Date();

  for (const s of sheets) {
    const colCount = Math.max(1, s.headers.length);
    const ws = wb.addWorksheet(sanitizeSheetName(s.name), {
      views: [{ state: "frozen", ySplit: 3, rightToLeft: true, showGridLines: false }],
      properties: { defaultRowHeight: 22 },
      pageSetup: { paperSize: 9, orientation: "portrait", horizontalCentered: true },
    });

    // Title row
    const titleRow = ws.addRow([s.name]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);
    titleRow.height = 32;
    const titleCell = titleRow.getCell(1);
    titleCell.value = s.name;
    titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: BRAND.titleText } };
    titleCell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };

    // Subtitle / generated at row
    const subRow = ws.addRow([`تم التوليد: ${new Date().toLocaleString("ar-SA")}`]);
    ws.mergeCells(subRow.number, 1, subRow.number, colCount);
    subRow.height = 18;
    const subCell = subRow.getCell(1);
    subCell.font = { name: FONT_NAME, size: 9, color: { argb: BRAND.subtitleText }, italic: true };
    subCell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };

    // Header row
    const headerRow = ws.addRow(s.headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: BRAND.headerText } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } };
      cell.alignment = {
        horizontal: "right",
        vertical: "middle",
        readingOrder: "rtl",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: BRAND.primaryDark } },
        bottom: { style: "thin", color: { argb: BRAND.primaryDark } },
        left: { style: "thin", color: { argb: BRAND.primaryDark } },
        right: { style: "thin", color: { argb: BRAND.primaryDark } },
      };
    });

    // Body rows
    s.rows.forEach((r, idx) => {
      const row = ws.addRow(r.map((v) => (v == null ? "" : v)));
      row.height = 20;
      const isAlt = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: FONT_NAME, size: 10, color: { argb: BRAND.bodyText } };
        cell.alignment = {
          horizontal: "right",
          vertical: "middle",
          readingOrder: "rtl",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: BRAND.border } },
          bottom: { style: "thin", color: { argb: BRAND.border } },
          left: { style: "thin", color: { argb: BRAND.border } },
          right: { style: "thin", color: { argb: BRAND.border } },
        };
        if (isAlt) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.altRow } };
        }
      });
    });

    // Column widths (smart sizing based on content)
    s.headers.forEach((h, i) => {
      const sample = s.rows.slice(0, 200).map((r) => String(r[i] ?? "").length);
      const max = Math.max(h.length, ...(sample.length ? sample : [0]));
      ws.getColumn(i + 1).width = Math.min(60, Math.max(12, max + 4));
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no \ / ? * [ ]
  return name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Sheet";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
