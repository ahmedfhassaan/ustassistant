import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  "الإجابة غير صحيحة",
  "غير واضحة",
  "ناقصة",
  "لا يوجد مصدر",
  "سبب آخر",
] as const;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  questionContent?: string;
  sources?: string;
  onSubmitted: () => void;
}

const FeedbackDialog = ({
  open,
  onOpenChange,
  messageContent,
  questionContent,
  sources,
  onSubmitted,
}: FeedbackDialogProps) => {
  const [reason, setReason] = useState<string>("");
  const [reasonOther, setReasonOther] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "تنبيه", description: "يرجى اختيار سبب", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const student = JSON.parse(localStorage.getItem("student") || "null");
      const { error } = await supabase.from("message_feedback" as any).insert({
        user_id: student?.id || null,
        message_content: messageContent.slice(0, 500),
        is_helpful: false,
        reason,
        reason_other: reason === "سبب آخر" ? reasonOther || null : null,
        notes: notes || null,
        question_content: questionContent?.slice(0, 500) || null,
        sources: sources || null,
      } as any);
      if (error) throw error;
      toast({ title: "شكراً", description: "تم إرسال تقييمك بنجاح" });
      onSubmitted();
      onOpenChange(false);
      setReason("");
      setReasonOther("");
      setNotes("");
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال التقييم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">ما سبب عدم رضاك عن الإجابة؟</DialogTitle>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2" dir="rtl">
          {REASONS.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={r} />
              <Label htmlFor={r} className="cursor-pointer text-sm">{r}</Label>
            </div>
          ))}
        </RadioGroup>

        {reason === "سبب آخر" && (
          <Textarea
            placeholder="اكتب السبب..."
            value={reasonOther}
            onChange={(e) => setReasonOther(e.target.value)}
            className="min-h-[60px] text-right"
            dir="rtl"
          />
        )}

        <Textarea
          placeholder="ملاحظات إضافية (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px] text-right"
          dir="rtl"
        />

        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            إرسال
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} size="sm">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
