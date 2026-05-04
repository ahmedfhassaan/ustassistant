import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Moon,
  Sun,
  Mail,
  GraduationCap,
  MessageCircle,
  Clock,
  Globe,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { contactInfo, whatsappLink } from "@/config/contact";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.jpeg";

interface ContactCardProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href?: string;
  hint?: string;
}

const ContactCard = ({ Icon, title, value, href, hint }: ContactCardProps) => {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/15 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-sm font-semibold text-foreground break-all" dir="ltr" style={{ textAlign: "right" }}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</p>}
      </div>
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="block rounded-xl border border-border/60 bg-muted/20 p-4 hover:bg-primary/5 hover:border-primary/25 transition-colors"
      >
        {inner}
      </a>
    );
  }
  return <div className="rounded-xl border border-border/60 bg-muted/30 p-4">{inner}</div>;
};

const Contact = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const cardElevated = isDark
    ? "bg-[hsl(222_40%_14%)] border-primary/25 shadow-[0_0_40px_rgba(112,200,255,0.08),0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-3xl"
    : "bg-background border-border/40 ring-1 ring-primary/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-3xl";

  const c = contactInfo;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header
        className={`h-14 border-b flex items-center justify-between px-4 sticky top-0 z-30 ${
          isDark ? "glass-header border-transparent" : "bg-background border-border"
        }`}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="رجوع">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="relative h-9 w-[110px] shrink-0">
            <img
              src={universityLogo}
              alt="شعار الجامعة"
              className={`absolute inset-0 h-9 w-auto object-contain transition-opacity duration-200 ${
                isDark ? "opacity-0" : "opacity-100"
              }`}
            />
            <img
              src={universityLogoDark}
              alt="شعار الجامعة"
              className={`absolute inset-0 h-9 w-auto object-contain transition-opacity duration-200 ${
                isDark ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
          <span className="font-bold text-base hidden sm:inline">تواصل معنا</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* الهيرو */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <Badge variant="secondary" className="mb-3">
                <Sparkles className="w-3.5 h-3.5 ml-1" />
                نحن هنا للمساعدة
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
                تواصل مع فريق المساعد الذكي
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                إذا واجهت مشكلة في النظام، أو لاحظت إجابة غير دقيقة، أو لديك اقتراح لتحسين الخدمة —
                يسعدنا تواصلك عبر إحدى القنوات أدناه.
              </p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          </div>
        </section>

        {/* قنوات التواصل */}
        <Card className={cardElevated}>
          <CardHeader>
            <CardTitle className="text-lg">قنوات التواصل</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.supportEmail && (
              <ContactCard
                Icon={Mail}
                title="بريد الدعم الفني"
                value={c.supportEmail}
                href={`mailto:${c.supportEmail}`}
                hint="للأعطال التقنية أو مشاكل الدخول."
              />
            )}
            {c.registrationEmail && (
              <ContactCard
                Icon={GraduationCap}
                title="شؤون الطلاب والقبول"
                value={c.registrationEmail}
                href={`mailto:${c.registrationEmail}`}
                hint="للاستفسارات الأكاديمية الرسمية."
              />
            )}
            {c.whatsapp && (
              <ContactCard
                Icon={MessageCircle}
                title="واتساب"
                value={c.whatsapp}
                href={whatsappLink(c.whatsapp)}
                hint="استجابة سريعة خلال ساعات العمل."
              />
            )}
            {c.workingHours && (
              <ContactCard Icon={Clock} title="ساعات العمل" value={c.workingHours} />
            )}
            {c.universityWebsite && (
              <ContactCard
                Icon={Globe}
                title="الموقع الرسمي للجامعة"
                value={c.universityWebsite.replace(/^https?:\/\//, "")}
                href={c.universityWebsite}
                hint="المرجع الرسمي للمعلومات الأكاديمية."
              />
            )}
            {c.reportIssueNote && (
              <ContactCard
                Icon={ThumbsDown}
                title="الإبلاغ عن إجابة خاطئة"
                value="من داخل المحادثة"
                hint={c.reportIssueNote}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/chat">
            <Button size="sm" variant="default">العودة للمحادثة</Button>
          </Link>
          <Link to="/docs">
            <Button size="sm" variant="outline">قراءة التوثيق</Button>
          </Link>
        </div>

        <footer className="text-center text-xs text-muted-foreground py-6">
          Smart University Assistant — تواصل معنا
        </footer>
      </main>
    </div>
  );
};

export default Contact;
