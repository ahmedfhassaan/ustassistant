import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Upload, Trash2, FileText, File, Search } from "lucide-react";
import universityLogo from "@/assets/university-logo.png";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

const AdminKnowledge = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "دليل الطالب 2024-2025.pdf", type: "PDF", size: "2.4 MB", uploadedAt: "2025-01-15" },
    { id: "2", name: "التقويم الأكاديمي.pdf", type: "PDF", size: "580 KB", uploadedAt: "2025-01-10" },
    { id: "3", name: "لائحة الدراسة والاختبارات.docx", type: "DOC", size: "1.1 MB", uploadedAt: "2024-12-20" },
    { id: "4", name: "جدول المحاضرات - الفصل الثاني.pdf", type: "PDF", size: "890 KB", uploadedAt: "2025-02-01" },
  ]);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const newDocs: Document[] = Array.from(files).map((f, i) => ({
        id: Date.now().toString() + i,
        name: f.name,
        type: f.name.endsWith(".pdf") ? "PDF" : "DOC",
        size: (f.size / 1024 / 1024).toFixed(1) + " MB",
        uploadedAt: new Date().toISOString().split("T")[0],
      }));
      setDocuments((prev) => [...newDocs, ...prev]);
    };
    input.click();
  };

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={universityLogo} alt="شعار الجامعة" className="w-10 h-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground">إدارة قاعدة المعرفة</h1>
            <p className="text-xs text-muted-foreground">رفع وإدارة مستندات الجامعة</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة للوحة التحكم
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Upload & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleUpload} className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Upload className="w-4 h-4 ml-2" />
            رفع مستند جديد
          </Button>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في المستندات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
              dir="rtl"
            />
          </div>
        </div>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              المستندات ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مستندات</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <File className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} • {doc.size} • {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminKnowledge;
