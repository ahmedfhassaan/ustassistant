import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Moon, Sun, GraduationCap, BookOpen, Users, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.jpeg";

const features = [
  { icon: GraduationCap, text: "التقويم الأكاديمي والمواعيد" },
  { icon: BookOpen, text: "اللوائح والأنظمة الجامعية" },
  { icon: Users, text: "الإجراءات الإدارية" },
  { icon: Shield, text: "دعم فوري على مدار الساعة" },
];

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

    try {
      // Check admin credentials from DB
      if (studentId === "admin") {
        const { data } = await supabase
          .from("assistant_settings")
          .select("value")
          .eq("key", "admin_password")
          .maybeSingle();

        const adminPass = data?.value || "admin123";
        if (password === adminPass) {
          localStorage.setItem("admin", JSON.stringify({ id: studentId, name: "المشرف" }));
          setIsLoading(false);
          navigate("/admin");
          return;
        } else {
          setError("كلمة المرور غير صحيحة");
          setIsLoading(false);
          return;
        }
      }

      // Verify student credentials from DB
      const { data, error: rpcError } = await supabase.rpc("verify_student_login", {
        p_student_id: studentId.trim(),
        p_password: password,
      });

      if (rpcError) {
        setError("حدث خطأ أثناء تسجيل الدخول");
        setIsLoading(false);
        return;
      }

      const result = data as { success: boolean; id?: string; student_id?: string; name?: string };

      if (!result?.success) {
        setError("الرقم الجامعي أو كلمة المرور غير صحيحة");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("student", JSON.stringify({ id: result.student_id, name: result.name }));
      setIsLoading(false);
      navigate("/chat");
    } catch {
      setError("حدث خطأ أثناء تسجيل الدخول");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row-reverse relative overflow-hidden animate-fade-in">
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

      {/* Ambient glow decorations */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, rgba(112,200,255,0.18) 0%, transparent 65%)" }} />
      <div className="fixed bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-15"
        style={{ background: "radial-gradient(circle, rgba(255,213,79,0.12) 0%, transparent 65%)" }} />
      {isDark && (
        <div className="fixed top-[40%] left-[30%] w-[300px] h-[300px] rounded-full pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle, rgba(112,200,255,0.15) 0%, transparent 70%)" }} />
      )}

      {/* Left panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center p-12 relative">
        <div className="max-w-md text-center space-y-8 animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          <div className="relative w-44 h-44 mx-auto">
            <img
              src={universityLogo}
              alt="شعار جامعة العلوم والتكنولوجيا"
              className={`absolute inset-0 w-44 h-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-0" : "opacity-100"}`}
            />
            <img
              src={universityLogoDark}
              alt="شعار جامعة العلوم والتكنولوجيا"
              className={`absolute inset-0 w-44 h-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-100 drop-shadow-[0_0_8px_rgba(112,200,255,0.15)]" : "opacity-0"}`}
            />
          </div>
          <div className="space-y-3">
            <h1 className={`text-3xl font-bold ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
              المساعد الجامعي الذكي
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              منصة ذكية تعتمد على الذكاء الاصطناعي لمساعدة الطلاب في الحصول على المعلومات الجامعية بسهولة وسرعة
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 animate-fade-in-up ${
                  isDark
                    ? "bg-white/5 border border-white/8 hover:bg-white/8"
                    : "bg-primary/5 border border-primary/10 hover:bg-primary/10"
                }`}
                style={{ animationDelay: `${0.3 + i * 0.1}s`, opacity: 0 }}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  isDark ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
                }`}>
                  <feature.icon className={`w-4 h-4 ${isDark ? "glow-icon" : ""}`} />
                </div>
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-8 relative ${
        isDark ? "" : "lg:bg-muted/40"
      }`}>
        {/* Subtle divider line for light mode */}
        {!isDark && (
          <div className="hidden lg:block absolute right-0 top-[10%] bottom-[10%] w-px bg-border/50" />
        )}

        <div className={`w-full max-w-sm space-y-7 relative z-10 p-8 rounded-3xl transition-colors duration-300 animate-scale-in ${
          isDark
            ? "bg-[hsl(222_40%_14%)] border border-primary/25 shadow-[0_0_40px_rgba(112,200,255,0.08),0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5"
            : "bg-background shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-border/40 ring-1 ring-primary/5"
        }`}>
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
            <div className="relative w-28 h-28 mx-auto">
              <img
                src={universityLogo}
                alt="شعار جامعة العلوم والتكنولوجيا"
                className={`absolute inset-0 w-28 h-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-0" : "opacity-100"}`}
              />
              <img
                src={universityLogoDark}
                alt="شعار جامعة العلوم والتكنولوجيا"
                className={`absolute inset-0 w-28 h-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-100 drop-shadow-[0_0_6px_rgba(112,200,255,0.15)]" : "opacity-0"}`}
              />
            </div>
            <h1 className={`text-xl font-bold ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
              المساعد الجامعي الذكي
            </h1>
          </div>

          {/* Form header */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
            <h2 className={`text-lg font-bold ${isDark ? "text-foreground" : "text-foreground"}`}>
              تسجيل الدخول
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              أدخل بياناتك للوصول إلى المساعد
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.25s", opacity: 0 }}>
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium">الرقم الجامعي</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="أدخل رقمك الجامعي"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                autoComplete="off"
                className={`text-right h-12 rounded-xl transition-all duration-200 ${
                  isDark
                    ? "glass-input focus:border-primary/40 focus:shadow-[0_0_12px_rgba(112,200,255,0.08)]"
                    : "border-border/60 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                }`}
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
                className={`text-right h-12 rounded-xl transition-all duration-200 ${
                  isDark
                    ? "glass-input focus:border-primary/40 focus:shadow-[0_0_12px_rgba(112,200,255,0.08)]"
                    : "border-border/60 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                }`}
                dir="rtl"
              />
            </div>

            {error && (
              <div className={`flex items-center gap-2 justify-center p-3 rounded-xl text-sm font-medium animate-fade-in ${
                isDark
                  ? "bg-destructive/10 border border-destructive/20 text-destructive"
                  : "bg-destructive/5 border border-destructive/15 text-destructive"
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={`w-full h-12 text-base font-semibold rounded-xl transition-all duration-300 mt-2 ${
                isDark
                  ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary hover:shadow-[0_0_20px_rgba(112,200,255,0.12)]"
                  : "bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:translate-y-[-1px]"
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-[11px] text-muted-foreground/60 text-center animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
            جامعة العلوم والتكنولوجيا © {new Date().getFullYear()} — v{__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
