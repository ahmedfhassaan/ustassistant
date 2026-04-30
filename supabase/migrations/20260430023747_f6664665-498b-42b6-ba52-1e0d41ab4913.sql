-- 1. حذف الإجابة الخاطئة الحالية وأي إجابات فاسدة مشابهة
DELETE FROM public.response_cache WHERE question_hash = 'q_9ocgle';

DELETE FROM public.response_cache 
WHERE question ILIKE '%تأجيل%امتحان%' 
  AND answer NOT ILIKE '%تأجيل%';

-- 2. دالة إبطال الكاش عند feedback سلبي
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_negative_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_helpful = false AND NEW.question_content IS NOT NULL AND length(trim(NEW.question_content)) > 0 THEN
    DELETE FROM public.response_cache 
    WHERE question = NEW.question_content
       OR (length(NEW.question_content) >= 15 
           AND question ILIKE '%' || substring(trim(NEW.question_content) from 1 for 30) || '%');
  END IF;
  RETURN NEW;
END;
$$;

-- 3. إنشاء الـ trigger
DROP TRIGGER IF EXISTS trg_invalidate_cache_on_feedback ON public.message_feedback;
CREATE TRIGGER trg_invalidate_cache_on_feedback
AFTER INSERT ON public.message_feedback
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_negative_feedback();

-- 4. تقصير مدة الكاش الافتراضية إلى 4 ساعات
UPDATE public.assistant_settings 
SET value = '240', updated_at = now()
WHERE key = 'cache_ttl_minutes';

-- إن لم يكن السجل موجوداً، أنشئه
INSERT INTO public.assistant_settings (key, value)
SELECT 'cache_ttl_minutes', '240'
WHERE NOT EXISTS (SELECT 1 FROM public.assistant_settings WHERE key = 'cache_ttl_minutes');