
-- Create feedback table
CREATE TABLE public.message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  message_content text NOT NULL,
  is_helpful boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON public.message_feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read feedback" ON public.message_feedback FOR SELECT TO public USING (true);

-- Update dashboard stats to include feedback data
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'total_questions', (SELECT COUNT(*) FROM public.chat_logs),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM public.chat_logs WHERE user_id IS NOT NULL),
    'total_documents', (SELECT COUNT(*) FROM public.knowledge_documents WHERE status = 'processed'),
    'cached_responses', (SELECT COUNT(*) FROM public.chat_logs WHERE cached = true),
    'total_responses', (SELECT COUNT(*) FROM public.chat_logs),
    'today_questions', (SELECT COUNT(*) FROM public.chat_logs WHERE created_at > now() - interval '24 hours'),
    'total_feedback', (SELECT COUNT(*) FROM public.message_feedback),
    'positive_feedback', (SELECT COUNT(*) FROM public.message_feedback WHERE is_helpful = true)
  );
$function$;
