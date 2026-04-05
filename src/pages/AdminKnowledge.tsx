import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Trash2, Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const isText = ["txt", "md", "csv"].includes(fileExt);
        const isPdf = fileExt === "pdf";

        if (!isText && !isPdf) {
          toast({
            title: "نوع ملف غير مدعوم",
            description: `الملف ${file.name} غير مدعوم. يُقبل PDF و TXT و MD و CSV فقط.`,
            variant: "destructive",
          });
          continue;
        }

        // 1. Create document record
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

        let filePath: string | null = null;
        let contentText: string | null = null;

        if (isText) {
          // Read text files directly
          contentText = await file.text();
        } else {
          // Upload PDF to storage - use ASCII-safe path
          const safeFileName = `${Date.now()}.${fileExt}`;
          const storagePath = `${docData.id}/${safeFileName}`;
          const { error: uploadError } = await supabase.storage
            .from("knowledge")
            .upload(storagePath, file);

          if (uploadError) {
            throw new Error("فشل رفع الملف: " + uploadError.message);
          }
          filePath = storagePath;

          // Update file_path
          await supabase
            .from("knowledge_documents")
            .update({ file_path: filePath })
            .eq("id", docData.id);
        }

        // 2. Call process-document edge function
        const { error: fnError } = await supabase.functions.invoke("process-document", {
          body: {
            document_id: docData.id,
            file_path: filePath,
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
        // Clean up the failed document record
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
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (doc: KnowledgeDoc) => {
    try {
      // Delete from storage if file exists
      if (doc.file_path) {
        await supabase.storage.from("knowledge").remove([doc.file_path]);
      }

      // Delete from database (chunks cascade)
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast({
        title: "تم الحذف",
        description: `تم حذف "${doc.name}" من قاعدة المعرفة.`,
      });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل حذف المستند",
        variant: "destructive",
      });
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
      <Card className={`transition-all duration-300 animate-scale-in ${isDark ? "glass-card border-0" : ""}`}>
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
            accept=".pdf,.txt,.md,.csv"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ارفع ملفات PDF أو نصوص (TXT, MD, CSV) ليتمكن المساعد الذكي من استخدامها في الإجابة على أسئلة الطلاب.
          </p>

          {/* Search */}
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

          {/* Documents list */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {documents.length === 0 ? "لم يتم رفع أي مستندات بعد" : "لا توجد مستندات مطابقة"}
              </p>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "bg-white/5 border border-white/5 hover:bg-white/8"
                      : "border border-border hover:bg-secondary/50"
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
                    onClick={() => handleDelete(doc)}
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
    </div>
  );
};

export default AdminKnowledge;
