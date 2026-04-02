import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Trash2,
  BookOpen,
  LogOut,
  LayoutDashboard,
  Search,
  File,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import universityLogo from "@/assets/university-logo.png";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

const initialDocs: Document[] = [
  { id: "1", name: "دليل الطالب 2024-2025.pdf", type: "PDF", size: "3.2 MB", uploadedAt: "2025-01-15" },
  { id: "2", name: "التقويم الأكاديمي.pdf", type: "PDF", size: "1.1 MB", uploadedAt: "2025-01-10" },
  { id: "3", name: "لائحة الاختبارات.docx", type: "DOC", size: "850 KB", uploadedAt: "2025-02-01" },
  { id: "4", name: "جدول المحاضرات - الفصل الثاني.pdf", type: "PDF", size: "2.4 MB", uploadedAt: "2025-02-05" },
  { id: "5", name: "شروط القبول والتحويل.pdf", type: "PDF", size: "1.8 MB", uploadedAt: "2024-12-20" },
];

const AdminKnowledge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/");
  };

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
        id: `new-${Date.now()}-${i}`,
        name: f.name,
        type: f.name.split(".").pop()?.toUpperCase() || "FILE",
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString().split("T")[0],
      }));
      setDocuments((prev) => [...newDocs, ...prev]);
    };
    input.click();
  };

  const filtered = documents.filter((d) =>
    d.name.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-secondary/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <img src={universityLogo} alt="الشعار" className="w-10 h-10" />
          <div>
            <h2 className="font-bold text-sm text-foreground">لوحة التحكم</h2>
            <p className="text-xs text-muted-foreground">المشرف</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/admin"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            لوحة التحكم
          </Link>
          <Link
            to="/admin/knowledge"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/admin/knowledge"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            قاعدة المعرفة
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة قاعدة المعرفة</h1>
              <p className="text-muted-foreground text-sm mt-1">رفع وإدارة المستندات التي يعتمد عليها المساعد</p>
            </div>
            <Button
              onClick={handleUpload}
              className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              <Upload className="w-4 h-4" />
              رفع مستند
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في المستندات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-11"
              dir="rtl"
            />
          </div>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
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
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <File className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} • {doc.size} • تم الرفع: {doc.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminKnowledge;
