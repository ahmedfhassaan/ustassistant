// PDF exporter for Arabic content.
//
// IMPORTANT: html2canvas (used by jsPDF.html and our previous approach) has
// well-known bugs rendering complex scripts like Arabic — it frequently breaks
// ligatures and letter joining, producing the "isolated/disconnected letters"
// look. To avoid this entirely, we render the report into a hidden iframe
// using the browser's native text engine and trigger the browser print dialog,
// which lets the user save a perfect, selectable PDF (Arabic shaping correct,
// fonts crisp, file size small).

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

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.documentTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 14mm;
  }
  * {
    box-sizing: border-box;
    /* Critical for correct Arabic shaping */
    letter-spacing: 0 !important;
    word-spacing: normal;
    font-kerning: normal;
    text-rendering: optimizeLegibility;
    -webkit-font-feature-settings: "kern", "liga", "calt";
            font-feature-settings: "kern", "liga", "calt";
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.7;
    direction: rtl;
    unicode-bidi: isolate;
  }
  .header {
    border-bottom: 3px solid #70C8FF;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  h1 {
    margin: 0;
    font-size: 22pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.4;
  }
  .subtitle {
    margin: 6px 0 0;
    font-size: 11pt;
    color: #64748b;
  }
  .meta {
    margin: 4px 0 0;
    font-size: 9pt;
    color: #94a3b8;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 18px 0 8px;
    color: #0f172a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 10.5pt;
    page-break-inside: auto;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: #70C8FF;
    color: #ffffff;
    padding: 8px 6px;
    text-align: right;
    font-weight: 700;
    border: 1px solid #5bb5ec;
  }
  td {
    padding: 6px 8px;
    text-align: right;
    border: 1px solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
    word-wrap: break-word;
  }
  tbody tr:nth-child(even) td {
    background: #f5faff;
  }
  .footer-hint {
    margin-top: 24px;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
  }
  @media print {
    .footer-hint { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(opts.documentTitle)}</h1>
    ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
    <p class="meta">تم التوليد: ${new Date().toLocaleString("ar-SA")}</p>
  </div>
  ${sectionsHtml}
  <p class="footer-hint">من نافذة الطباعة اختر "حفظ كـ PDF" لحفظ التقرير.</p>
  <script>
    (function () {
      function ready() {
        var fonts = (document).fonts;
        if (fonts && fonts.ready && typeof fonts.ready.then === 'function') {
          return fonts.ready;
        }
        return new Promise(function (r) { setTimeout(r, 400); });
      }
      window.addEventListener('load', function () {
        ready().then(function () {
          setTimeout(function () {
            try { window.focus(); window.print(); } catch (e) {}
          }, 150);
        });
      });
    })();
  </script>
</body>
</html>`;
}

export async function downloadPdf(opts: PdfOptions) {
  const html = buildHtml({ ...opts, filename: opts.filename });

  // Try opening a new window first (gives the user a real Save-as-PDF dialog
  // with native Arabic shaping). Fall back to a hidden iframe if popups are
  // blocked.
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");

  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Suggest the filename in the title; most browsers use this as the
    // default file name in the print-to-PDF dialog.
    try {
      win.document.title = opts.filename.replace(/\.pdf$/i, "");
    } catch {
      /* ignore */
    }
    return;
  }

  // Fallback: hidden iframe + print
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("تعذّر تجهيز نافذة الطباعة");
  }
  doc.open();
  doc.write(html);
  doc.close();

  // Set title for default filename in print dialog.
  try {
    doc.title = opts.filename.replace(/\.pdf$/i, "");
  } catch {
    /* ignore */
  }

  // Cleanup after a delay so print dialog has time to spawn.
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  }, 60_000);
}
