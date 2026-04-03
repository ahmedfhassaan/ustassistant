import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.png";

const ADMIN_CREDENTIALS = { id: "admin", password: "admin123" };

const Login = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isDark, toggle } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentId.trim()) {
      setError("يرجى إدخال الرقم الجامعي");
      return;
    }
    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (studentId === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem("admin", JSON.stringify({ id: studentId, name: "المشرف" }));
        setIsLoading(false);
        navigate("/admin");
        return;
      }

      localStorage.setItem("student", JSON.stringify({ id: studentId, name: "طالب جامعي" }));
      setIsLoading(false);
      navigate("/chat");
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="fixed top-4 left-4 z-50 text-muted-foreground hover:text-foreground"
        title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      >
        {isDark ? <Sun className="w-5 h-5 text-[hsl(var(--highlight))]" /> : <Moon className="w-5 h-5" />}
      </Button>

      {/* Glow decorations for dark mode */}
      {isDark && (
        <>
          <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(112,200,255,0.15) 0%, transparent 70%)" }} />
          <div className="fixed bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,213,79,0.12) 0%, transparent 70%)" }} />
        </>
      )}

      <div className={`w-full max-w-sm space-y-8 relative z-10 p-8 rounded-3xl transition-all duration-300 ${
        isDark ? "glass-card" : ""
      }`}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={universityLogo}
            alt="شعار جامعة العلوم والتكنولوجيا"
            className={`w-36 h-auto ${isDark ? "glow-icon" : ""}`}
          />
          <h1 className="text-xl font-bold text-foreground">المساعد الجامعي الذكي</h1>
          <p className="text-sm text-muted-foreground">سجّل دخولك للبدء في استخدام المساعد</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="studentId" className="text-sm font-medium">الرقم الجامعي</Label>
            <Input
              id="studentId"
              type="text"
              placeholder="أدخل رقمك الجامعي"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={`text-right h-11 ${isDark ? "glass-input" : ""}`}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`text-right h-11 ${isDark ? "glass-input" : ""}`}
              dir="rtl"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center font-medium">{error}</p>
          )}

          <Button
            type="submit"
            className={`w-full h-11 text-base font-semibold transition-all duration-200 ${
              isDark
                ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary"
                : "bg-primary hover:bg-primary-hover text-primary-foreground"
            }`}
            disabled={isLoading}
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
