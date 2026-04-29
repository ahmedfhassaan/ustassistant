// PDF exporter with Arabic RTL support via jsPDF + autoTable.
import { getTajawalBase64 } from "./tajawalFont";

export interface PdfSection {
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export interface PdfOptions {
  filename: string;
  documentTitle: string;
  subtitle?: string;
  sections: PdfSection[];
}

export async function downloadPdf(opts: PdfOptions) {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as any).default || (autoTableMod as any);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Try to load Tajawal for Arabic support
  let fontName = "helvetica";
  const fontBase64 = await getTajawalBase64();
  if (fontBase64) {
    try {
      doc.addFileToVFS("Tajawal-Regular.ttf", fontBase64);
      doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
      doc.setFont("Tajawal");
      fontName = "Tajawal";
    } catch {
      // fallback to helvetica
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text(opts.documentTitle, pageWidth - 40, 50, { align: "right" } as any);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, pageWidth - 40, 70, { align: "right" } as any);
    doc.setTextColor(0);
  }
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    `تم التوليد: ${new Date().toLocaleString("ar-SA")}`,
    pageWidth - 40,
    opts.subtitle ? 88 : 70,
    { align: "right" } as any
  );
  doc.setTextColor(0);

  let cursorY = (opts.subtitle ? 88 : 70) + 20;

  for (const section of opts.sections) {
    if (section.title) {
      doc.setFontSize(13);
      doc.text(section.title, pageWidth - 40, cursorY, { align: "right" } as any);
      cursorY += 8;
    }

    autoTable(doc, {
      startY: cursorY,
      head: [section.headers],
      body: section.rows.map((r) => r.map((v) => (v == null ? "" : String(v)))),
      styles: {
        font: fontName,
        fontSize: 9,
        halign: "right",
        cellPadding: 5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [112, 200, 255],
        textColor: 255,
        halign: "right",
        font: fontName,
      },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 30, right: 30 },
      didDrawPage: () => {
        // page number footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `صفحة ${doc.getCurrentPageInfo().pageNumber}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: "center" } as any
        );
        doc.setTextColor(0);
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 25;
  }

  doc.save(opts.filename);
}
