import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import universityLogo from "@/assets/university-logo.png";

interface ChatHeaderProps {
  studentName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

const ChatHeader = ({ studentName, onLogout, onMenuClick }: ChatHeaderProps) => {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <img src={universityLogo} alt="شعار الجامعة" className="h-9 w-auto" />
        <span className="font-semibold text-sm text-foreground hidden sm:inline">المساعد الجامعي الذكي</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{studentName}</span>
        <Button variant="ghost" size="icon" onClick={onLogout} title="تسجيل الخروج">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
