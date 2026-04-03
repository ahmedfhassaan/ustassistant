import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, BookOpen, HelpCircle, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.png";

const navItems = [
  { path: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/knowledge", label: "قاعدة المعرفة", icon: BookOpen },
  { path: "/admin/faq", label: "الأسئلة الشائعة", icon: HelpCircle },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggle } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`shrink-0 w-64 border-l flex flex-col h-full
          fixed lg:static z-40 top-0 right-0 transition-all duration-300
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          ${isDark ? "glass-sidebar" : "bg-card border-border"}`}
      >
        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? "border-white/6" : "border-border"}`}>
          <img src={isDark ? universityLogoDark : universityLogo} alt="شعار الجامعة" className={`w-10 h-10 object-contain ${isDark ? "glow-icon" : ""}`} />
          <div>
            <h2 className={`font-bold text-base text-foreground ${isDark ? "glow-text" : ""}`}>لوحة تحكم المشرف</h2>
            <p className="text-xs text-muted-foreground mt-0.5">إدارة المساعد الذكي</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? "bg-primary/15 text-primary border border-primary/20 glow-primary"
                      : "bg-primary/10 text-primary"
                    : isDark
                      ? "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive && isDark ? "glow-icon" : ""}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={`p-3 border-t ${isDark ? "border-white/6" : "border-border"}`}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className={`h-14 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 ${
          isDark ? "glass-header" : "bg-card border-b border-border"
        }`}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className={`text-lg font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
            {navItems.find((i) => i.path === location.pathname)?.label || "لوحة التحكم"}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
