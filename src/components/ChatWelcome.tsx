import { CalendarDays, BookOpen, GraduationCap, ClipboardList, Sparkles, HelpCircle } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import universityLogo from "@/assets/university-logo.png";

interface ChatWelcomeProps {
  studentName: string;
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  {
    icon: CalendarDays,
    title: "التقويم الأكاديمي",
    question: "متى يبدأ التسجيل للفصل القادم؟",
    color: "text-blue-400",
    bgLight: "bg-blue-50 border-blue-100",
    bgDark: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: BookOpen,
    title: "اللوائح والأنظمة",
    question: "ما هي شروط التحويل بين الأقسام؟",
    color: "text-emerald-400",
    bgLight: "bg-emerald-50 border-emerald-100",
    bgDark: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: GraduationCap,
    title: "الامتحانات",
    question: "كيف أقدم طلب تأجيل امتحان؟",
    color: "text-amber-400",
    bgLight: "bg-amber-50 border-amber-100",
    bgDark: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: ClipboardList,
    title: "الإجراءات الإدارية",
    question: "كيف أحصل على كشف درجات رسمي؟",
    color: "text-purple-400",
    bgLight: "bg-purple-50 border-purple-100",
    bgDark: "bg-purple-500/10 border-purple-500/20",
  },
];

const ChatWelcome = ({ studentName, onSuggestionClick }: ChatWelcomeProps) => {
  const { isDark } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء الخير";
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Logo & Greeting */}
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all ${
            isDark ? "bg-primary/10 glow-primary" : "bg-primary/10"
          }`}>
            <Sparkles className={`w-8 h-8 text-primary ${isDark ? "glow-icon" : ""}`} />
          </div>
          <div className="space-y-2">
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
              {getGreeting()}، {studentName} 👋
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              كيف يمكنني مساعدتك اليوم؟
            </p>
          </div>
        </div>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(suggestion.question)}
              className={`group text-right p-4 rounded-2xl border transition-all duration-300 animate-fade-in-up hover:translate-y-[-2px] ${
                isDark
                  ? `${suggestion.bgDark} hover:bg-white/8 hover:shadow-[0_8px_30px_rgba(112,200,255,0.06)]`
                  : `${suggestion.bgLight} hover:shadow-md hover:shadow-primary/5`
              }`}
              style={{ animationDelay: `${0.15 + i * 0.08}s`, opacity: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 transition-all duration-200 ${
                  isDark ? "bg-white/5 group-hover:bg-white/10" : "bg-white/80 group-hover:bg-white"
                }`}>
                  <suggestion.icon className={`w-5 h-5 ${suggestion.color} ${isDark ? "glow-icon" : ""}`} />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className={`text-sm font-bold ${isDark ? "text-foreground" : "text-foreground"}`}>
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {suggestion.question}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Help hint */}
        <div className="animate-fade-in-up flex items-center justify-center gap-2 text-muted-foreground/60" style={{ animationDelay: "0.5s", opacity: 0 }}>
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-xs">يمكنك كتابة أي سؤال أو اختيار أحد الاقتراحات أعلاه</span>
        </div>
      </div>
    </div>
  );
};

export default ChatWelcome;
