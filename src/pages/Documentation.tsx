import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Moon,
  Sun,
  MessageSquare,
  Database,
  FileText,
  Upload,
  Link2,
  ShieldCheck,
  LayoutDashboard,
  KeyRound,
  Gauge,
  AlertTriangle,
  Wrench,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTheme } from "@/hooks/use-theme";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.jpeg";

// أرقام عربية-هندية لاستعمالها داخل الصفحة
const AR_NUMS = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١١", "١٢"];

const SECTIONS = [
  { id: "overview", title: "نظرة عامة على النظام", icon: Sparkles },
  { id: "chat", title: "واجهة الدردشة", icon: MessageSquare },
  { id: "rag", title: "نظام RAG", icon: Database },
  { id: "knowledge", title: "قاعدة المعرفة", icon: FileText },
  { id: "uploads", title: "رفع الملفات", icon: Upload },
  { id: "sources", title: "عرض المصادر", icon: Link2 },
  { id: "admin", title: "لوحة المشرف", icon: LayoutDashboard },
  { id: "auth", title: "تسجيل الدخول والصلاحيات", icon: KeyRound },
  { id: "security", title: "الأمان والخصوصية", icon: ShieldCheck },
  { id: "performance", title: "الأداء والتوسّع", icon: Gauge },
  { id: "limits", title: "حدود النظام", icon: AlertTriangle },
  { id: "developers", title: "ملاحظات المطورين", icon: Wrench },
];

// بطاقة معلومات صغيرة (مفتاح/قيمة) داخل الهيرو
const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1 text-right">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </div>
);

// رأس قسم موحّد
const SectionHeader = ({
  index,
  title,
  subtitle,
  Icon,
}: {
  index: number;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-start gap-3">
    <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/15 text-primary flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
        <span className="text-primary/80 font-semibold">{AR_NUMS[index]}.</span>
        <span>{title}</span>
      </CardTitle>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  </div>
);

// تنبيه ملوّن داخل الأقسام
const Notice = ({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "success";
  children: React.ReactNode;
}) => {
  const styles =
    tone === "warn"
      ? "bg-destructive/10 border-destructive/20 text-foreground"
      : tone === "success"
      ? "bg-primary/10 border-primary/20 text-foreground"
      : "bg-muted/50 border-border text-foreground";
  const icon =
    tone === "warn" ? "⚠️" : tone === "success" ? "✅" : "💡";
  return (
    <div className={`rounded-lg border p-3 text-sm leading-relaxed ${styles}`}>
      <span className="ml-1">{icon}</span>
      {children}
    </div>
  );
};

const Bullet = ({ icon = "✅", children }: { icon?: string; children: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-sm leading-relaxed">
    <span className="mt-0.5">{icon}</span>
    <span>{children}</span>
  </li>
);

const MiniCard = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
    <h4 className="font-semibold text-sm text-foreground mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
  </div>
);

const Documentation = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  // نفس أسلوب إبراز بطاقة تسجيل الدخول
  const cardElevated = isDark
    ? "bg-[hsl(222_40%_14%)] border-primary/25 shadow-[0_0_40px_rgba(112,200,255,0.08),0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-3xl"
    : "bg-background border-border/40 ring-1 ring-primary/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-3xl";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Header مبسّط */}
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
          <span className="font-bold text-base hidden sm:inline">التوثيق</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}>
          {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* الهيرو */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-10">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <Badge variant="secondary" className="mb-3">
                <BookOpen className="w-3.5 h-3.5 ml-1" />
                وثيقة النظام — الإصدار ١٫٠
              </Badge>
              <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
                وثيقة نظام Smart University Assistant
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                مساعد ذكي عربي للطلاب الجامعيين يعتمد على قاعدة معرفة رسمية ويستخدم تقنية RAG لاسترجاع
                المعلومات الدقيقة، مع عرض المصادر وعدم الإجابة من المعرفة العامة عند غياب المعلومة.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">RTL</Badge>
                <Badge variant="outline">عربي</Badge>
                <Badge variant="outline">RAG</Badge>
                <Badge variant="outline">Gemini</Badge>
                <Badge variant="outline">Supabase</Badge>
                <Badge variant="outline">React + Vite</Badge>
              </div>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <InfoCell label="اسم النظام" value="Smart University Assistant" />
            <InfoCell label="إصدار الوثيقة" value="١٫٠ — نهائي" />
            <InfoCell label="نوع النظام" value="مساعد ذكي للطلاب" />
            <InfoCell label="التقنية المستخدمة" value="RAG + Gemini" />
            <InfoCell label="الهدف" value="دعم الطلاب بدقة وأمان" />
          </div>
        </section>

        {/* فهرس المحتويات */}
        <Card className={cardElevated}>
          <CardHeader>
            <CardTitle className="text-lg">فهرس المحتويات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 hover:bg-primary/10 hover:border-primary/25 transition-colors text-sm"
                >
                  <span className="h-7 w-7 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {AR_NUMS[i]}
                  </span>
                  <span className="font-medium">{s.title}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 1. نظرة عامة */}
        <Card id="overview" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={0} title="نظرة عامة على النظام" subtitle="ما هو النظام، ولمن، وما الذي يحلّه" Icon={Sparkles} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed text-sm md:text-base">
              <strong>Smart University Assistant</strong> مساعد ذكي عربي مخصّص لطلاب الجامعة. يجيب عن
              الأسئلة الأكاديمية والإدارية اعتماداً على قاعدة معرفة رسمية يحدّثها المشرف، ويستخدم تقنية
              <strong> RAG</strong> (الاسترجاع المعزّز بالتوليد) لاستخراج المعلومات الأكثر صلة قبل صياغة
              الإجابة. لا يجيب من المعرفة العامة للنموذج عند غياب معلومة موثّقة.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniCard title="الجمهور المستهدف" body="طلاب الجامعة الباحثون عن إجابات دقيقة وسريعة عن القبول والمقررات والخطط الدراسية والخدمات." />
              <MiniCard title="القيمة الأساسية" body="إجابات موثّقة بمصادر، بدلاً من البحث اليدوي في المواقع والوثائق المتفرقة." />
              <MiniCard title="فلسفة المنتج" body="بساطة قصوى، وضوح، وأمان. تجنّب التعقيد التقني غير الضروري للمستخدم." />
            </div>
          </CardContent>
        </Card>

        {/* 2. واجهة الدردشة */}
        <Card id="chat" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={1} title="واجهة الدردشة" subtitle="تجربة محادثة عربية RTL مع Markdown" Icon={MessageSquare} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <Bullet>دعم كامل للاتجاه من اليمين لليسار وخط Tajawal.</Bullet>
              <Bullet>فقاعات زرقاء للمستخدم ورمادية للمساعد لتمييز واضح.</Bullet>
              <Bullet>عرض الإجابة على شكل بث (Streaming) بدون انتظار.</Bullet>
              <Bullet>دعم Markdown داخل الإجابة (قوائم، عناوين، روابط، شيفرة).</Bullet>
              <Bullet>اقتراحات سريعة في شاشة الترحيب لتسهيل بدء المحادثة.</Bullet>
              <Bullet icon="🌓">وضع داكن وفاتح مع الحفاظ على التباين.</Bullet>
            </ul>
            <Notice tone="info">
              تُحفظ المحادثات في السحابة لكل طالب لتظهر على جميع أجهزته بنفس الترتيب.
            </Notice>
          </CardContent>
        </Card>

        {/* 3. RAG */}
        <Card id="rag" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={2} title="نظام RAG" subtitle="استرجاع المعلومات قبل توليد الإجابة" Icon={Database} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm md:text-base leading-relaxed">
              يعتمد النظام على بحث هجين (Hybrid Search) يجمع بين البحث النصي الكامل (FTS) والبحث الدلالي
              عبر متجهات (pgvector). تُجمع النتائج بأوزان متوازنة، ثم تُمرَّر للنموذج التوليدي مع تعليمات
              صارمة بعدم تجاوز السياق.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المرحلة</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">١. كاش هاش</TableCell>
                  <TableCell>تطابق حرفي للسؤال (بعد التطبيع). TTL افتراضي ٢٤ ساعة، نطاق آمن <code>1h–72h</code>. يُخزَّن <code>source_set_hash</code> لإبطال الكاش عند تغيُّر الوثائق.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٢. كاش دلالي</TableCell>
                  <TableCell>مطابقة بمتجهات بعتبة افتراضية <code>cosine ≥ 0.92</code>. يُعاد الإجابة المخزَّنة مع علامة <code>cache_hit: 'semantic'</code> للشفافية.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٣. إعادة صياغة الاستعلام</TableCell>
                  <TableCell>تحسين السؤال (<code>rewrite-query</code>) بمهلة <code>3s</code> صارمة، مع fallback للسؤال الأصلي عند الفشل أو التجاوز.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٤. البحث الهجين</TableCell>
                  <TableCell>دمج <code>0.4·FTS + 0.6·Semantic</code> بعد تطبيع <code>min-max</code> على نفس السلَّم <code>[0,1]</code>. عند غياب المتجه: fallback إلى FTS وحده.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٥. تصنيف النية</TableCell>
                  <TableCell>تحديد نوع السؤال (قبول/تسجيل/مقررات/مشاريع/عام) لتوجيه التصفية واستبعاد مصادر غير ملائمة.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٦. عتبة الثقة</TableCell>
                  <TableCell>افتراضي <code>0.62</code> ضمن نطاق آمن <code>[0.5, 0.8]</code>. أقل من ذلك ⇒ اعتذار صريح بدل التخمين.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٧. التوليد المقيَّد</TableCell>
                  <TableCell>Gemini SSE بمهلة <code>25s</code>، ضمن ميزانية إجمالية للطلب <code>30s</code>. تنتهي بإجابة جزئية أو اعتذار.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="حجم المقطع" body="600 token لكل Chunk مع تداخل 80 token لتحسين الاسترجاع." />
              <MiniCard title="أبعاد المتجه" body="768 عبر outputDimensionality (الافتراضي للنموذج 3072)." />
              <MiniCard title="ميزانية الطلب" body="p50 ≤ 1.2s (كاش) / p95 ≤ 6s (RAG كامل)." />
              <MiniCard title="منع الهلوسة" body="غياب مصادر بثقة < 0.62 ⇒ اعتذار بدلاً من التوليد." />
            </div>
            <Notice tone="success">
              عتبة الثقة (Confidence Threshold) قابلة للضبط من لوحة المشرف لتحقيق التوازن بين الدقة والتغطية.
            </Notice>
          </CardContent>
        </Card>

        {/* 4. قاعدة المعرفة */}
        <Card id="knowledge" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={3} title="قاعدة المعرفة" subtitle="مصدر الحقيقة الوحيد للمساعد" Icon={FileText} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm md:text-base leading-relaxed">
              قاعدة المعرفة هي <strong>مصدر الحقيقة الوحيد</strong>. المساعد لا يجيب من معرفة النموذج العامة،
              ويصنّف الوثائق إلى ثلاثة أنواع رئيسية:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniCard title="وثائق رسمية" body="لوائح، خطط دراسية، إرشادات قبول وتسجيل، رسوم وخدمات. تُرفع كملفات Markdown." />
              <MiniCard title="مشاريع تخرج سابقة" body="مرجع للطلاب الباحثين عن أمثلة. تُستبعد تلقائياً من أسئلة القبول/التسجيل/المقررات." />
              <MiniCard title="مصادر ويب" body="صفحات يحدّدها المشرف ويتم زحفها (crawl-website) ومعالجتها كقاعدة معرفة." />
            </div>
            <ul className="space-y-2">
              <Bullet>تقسيم آلي إلى مقاطع (Chunks) بطول ≈ ٦٠٠ كلمة لتحسين الاسترجاع.</Bullet>
              <Bullet>توليد متجهات (Embeddings) بحجم ٧٦٨ بُعداً عبر gemini-embedding-001.</Bullet>
              <Bullet>تطبيع النص العربي (تشكيل، همزات، تاء مربوطة) عبر مكتبة مشتركة.</Bullet>
              <Bullet>إعادة معالجة المقاطع وتوليد المتجهات الناقصة عبر backfill-embeddings.</Bullet>
              <Bullet icon="⚠️">المساعد لا يخترع معلومات: غياب المصدر = الاعتذار عن الإجابة.</Bullet>
            </ul>
          </CardContent>
        </Card>

        {/* 5. رفع الملفات */}
        <Card id="uploads" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={4} title="رفع الملفات" subtitle="إدخال آمن ومنضبط للمحتوى" Icon={Upload} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="ملفات Markdown" body="رفع داخلي عبر لوحة المشرف لملفات .md نصية فقط — يضمن الجودة ويتجنّب فقدان البنية." />
              <MiniCard title="مصادر ويب (URL)" body="تزويد المشرف بروابط ليتم زحفها (crawl-website)، استخراج النص، ودمجها في قاعدة المعرفة." />
              <MiniCard title="مسار المعالجة" body="قراءة → تطبيع عربي → تقسيم (~٦٠٠ كلمة) → توليد متجهات → تخزين → جاهز للبحث." />
              <MiniCard title="إعادة المعالجة" body="استبدال أو حذف أي وثيقة، أو تشغيل backfill-embeddings لإكمال المتجهات الناقصة." />
              <MiniCard title="تصدير سجلات الدردشة" body="تصدير المحادثات والتقييمات بصيغ CSV / XLSX / PDF لأغراض المراجعة." />
              <MiniCard title="الأمان" body="رفع داخلي حصري عبر حساب المشرف — لا رفع سحابي مفتوح ولا روابط عامة." />
            </div>
            <Notice tone="info">
              ملفات الإعداد الحساسة (config.toml، .env، integrations/supabase/*) محميَّة ولا تُعدَّل من الواجهة.
            </Notice>
          </CardContent>
        </Card>

        {/* 6. عرض المصادر */}
        <Card id="sources" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={5} title="عرض المصادر" subtitle="شفافية كاملة في كل إجابة" Icon={Link2} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm md:text-base leading-relaxed">
              تُعرض المصادر أسفل كل إجابة بشكل منظَّم، ليتمكن الطالب من التحقق بنفسه قبل الاعتماد على المعلومة.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نوع المصدر</TableHead>
                  <TableHead className="text-right">طريقة العرض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">وثيقة Markdown</TableCell><TableCell>اسم الملف + رقم المقطع المرجعي.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">مصدر ويب</TableCell><TableCell>عنوان الصفحة + رابط مباشر للمصدر الأصلي.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">مشروع تخرج</TableCell><TableCell>عنوان المشروع + سنة التخرج إن وُجدت.</TableCell></TableRow>
              </TableBody>
            </Table>
            <ul className="space-y-2">
              <Bullet>إخفاء قسم المصادر تلقائياً عند عدم توفّرها.</Bullet>
              <Bullet>تقييم الإجابة (👍 / 👎) مع نموذج تفصيلي للسلبية يربطها بالمصادر للتدقيق لاحقاً.</Bullet>
              <Bullet>كل تقييم سلبي يصل لوحة "التقييمات" في لوحة المشرف لتحليله.</Bullet>
            </ul>
          </CardContent>
        </Card>

        {/* 7. لوحة المشرف */}
        <Card id="admin" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={6} title="لوحة المشرف" subtitle="تحكم كامل بالمحتوى والإعدادات" Icon={LayoutDashboard} />
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الصفحة</TableHead>
                  <TableHead className="text-right">المسار</TableHead>
                  <TableHead className="text-right">الوظيفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">الرئيسية</TableCell><TableCell><code>/admin</code></TableCell><TableCell>إحصاءات الاستخدام، عدد الأسئلة، معدّل الرضا (نسبة 👍).</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">قاعدة المعرفة</TableCell><TableCell><code>/admin/knowledge</code></TableCell><TableCell>رفع/حذف الوثائق، إضافة مصادر ويب، إعادة معالجة المتجهات.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الأسئلة الشائعة</TableCell><TableCell><code>/admin/faq</code></TableCell><TableCell>إدارة قائمة الأسئلة الجاهزة التي تظهر للطلاب.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الطلاب</TableCell><TableCell><code>/admin/students</code></TableCell><TableCell>إنشاء/تعديل/حذف حسابات الطلاب وكلمات السر.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">التقييمات</TableCell><TableCell><code>/admin/feedback</code></TableCell><TableCell>تحليل التقييمات السلبية مع المصادر المرتبطة.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الإعدادات</TableCell><TableCell><code>/admin/settings</code></TableCell><TableCell>تخصيص تعليمات النظام، عتبات الثقة، حدود الكاش، نموذج Gemini.</TableCell></TableRow>
              </TableBody>
            </Table>
            <Notice tone="info">
              تتيح صفحة الإعدادات حقن <strong>تعليمات نظام مخصّصة (System Instructions)</strong> لتشكيل سلوك المساعد دون تعديل الكود.
            </Notice>
          </CardContent>
        </Card>

        {/* 8. تسجيل الدخول والصلاحيات */}
        <Card id="auth" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={7} title="تسجيل الدخول والصلاحيات" subtitle="مساران واضحان: طالب ومشرف" Icon={KeyRound} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="الطالب" body="رقم جامعي + كلمة سر مشفّرة (bcrypt). يصل للمحادثة وحفظ السجل فقط." />
              <MiniCard title="المشرف" body="مستخدم Seed برقم 20260000 يُنشأ في جدول user_roles بدور admin. لا فحص مرمَّز في الكود." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">طالب</TableHead>
                  <TableHead className="text-right">مشرف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>المحادثة مع المساعد</TableCell><TableCell>✅</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>تقييم الإجابات</TableCell><TableCell>✅</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>عرض سجل المحادثات الشخصية</TableCell><TableCell>✅</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>إدارة قاعدة المعرفة</TableCell><TableCell>❌</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>إدارة حسابات الطلاب</TableCell><TableCell>❌</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>تعديل إعدادات المساعد</TableCell><TableCell>❌</TableCell><TableCell>✅</TableCell></TableRow>
                <TableRow><TableCell>مراجعة التقييمات السلبية</TableCell><TableCell>❌</TableCell><TableCell>✅</TableCell></TableRow>
              </TableBody>
            </Table>
            <Notice tone="warn">
              لا يوجد وصول للأكاديميين أو الموظفين. ترقية أي مستخدم لاحقاً تتم عبر <code>migration</code> على جدول <code>user_roles</code> فقط، وليس من واجهة الإدارة.
            </Notice>
          </CardContent>
        </Card>

        {/* 9. الأمان والخصوصية */}
        <Card id="security" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={8} title="الأمان والخصوصية" subtitle="حماية البيانات والمفاتيح والاستعلامات" Icon={ShieldCheck} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <Bullet>سياسات RLS مُفعَّلة على جميع الجداول الحساسة (الطلاب، السجلات، التقييمات).</Bullet>
              <Bullet>المفاتيح السرية (Gemini API) تُقرأ داخل Edge Functions فقط، ولا تظهر في الواجهة أبداً.</Bullet>
              <Bullet>تشفير كلمات سر الطلاب بـ <code>bcrypt</code> (cost factor <code>10</code>). تتم المقارنة داخل Edge Function الخاصة بالدخول، ولا تُرسَل التجزئة للواجهة مطلقاً.</Bullet>
              <Bullet>إنشاء/إلغاء صلاحية المشرف يتم عبر <code>migration</code> فقط على جدول <code>user_roles</code>، لا من الواجهة.</Bullet>
              <Bullet>الاستعلامات تمرّ عبر طبقة خدمات رقيقة (<code>lib/</code>) — لا استدعاءات DB مباشرة من المكوّنات.</Bullet>
              <Bullet>Rate Limiting افتراضي مستهدف على دالة <code>chat</code>: <code>30 طلباً/دقيقة لكل حساب</code>.</Bullet>
              <Bullet>فحص دفاعي: تُرفض المتجهات إن لم تكن بطول <code>768</code> بُعداً، تجنّباً لتلوّث الفهرس.</Bullet>
              <Bullet icon="⚠️">لا تخزَّن أي معلومات شخصية حساسة خارج النطاق الضروري للخدمة.</Bullet>
            </ul>
            <Notice tone="info">
              المراجعة الدورية لقاعدة البيانات والصلاحيات جزء من قواعد <code>/docs/AI_WORKFLOW_RULES.md</code>.
            </Notice>
          </CardContent>
        </Card>

        {/* 10. الأداء والتوسّع */}
        <Card id="performance" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={9} title="الأداء والتوسّع" subtitle="استجابة سريعة وكلفة منخفضة" Icon={Gauge} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="كاش هاش" body="حفظ الإجابات للأسئلة المتطابقة لمدة ٢٤ ساعة (TTL قابل للتعديل)." />
              <MiniCard title="كاش دلالي" body="مطابقة الأسئلة المتشابهة بالمتجهات لتفادي إعادة التوليد المكلف." />
              <MiniCard title="فحوصات متوازية" body="استدعاءات Promise.all مع مهل (Timeouts) صارمة لتفادي التعليق." />
              <MiniCard title="بث الإجابة" body="Server-Sent Events لتجربة فورية بدون انتظار اكتمال الإجابة." />
              <MiniCard title="تجزئة الحزم" body="manualChunks في Vite لفصل المكتبات عن كود التطبيق وتسريع التحميل." />
              <MiniCard title="استضافة عالمية" body="نشر ثابت على Cloudflare Pages مع SPA Routing عبر _redirects." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المقياس (SLO)</TableHead>
                  <TableHead className="text-right">الهدف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">زمن الإجابة من الكاش (p50)</TableCell><TableCell><code>≤ 1.2s</code></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">زمن إجابة RAG كامل (p95)</TableCell><TableCell><code>≤ 6s</code></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">ميزانية الطلب القصوى</TableCell><TableCell><code>30s</code> (تنتهي بإجابة جزئية أو اعتذار)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">مهلة generate-embedding</TableCell><TableCell><code>4s</code></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">مهلة rewrite-query</TableCell><TableCell><code>3s</code></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">مهلة Gemini generation</TableCell><TableCell><code>25s</code></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">دقة الإجابات على golden_eval</TableCell><TableCell><code>≥ 85%</code> (تشابه دلالي ≥ 0.85)</TableCell></TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Edge Function</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">chat</TableCell><TableCell>قلب RAG: استرجاع، تصنيف، توليد، بث، وتسجيل.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">rewrite-query</TableCell><TableCell>إعادة صياغة سؤال الطالب لتحسين دقة البحث.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">generate-embedding</TableCell><TableCell>توليد متجه دلالي لاستعلام أو مقطع.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">process-document</TableCell><TableCell>تقسيم وثيقة Markdown وتوليد متجهاتها.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">crawl-website</TableCell><TableCell>زحف صفحات ويب واستخراج نصها لقاعدة المعرفة.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">backfill-embeddings</TableCell><TableCell>توليد المتجهات الناقصة لمقاطع موجودة سابقاً.</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 11. حدود النظام */}
        <Card id="limits" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={10} title="حدود النظام" subtitle="ما لا يفعله المساعد عن قصد" Icon={AlertTriangle} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <Bullet icon="⚠️">لا يجيب من معرفة النموذج العامة عند غياب مصدر داخلي.</Bullet>
              <Bullet icon="⚠️">لا يقدّم استشارات قانونية أو طبية أو مالية.</Bullet>
              <Bullet icon="⚠️">لا يصدر قرارات قبول أو تخرّج أو شهادات رسمية — وظيفته إعلامية بحتة.</Bullet>
              <Bullet icon="⚠️">قد تتأخر الإجابات عن المستجدات حتى يحدّث المشرف الوثائق المرجعية.</Bullet>
              <Bullet icon="⚠️">لا يخدم طلاباً من خارج قاعدة الحسابات المسجَّلة في النظام.</Bullet>
              <Bullet icon="⚠️">لا يدعم رفع الصور أو الصوت — تجربة نصية بحتة عمداً.</Bullet>
            </ul>
            <Notice tone="warn">
              عند عدم توفّر معلومة موثّقة، سيعتذر المساعد ويُحيل الطالب للجهة المختصة بدلاً من التخمين.
            </Notice>
          </CardContent>
        </Card>

        {/* 12. ملاحظات المطورين */}
        <Card id="developers" className={cardElevated}>
          <CardHeader>
            <SectionHeader index={11} title="ملاحظات المطورين" subtitle="بنية وأدوات وقواعد عمل" Icon={Wrench} />
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المكوّن</TableHead>
                  <TableHead className="text-right">التقنية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">الواجهة</TableCell><TableCell>React 18 + Vite + TypeScript + Tailwind</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">المكوّنات</TableCell><TableCell>shadcn/ui + Tajawal + Glassmorphism</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الخادم</TableCell><TableCell>Supabase (DB + Auth + Edge Functions)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الذكاء الاصطناعي</TableCell><TableCell>Gemini مباشرة (gemini-3-flash-preview + gemini-embedding-001)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">البحث</TableCell><TableCell>pgvector + Arabic FTS (Hybrid 0.4 / 0.6)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">إدارة الحالة</TableCell><TableCell>React Query (5.62) + Context للثيم</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">النشر</TableCell><TableCell>Cloudflare Pages (Static + SPA via _redirects)</TableCell></TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المسار</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium"><code>/</code></TableCell><TableCell>الصفحة التعريفية / إعادة توجيه للدخول.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium"><code>/login</code></TableCell><TableCell>دخول مزدوج (طالب/مشرف) مع Split-screen على الديسكتوب.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium"><code>/chat</code></TableCell><TableCell>واجهة المحادثة الرئيسية للطلاب.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium"><code>/admin/*</code></TableCell><TableCell>لوحة المشرف وصفحاتها الفرعية.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium"><code>/docs</code></TableCell><TableCell>هذه الصفحة (مرادف <code>/documentation</code>).</TableCell></TableRow>
              </TableBody>
            </Table>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="docs/PROJECT_STRUCTURE.md" body="تنظيم المجلدات وفصل المسؤوليات (UI / Services / Edge)." />
              <MiniCard title="docs/CODING_CONVENTIONS.md" body="قواعد التسمية، التعديل أولاً، منع تكرار الملفات." />
              <MiniCard title="docs/DECISIONS.md" body="القرارات المعمارية الكبرى ومبرراتها." />
              <MiniCard title="docs/AI_WORKFLOW_RULES.md" body="قواعد عمل وكيل الذكاء الاصطناعي ضمن المشروع." />
            </div>
            <Notice tone="success">
              <CheckCircle2 className="inline w-4 h-4 ml-1" />
              راجع ملفات <code>/docs</code> داخل المستودع للقواعد المعمارية الكاملة قبل أي تعديل جوهري.
            </Notice>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/chat">
                <Button size="sm" variant="default">العودة للمحادثة</Button>
              </Link>
              <Link to="/">
                <Button size="sm" variant="outline">الصفحة الرئيسية</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-6">
          Smart University Assistant — وثيقة الإصدار ١٫٠
        </footer>
      </main>
    </div>
  );
};

export default Documentation;
