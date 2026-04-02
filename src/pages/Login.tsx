import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import universityLogo from "@/assets/university-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    // Simulate login - will be replaced with real auth
    setTimeout(() => {
      localStorage.setItem("student", JSON.stringify({ id: studentId, name: "طالب جامعي" }));
      setIsLoading(false);
      navigate("/chat");
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={universityLogo}
            alt="شعار جامعة العلوم والتكنولوجيا"
            className="w-36 h-auto"
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
              className="text-right h-11"
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
              className="text-right h-11"
              dir="rtl"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center font-medium">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary-hover text-primary-foreground"
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
