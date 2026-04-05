
-- Create chat_logs table for tracking questions and analytics
CREATE TABLE public.chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  question TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  sources TEXT,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_chat_logs_question_hash ON public.chat_logs(question_hash);
CREATE INDEX idx_chat_logs_created_at ON public.chat_logs(created_at DESC);

-- Allow edge functions (service role) full access, no RLS needed for server-only table
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to get question statistics
CREATE OR REPLACE FUNCTION public.get_question_stats(limit_count INT DEFAULT 20)
RETURNS TABLE(question TEXT, question_hash TEXT, count BIGINT, last_asked TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    question,
    question_hash,
    COUNT(*) as count,
    MAX(created_at) as last_asked
  FROM public.chat_logs
  GROUP BY question, question_hash
  ORDER BY count DESC
  LIMIT limit_count;
$$;

-- Create a function to get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_questions', (SELECT COUNT(*) FROM public.chat_logs),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM public.chat_logs WHERE user_id IS NOT NULL),
    'total_documents', (SELECT COUNT(*) FROM public.knowledge_documents WHERE status = 'processed'),
    'cached_responses', (SELECT COUNT(*) FROM public.chat_logs WHERE cached = true),
    'total_responses', (SELECT COUNT(*) FROM public.chat_logs),
    'today_questions', (SELECT COUNT(*) FROM public.chat_logs WHERE created_at > now() - interval '24 hours')
  );
$$;
