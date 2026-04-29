// PDF exporter for Arabic content.
//
// Renders a styled HTML report into a new browser window/iframe and triggers
// the native print dialog so the user can save a perfect, selectable PDF
// with proper Arabic shaping (avoids html2canvas ligature bugs).

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
        ${section.title ? `<h2><span class="bar"></span>${escapeHtml(section.title)}</h2>` : ""}
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
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 14mm;
    marks: none;
  }
  * {
    box-sizing: border-box;
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
    color: #1e293b;
    font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    direction: rtl;
    unicode-bidi: isolate;
    -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
  }
  /* Numeric font styling — slightly tighter, tabular */
  .num, td:lang(en), th:lang(en) {
    font-variant-numeric: tabular-nums;
  }
  .header {
    background: linear-gradient(135deg, #70C8FF 0%, #5BB5EC 100%);
    color: #ffffff;
    padding: 18px 22px;
    border-radius: 12px;
    margin-bottom: 22px;
    box-shadow: 0 4px 12px rgba(112, 200, 255, 0.25);
  }
  .header h1 {
    margin: 0;
    font-size: 22pt;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.4;
  }
  .header .subtitle {
    margin: 6px 0 0;
    font-size: 11pt;
    color: rgba(255, 255, 255, 0.92);
    font-weight: 500;
  }
  .meta {
    margin: 6px 0 18px;
    font-size: 9pt;
    color: #94a3b8;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 22px 0 10px;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h2 .bar {
    display: inline-block;
    width: 4px;
    height: 18px;
    background: #70C8FF;
    border-radius: 2px;
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-bottom: 16px;
    font-size: 10.5pt;
    page-break-inside: auto;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: #70C8FF;
    color: #ffffff;
    padding: 10px 8px;
    text-align: right;
    font-weight: 700;
    font-size: 10.5pt;
    border-bottom: 2px solid #5BB5EC;
  }
  td {
    padding: 8px 10px;
    text-align: right;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
    word-wrap: break-word;
    font-variant-numeric: tabular-nums;
  }
  tbody tr:nth-child(even) td {
    background: #f5faff;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5pt;
    color: #94a3b8;
    text-align: center;
  }
  .footer strong {
    color: #5BB5EC;
    font-weight: 700;
  }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(opts.documentTitle)}</h1>
    ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
  </div>
  <p class="meta">تم التوليد: ${new Date().toLocaleString("ar-SA")}</p>
  ${sectionsHtml}
  <div class="footer">
    تقرير صادر من <strong>المساعد الذكي</strong>
  </div>
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
          }, 200);
        });
      });
    })();
  </script>
</body>
</html>`;
}

export async function downloadPdf(opts: PdfOptions) {
  const html = buildHtml(opts);

  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");

  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
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

  try {
    doc.title = opts.filename.replace(/\.pdf$/i, "");
  } catch {
    /* ignore */
  }

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  }, 60_000);
}
