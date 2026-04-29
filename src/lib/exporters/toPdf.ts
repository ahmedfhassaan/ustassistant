// PDF exporter that handles Arabic correctly by rendering an HTML container
// to canvas (browser handles shaping + RTL) and embedding it in jsPDF.

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

const escapeHtml = (s: unknown) => {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function buildHtml(opts: PdfOptions): string {
  const sectionsHtml = opts.sections
    .map((section) => {
      const head = section.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("");
      const body = section.rows
        .map(
          (r) =>
            `<tr>${r
              .map((c) => `<td>${escapeHtml(c)}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return `
        ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      `;
    })
    .join("");

  return `
    <div dir="rtl" style="
      font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      width: 794px;
      padding: 32px;
      box-sizing: border-box;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.6;
    ">
      <div style="border-bottom: 3px solid #70C8FF; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
          ${escapeHtml(opts.documentTitle)}
        </h1>
        ${
          opts.subtitle
            ? `<p style="margin: 6px 0 0; font-size: 13px; color: #64748b;">${escapeHtml(opts.subtitle)}</p>`
            : ""
        }
        <p style="margin: 6px 0 0; font-size: 11px; color: #94a3b8;">
          تم التوليد: ${new Date().toLocaleString("ar-SA")}
        </p>
      </div>
      <style>
        h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 20px 0 10px;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 11px;
          table-layout: fixed;
        }
        th {
          background: #70C8FF;
          color: #ffffff;
          padding: 8px 6px;
          text-align: right;
          font-weight: 700;
          border: 1px solid #5bb5ec;
          word-wrap: break-word;
        }
        td {
          padding: 6px;
          text-align: right;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          word-wrap: break-word;
          vertical-align: top;
        }
        tbody tr:nth-child(even) td {
          background: #f5faff;
        }
      </style>
      ${sectionsHtml}
    </div>
  `;
}

export async function downloadPdf(opts: PdfOptions) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Create off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.zIndex = "-1";
  container.innerHTML = buildHtml(opts);
  document.body.appendChild(container);

  // Wait one frame to ensure fonts/layout settle
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  // Allow Tajawal webfont to be ready if available
  if ((document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {
      /* ignore */
    }
  }

  try {
    const target = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // negative offset to shift image up
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(opts.filename);
  } finally {
    document.body.removeChild(container);
  }
}
