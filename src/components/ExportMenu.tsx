import { Download, FileSpreadsheet, FileText, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { downloadCsv } from "@/lib/exporters/toCsv";
import { downloadXlsx, type XlsxSheet } from "@/lib/exporters/toXlsx";
import { downloadPdf, type PdfSection } from "@/lib/exporters/toPdf";

export interface ExportPayload {
  /** Base filename without extension */
  filename: string;
  /** Human-readable title used in PDF header */
  documentTitle: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Sections used by PDF and XLSX (multi-sheet) */
  sections: { title: string; headers: string[]; rows: (string | number | null | undefined)[][] }[];
}

interface Props {
  payload: () => ExportPayload | null;
  disabled?: boolean;
}

const ExportMenu = ({ payload, disabled }: Props) => {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const safe = async (label: string, fn: () => Promise<void> | void) => {
    try {
      setBusy(label);
      await fn();
    } catch (e) {
      console.error(e);
      toast({
        title: "تعذّر التصدير",
        description: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const onCsv = () =>
    safe("csv", () => {
      const p = payload();
      if (!p) return;
      // CSV is single-sheet → flatten with section titles as separator rows
      const headers = p.sections[0]?.headers ?? [];
      const rows: (string | number | null | undefined)[][] = [];
      p.sections.forEach((s, i) => {
        if (i > 0 || p.sections.length > 1) {
          rows.push([s.title]);
          rows.push(s.headers);
        }
        rows.push(...s.rows);
      });
      const finalHeaders = p.sections.length > 1 ? [p.documentTitle] : headers;
      downloadCsv(`${p.filename}.csv`, finalHeaders, rows);
    });

  const onXlsx = () =>
    safe("xlsx", async () => {
      const p = payload();
      if (!p) return;
      const sheets: XlsxSheet[] = p.sections.map((s) => ({
        name: s.title,
        headers: s.headers,
        rows: s.rows,
      }));
      await downloadXlsx(`${p.filename}.xlsx`, sheets);
    });

  const onPdf = () =>
    safe("pdf", async () => {
      const p = payload();
      if (!p) return;
      const sections: PdfSection[] = p.sections.map((s) => ({
        title: s.title,
        headers: s.headers,
        rows: s.rows,
      }));
      await downloadPdf({
        filename: `${p.filename}.pdf`,
        documentTitle: p.documentTitle,
        subtitle: p.subtitle,
        sections,
      });
    });

  const triggerClass = isDark
    ? "gap-2 bg-white/5 hover:bg-white/10 border-white/10 text-foreground"
    : "gap-2 bg-white hover:bg-secondary border-black/10 text-foreground shadow-sm";

  return (
    <div className="no-print">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={triggerClass} disabled={disabled || !!busy}>
            <Download className="w-4 h-4" />
            {busy ? "جارٍ التصدير..." : "تصدير"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onPdf} className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4 text-red-500" />
            تصدير PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onXlsx} className="gap-2 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            تصدير Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCsv} className="gap-2 cursor-pointer">
            <TableIcon className="w-4 h-4 text-blue-500" />
            تصدير CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ExportMenu;
