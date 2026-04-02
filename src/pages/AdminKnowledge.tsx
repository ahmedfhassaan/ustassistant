import { useState } from "react";
import { Upload, FileText, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

const initialDocs: Document[] = [
  { id: "1", name: "دليل الطالب 2025-2026.pdf", type: "PDF", size: "4.2 MB", uploadedAt: "2026-01-15" },
  { id: "2", name: "التقويم الأكاديمي.pdf", type: "PDF", size: "1.1 MB", uploadedAt: "2026-01-10" },
  { id: "3", name: "لائحة الاختبارات.docx", type: "DOC", size: "820 KB", uploadedAt: "2025-12-20" },
  { id: "4", name: "نظام التسجيل والقبول.pdf", type: "PDF", size: "2.5 MB", uploadedAt: "2025-11-05" },
];

const AdminKnowledge = () => {
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [searchQuery, setSearchQuery] = useState("");
  const { isDark } = useTheme();

  const filteredDocs = documents.filter((d) =>
    d.name.includes(searchQuery)
  );

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpload = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: `مستند جديد ${documents.length + 1}.pdf`,
      type: "PDF",
      size: "1.0 MB",
      uploadedAt: new Date().toISOString().split("T")[0],
    };
    setDocuments((prev) => [newDoc, ...prev]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className={`transition-all duration-300 ${isDark ? "glass-card border-0" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">إدارة المستندات</CardTitle>
          <Button onClick={handleUpload} className={`gap-2 transition-all duration-200 ${
            isDark
              ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary"
              : "bg-primary hover:bg-primary-hover text-primary-foreground"
          }`}>
            <Upload className="w-4 h-4" />
            رفع مستند
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {filteredDocs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">لا توجد مستندات مطابقة</p>
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
                      <p className="text-xs text-muted-foreground">
                        {doc.type} · {doc.size} · {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
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
