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
    <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
        <span className="text-primary">{AR_NUMS[index]}.</span>
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
      ? "bg-destructive/10 border-destructive/30 text-foreground"
      : tone === "success"
      ? "bg-primary/10 border-primary/30 text-foreground"
      : "bg-muted border-border text-foreground";
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
  <div className="rounded-xl border border-border bg-card/50 p-4">
    <h4 className="font-semibold text-sm text-foreground mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
  </div>
);

const Documentation = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

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
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-6 md:p-10">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
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
            <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">فهرس المحتويات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2 hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm"
                >
                  <span className="h-7 w-7 rounded-md bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">
                    {AR_NUMS[i]}
                  </span>
                  <span className="font-medium">{s.title}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 1. نظرة عامة */}
        <Card id="overview">
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
        <Card id="chat">
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
        <Card id="rag">
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
                  <TableCell>فحص الأسئلة المتطابقة حرفياً وإرجاع إجابة مخزّنة خلال ٢٤ ساعة.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٢. كاش دلالي</TableCell>
                  <TableCell>مطابقة الأسئلة المتشابهة معنىً عبر متجهات (Vector Similarity).</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٣. إعادة صياغة الاستعلام</TableCell>
                  <TableCell>تحسين السؤال (rewrite-query) لزيادة دقة الاسترجاع العربي.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٤. البحث الهجين</TableCell>
                  <TableCell>مزج FTS العربي (وزن ٠٫٤) مع البحث الدلالي (وزن ٠٫٦) عبر pgvector.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٥. تصنيف النية</TableCell>
                  <TableCell>تحديد نوع السؤال (قبول/تسجيل/مقررات/مشاريع/عام) لتوجيه التصفية.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٦. عتبة الثقة</TableCell>
                  <TableCell>منع الإجابة عند ضعف المصادر وعرض اعتذار بدلاً من التخمين.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">٧. التوليد المقيَّد</TableCell>
                  <TableCell>صياغة الإجابة من المقاطع المسترجعة فقط بتعليمات صارمة للنموذج.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniCard title="حجم المقطع" body="≈ ٦٠٠ كلمة لكل Chunk لتحسين دقة الاسترجاع وتقليل الضجيج." />
              <MiniCard title="أبعاد المتجه" body="٧٦٨ بُعداً عبر نموذج gemini-embedding-001." />
              <MiniCard title="عمر الكاش" body="٢٤ ساعة افتراضياً، قابل للتعديل من إعدادات المشرف." />
            </div>
            <Notice tone="success">
              عتبة الثقة (Confidence Threshold) قابلة للضبط من لوحة المشرف لتحقيق التوازن بين الدقة والتغطية.
            </Notice>
          </CardContent>
        </Card>

        {/* 4. قاعدة المعرفة */}
        <Card id="knowledge">
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
        <Card id="uploads">
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
        <Card id="sources">
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
        <Card id="admin">
          <CardHeader>
            <SectionHeader index={6} title="لوحة المشرف" subtitle="تحكم كامل بالمحتوى والإعدادات" Icon={LayoutDashboard} />
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الصفحة</TableHead>
                  <TableHead className="text-right">الوظيفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">الرئيسية</TableCell><TableCell>إحصاءات الاستخدام ومعدّل الرضا.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">قاعدة المعرفة</TableCell><TableCell>إضافة/حذف/تحديث الوثائق وإعادة المعالجة.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الطلاب</TableCell><TableCell>إدارة حسابات الطلاب (CRUD).</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">التقييمات</TableCell><TableCell>مراجعة الردود السلبية لتحسين الأداء.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">الإعدادات</TableCell><TableCell>تخصيص سلوك المساعد، الحدود، والتعليمات.</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 8. تسجيل الدخول والصلاحيات */}
        <Card id="auth">
          <CardHeader>
            <SectionHeader index={7} title="تسجيل الدخول والصلاحيات" subtitle="مساران واضحان: طالب ومشرف" Icon={KeyRound} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="الطالب" body="رقم جامعي + كلمة سر مشفّرة (bcrypt). يصل للمحادثة فقط." />
              <MiniCard title="المشرف" body="رقم خاص (20260000) مع صلاحية كاملة على لوحة التحكم." />
            </div>
            <Notice tone="warn">
              لا يوجد وصول للأكاديميين/الموظفين. التصميم متعمَّد لتقليل الأدوار وتبسيط الصلاحيات.
            </Notice>
          </CardContent>
        </Card>

        {/* 9. الأمان والخصوصية */}
        <Card id="security">
          <CardHeader>
            <SectionHeader index={8} title="الأمان والخصوصية" subtitle="حماية البيانات والمفاتيح والاستعلامات" Icon={ShieldCheck} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <Bullet>سياسات RLS مُفعَّلة على جميع الجداول الحساسة.</Bullet>
              <Bullet>المفاتيح السرية تُقرأ داخل Edge Functions فقط، ولا تظهر في الواجهة.</Bullet>
              <Bullet>تشفير كلمات السر بـ bcrypt ولا تُخزَّن نصاً صريحاً.</Bullet>
              <Bullet>الاستعلامات تمرّ عبر طبقة خدمات رقيقة، لا استدعاءات DB من المكوّنات.</Bullet>
              <Bullet icon="⚠️">عدم تخزين أي معلومات شخصية حساسة خارج النطاق الضروري.</Bullet>
            </ul>
          </CardContent>
        </Card>

        {/* 10. الأداء والتوسّع */}
        <Card id="performance">
          <CardHeader>
            <SectionHeader index={9} title="الأداء والتوسّع" subtitle="استجابة سريعة وكلفة منخفضة" Icon={Gauge} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard title="كاش هاش" body="حفظ الإجابات للأسئلة المتطابقة لمدة ٢٤ ساعة." />
              <MiniCard title="كاش دلالي" body="مطابقة الأسئلة المتشابهة بالمتجهات لتفادي التكرار." />
              <MiniCard title="فحوصات متوازية" body="استدعاءات Promise.all مع مهل صارمة." />
              <MiniCard title="استضافة عالمية" body="نشر ثابت على Cloudflare Pages مع SPA Routing." />
            </div>
          </CardContent>
        </Card>

        {/* 11. حدود النظام */}
        <Card id="limits">
          <CardHeader>
            <SectionHeader index={10} title="حدود النظام" subtitle="ما لا يفعله المساعد عن قصد" Icon={AlertTriangle} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <Bullet icon="⚠️">لا يجيب من معرفة النموذج العامة عند غياب مصدر داخلي.</Bullet>
              <Bullet icon="⚠️">لا يقدّم استشارات قانونية أو طبية.</Bullet>
              <Bullet icon="⚠️">لا يصدر قرارات قبول أو تخرّج — وظيفته إعلامية بحتة.</Bullet>
              <Bullet icon="⚠️">قد تتأخر الإجابات عن المستجدات حتى يحدّث المشرف الوثائق.</Bullet>
            </ul>
            <Notice tone="warn">
              عند عدم توفّر معلومة موثّقة، سيعتذر المساعد ويُحيل الطالب للجهة المختصة بدلاً من التخمين.
            </Notice>
          </CardContent>
        </Card>

        {/* 12. ملاحظات المطورين */}
        <Card id="developers">
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
                <TableRow><TableCell className="font-medium">الذكاء الاصطناعي</TableCell><TableCell>Gemini مباشرة عبر Edge Functions</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">البحث</TableCell><TableCell>pgvector + Arabic FTS (Hybrid)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">النشر</TableCell><TableCell>Cloudflare Pages (Static + SPA)</TableCell></TableRow>
              </TableBody>
            </Table>
            <Notice tone="success">
              <CheckCircle2 className="inline w-4 h-4 ml-1" />
              راجع ملفات <code>/docs</code> داخل المستودع للقواعد المعمارية الكاملة.
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
