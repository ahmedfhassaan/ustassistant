import { useState, useEffect, useRef, useMemo } from "react";
import { Upload, FileText, Trash2, Search, Loader2, CheckCircle, AlertCircle, AlertTriangle, RefreshCw, Globe, ExternalLink, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EmptyState from "@/components/EmptyState";
import WebSourceCard from "@/components/admin/WebSourceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  "قبول وتسجيل",
  "رسوم ومالية",
  "مقررات وخطط دراسية",
  "جداول وامتحانات",
  "مرافق وخدمات طلابية",
  "مشاريع تخرّج",
] as const;

const WEB_CATEGORY = "موقع الجامعة";
const UNCATEGORIZED = "بدون تصنيف";

interface KnowledgeDoc {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string | null;
  status: string;
  created_at: string;
  source_type?: string | null;
  source_url?: string | null;
  category?: string | null;
}


const AdminKnowledge = () => {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDoc | null>(null);
  const [deleteConfirmEnabled, setDeleteConfirmEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [viewTarget, setViewTarget] = useState<KnowledgeDoc | null>(null);
  const [viewContent, setViewContent] = useState<string>("");
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string>("");
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-second delay before enabling confirm button
  useEffect(() => {
    if (deleteTarget) {
      setDeleteConfirmEnabled(false);
      const timer = setTimeout(() => setDeleteConfirmEnabled(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [deleteTarget]);

  const openViewer = async (doc: KnowledgeDoc) => {
    setViewTarget(doc);
    setViewContent("");
    setViewError("");
    setViewLoading(true);
    try {
      let text = "";
      if (doc.file_path) {
        const { data: blob, error } = await supabase.storage.from("knowledge").download(doc.file_path);
        if (error) throw error;
        if (blob) text = await blob.text();
      }
      if (!text) {
        const { data: chunks, error: chunksErr } = await supabase
          .from("knowledge_chunks")
          .select("content,chunk_index")
          .eq("document_id", doc.id)
          .order("chunk_index", { ascending: true });
        if (chunksErr) throw chunksErr;
        text = (chunks || []).map((c: any) => c.content).join("\n\n");
      }
      if (!text) {
        setViewError("لا يوجد محتوى متاح لهذا الملف.");
      } else {
        setViewContent(text);
      }
    } catch (e: any) {
      console.error("openViewer error:", e);
      setViewError(e?.message || "تعذّر تحميل المحتوى");
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const filteredDocs = documents.filter((d) =>
    d.name.includes(searchQuery)
  );

  const docCategory = (d: KnowledgeDoc): string => {
    if (d.source_type === "web") return WEB_CATEGORY;
    return d.category && d.category.trim() ? d.category : UNCATEGORIZED;
  };

  const groupedDocs = useMemo(() => {
    const groups = new Map<string, KnowledgeDoc[]>();
    for (const d of filteredDocs) {
      const cat = docCategory(d);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(d);
    }
    const order = [...CATEGORIES, WEB_CATEGORY, UNCATEGORIZED];
    const sorted: { category: string; docs: KnowledgeDoc[] }[] = [];
    for (const cat of order) {
      if (groups.has(cat)) {
        sorted.push({ category: cat, docs: groups.get(cat)! });
        groups.delete(cat);
      }
    }
    for (const [cat, docs] of groups) sorted.push({ category: cat, docs });
    return sorted;
  }, [filteredDocs]);

  const defaultOpenSections = useMemo(
    () => (searchQuery ? groupedDocs.map((g) => g.category) : groupedDocs.slice(0, 1).map((g) => g.category)),
    [groupedDocs, searchQuery]
  );

  const handleChangeCategory = async (doc: KnowledgeDoc, newCategory: string | null) => {
    const value = newCategory === UNCATEGORIZED ? null : newCategory;
    try {
      const { error } = await supabase
        .from("knowledge_documents")
        .update({ category: value })
        .eq("id", doc.id);
      if (error) throw error;
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, category: value } : d)));
      toast({ title: "تم تحديث التصنيف", description: `${doc.name} → ${newCategory || UNCATEGORIZED}` });
    } catch (e: any) {
      toast({ title: "تعذّر تحديث التصنيف", description: e?.message, variant: "destructive" });
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      let docId: string | null = null;
      try {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
        const validMime = ["text/markdown", "text/x-markdown", ""].includes(file.type);

        if (fileExt !== "md" || !validMime) {
          toast({
            title: "نوع ملف غير مدعوم",
            description: "يُسمح فقط برفع ملفات Markdown (.md)",
            variant: "destructive",
          });
          continue;
        }

        const { data: docData, error: docError } = await supabase
          .from("knowledge_documents")
          .insert({
            name: file.name,
            file_type: fileExt,
            file_size: file.size,
            status: "processing",
          })
          .select()
          .single();

        if (docError || !docData) {
          throw new Error("فشل إنشاء سجل المستند");
        }
        docId = docData.id;

        const contentText = await file.text();

        const { error: fnError } = await supabase.functions.invoke("process-document", {
          body: {
            document_id: docData.id,
            content_text: contentText,
          },
        });

        if (fnError) {
          throw new Error("فشل معالجة المستند: " + fnError.message);
        }

        toast({
          title: "تم رفع المستند",
          description: `تمت معالجة "${file.name}" بنجاح وإضافته لقاعدة المعرفة.`,
        });
      } catch (err: any) {
        console.error("Upload error:", err);
        if (docId) {
          await supabase.from("knowledge_documents").delete().eq("id", docId);
        }
        toast({
          title: "خطأ في الرفع",
          description: err.message || "حدث خطأ أثناء رفع الملف",
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    fetchDocuments();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.file_path) {
        await supabase.storage.from("knowledge").remove([deleteTarget.file_path]);
      }

      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      // Knowledge changed → invalidate cached responses
      try {
        await supabase.from("response_cache").delete().gt("expires_at", new Date(0).toISOString());
      } catch (e) {
        console.warn("Failed to clear cache after delete:", e);
      }

      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast({
        title: "تم حذف المستند بنجاح",
        description: `تم حذف "${deleteTarget.name}" من قاعدة المعرفة.`,
      });
    } catch (err: any) {
      toast({
        title: "حدث خطأ أثناء الحذف",
        description: err.message || "حدث خطأ أثناء الحذف، حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReprocessAll = async () => {
    const targets = documents.filter(d => d.status === "processed" || d.status === "error");
    if (targets.length === 0) return;
    if (!confirm(`سيتم إعادة معالجة ${targets.length} مستنداً بإعدادات التقسيم الجديدة. متابعة؟`)) return;
    setReprocessing(true);
    let ok = 0, fail = 0;
    try {
      for (const doc of targets) {
        try {
          let contentText = "";
          // Try downloading original file first if available
          if (doc.file_path) {
            const { data: blob } = await supabase.storage.from("knowledge").download(doc.file_path);
            if (blob) contentText = await blob.text();
          }
          await supabase.from("knowledge_documents").update({ status: "processing" }).eq("id", doc.id);
          const body: any = { document_id: doc.id };
          if (contentText) body.content_text = contentText;
          else body.from_existing_chunks = true; // fallback: rebuild from current chunks

          const { error: fnErr } = await supabase.functions.invoke("process-document", { body });
          if (fnErr) { console.error("reprocess failed", doc.name, fnErr); fail++; }
          else { ok++; }
        } catch (e) { console.error("reprocess exception", doc.name, e); fail++; }
      }
      toast({
        title: "اكتملت إعادة المعالجة",
        description: `تم بنجاح: ${ok} | فشل: ${fail}`,
        variant: fail > 0 ? "destructive" : "default",
      });
    } finally {
      setReprocessing(false);
      fetchDocuments();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "processed": return "جاهز";
      case "processing": return "قيد المعالجة";
      case "error": return "خطأ";
      default: return "قيد الانتظار";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <WebSourceCard onChanged={fetchDocuments} />
      <Card className={`transition-all duration-300 ease-out animate-scale-in rounded-2xl ${isDark ? "glass-card border-0" : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-lg">إدارة قاعدة المعرفة</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleReprocessAll}
              disabled={reprocessing || documents.length === 0}
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
            >
              {reprocessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="truncate">{reprocessing ? "جاري المعالجة..." : "إعادة معالجة الكل"}</span>
            </Button>
            <Button
              onClick={handleFileSelect}
              disabled={uploading}
              className={`gap-2 flex-1 sm:flex-none transition-all duration-200 ${
                isDark
                  ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary"
                  : "bg-primary hover:bg-primary-hover text-primary-foreground"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="truncate">{uploading ? "جاري الرفع..." : "رفع مستند"}</span>
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ارفع ملفات Markdown (.md) ليتمكن المساعد الذكي من استخدامها في الإجابة على أسئلة الطلاب. <span className="font-medium">الملفات المدعومة: .md فقط</span>
          </p>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في المستندات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pr-10 text-right ${isDark ? "glass-input" : ""}`}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocs.length === 0 ? (
              documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="لم يتم رفع أي مستندات بعد"
                  description="ارفع ملفات Markdown (.md) ليتمكن المساعد من استخدامها في الإجابة"
                  actionLabel="رفع مستند"
                  onAction={handleFileSelect}
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="لا توجد مستندات مطابقة"
                  description="جرّب البحث بكلمات مختلفة"
                  actionLabel="مسح البحث"
                  onAction={() => setSearchQuery("")}
                />
              )
            ) : (
              <Accordion
                type="multiple"
                defaultValue={defaultOpenSections}
                key={searchQuery + "|" + groupedDocs.map(g => g.category).join(",")}
                className="space-y-2"
              >
                {groupedDocs.map(({ category, docs }) => (
                  <AccordionItem
                    key={category}
                    value={category}
                    className={`rounded-xl border ${isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-secondary/20"} overflow-hidden`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2 flex-1">
                        {category === WEB_CATEGORY ? (
                          <Globe className="w-4 h-4 text-primary" />
                        ) : (
                          <Tag className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm font-semibold">{category}</span>
                        <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full ms-1">
                          {docs.length}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openViewer(doc)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openViewer(doc);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-out hover:translate-y-[-1px] ${
                              isDark
                                ? "bg-white/5 border border-white/5 hover:bg-white/8"
                                : "bg-white border border-black/5 hover:border-primary/20"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg transition-all ${isDark ? "bg-primary/10 glow-highlight" : "bg-primary/10"}`}>
                                {doc.source_type === "web" ? (
                                  <Globe className={`w-5 h-5 text-primary ${isDark ? "glow-icon" : ""}`} />
                                ) : (
                                  <FileText className={`w-5 h-5 text-primary ${isDark ? "glow-icon" : ""}`} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${doc.source_type === "web" ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                                    {doc.source_type === "web" ? "موقع" : "يدوي"}
                                  </span>
                                  <span>{doc.file_type.toUpperCase()}</span>
                                  <span className="opacity-50">·</span>
                                  <span>{formatSize(doc.file_size)}</span>
                                  <span className="opacity-50">·</span>
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(doc.status)}
                                    {getStatusText(doc.status)}
                                  </span>
                                  <span className="opacity-50">·</span>
                                  <span>{new Date(doc.created_at).toLocaleDateString("ar-SA")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {doc.source_type !== "web" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => e.stopPropagation()}
                                      title="تغيير التصنيف"
                                      className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    >
                                      <Tag className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel>اختر تصنيفاً</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {CATEGORIES.map((c) => (
                                      <DropdownMenuItem
                                        key={c}
                                        onSelect={() => handleChangeCategory(doc, c)}
                                      >
                                        {c} {docCategory(doc) === c && "✓"}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleChangeCategory(doc, null)}>
                                      {UNCATEGORIZED} {docCategory(doc) === UNCATEGORIZED && "✓"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(doc);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              هل أنت متأكد من حذف هذا المستند؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">لا يمكن التراجع عن هذه العملية</span>
              {deleteTarget && (
                <span className="block font-medium text-foreground bg-muted rounded-md px-3 py-2 text-sm">
                  📄 {deleteTarget.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2 sm:gap-2">
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!deleteConfirmEnabled || deleting}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? "جاري الحذف..." : deleteConfirmEnabled ? "تأكيد الحذف" : "انتظر..."}
            </Button>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => { if (!open) { setViewTarget(null); setViewContent(""); setViewError(""); } }}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              {viewTarget?.source_type === "web" ? (
                <Globe className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-primary shrink-0" />
              )}
              <span className="truncate">{viewTarget?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewError ? (
              <div className="flex flex-col items-center gap-2 py-8 text-destructive text-sm">
                <AlertCircle className="w-6 h-6" />
                <span>{viewError}</span>
              </div>
            ) : (
              <div className="prose-chat text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewContent}</ReactMarkdown>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => { setViewTarget(null); setViewContent(""); setViewError(""); }}>
              إغلاق
            </Button>
            {viewTarget?.source_url && (
              <Button asChild variant="secondary" className="gap-2">
                <a href={viewTarget.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  فتح المصدر
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledge;
