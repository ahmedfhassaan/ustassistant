
DROP FUNCTION IF EXISTS public.get_question_stats(integer);

CREATE OR REPLACE FUNCTION public.get_question_stats(limit_count integer DEFAULT 20)
 RETURNS TABLE(question text, question_hash text, count bigint, last_asked timestamp with time zone, category text, answered boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    question,
    question_hash,
    COUNT(*) as count,
    MAX(created_at) as last_asked,
    MAX(category) as category,
    bool_or(sources IS NOT NULL AND sources != '') as answered
  FROM public.chat_logs
  GROUP BY question, question_hash
  ORDER BY count DESC
  LIMIT limit_count;
$function$;
