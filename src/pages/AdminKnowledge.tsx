import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Trash2, Search, Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface KnowledgeDoc {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string | null;
  status: string;
  created_at: string;
}

const AdminKnowledge = () => {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDoc | null>(null);
  const [deleteConfirmEnabled, setDeleteConfirmEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      <Card className={`transition-all duration-300 ease-out animate-scale-in rounded-2xl ${isDark ? "glass-card border-0" : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">إدارة قاعدة المعرفة</CardTitle>
          <Button
            onClick={handleFileSelect}
            disabled={uploading}
            className={`gap-2 transition-all duration-200 ${
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
            {uploading ? "جاري الرفع..." : "رفع مستند"}
          </Button>
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
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-out hover:translate-y-[-2px] ${
                    isDark
                      ? "bg-white/5 border border-white/5 hover:bg-white/8"
                      : "bg-secondary/30 border border-black/5 hover:bg-secondary/60 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg transition-all ${
                      isDark ? "bg-primary/10 glow-highlight" : "bg-primary/10"
                    }`}>
                      <FileText className={`w-5 h-5 text-primary ${isDark ? "glow-icon" : ""}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{doc.file_type.toUpperCase()}</span>
                        <span>·</span>
                        <span>{formatSize(doc.file_size)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          {getStatusText(doc.status)}
                        </span>
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(doc)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
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
    </div>
  );
};

export default AdminKnowledge;
