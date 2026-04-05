import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/hooks/use-settings";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.jpeg";

interface ChatHeaderProps {
  studentName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

const ChatHeader = ({ studentName, onLogout, onMenuClick }: ChatHeaderProps) => {
  const { isDark, toggle } = useTheme();
  const { settings } = useSettings();

  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-300 animate-slide-in-left ${
      isDark ? "glass-header border-transparent" : "bg-background border-border"
    }`}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <img
          src={isDark ? universityLogoDark : universityLogo}
          alt="شعار جامعة العلوم والتكنولوجيا"
          className={`h-10 w-auto object-contain ${isDark ? "drop-shadow-[0_0_6px_rgba(112,200,255,0.15)]" : ""}`}
        />
        <span className={`font-bold text-base hidden sm:inline ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
          {settings.assistant_name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
        </Button>
        <span className="text-sm text-muted-foreground">{studentName}</span>
        <Button variant="ghost" size="icon" onClick={onLogout} title="تسجيل الخروج">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
