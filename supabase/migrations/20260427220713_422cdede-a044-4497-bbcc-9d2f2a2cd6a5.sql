
-- =========== Phase C: Semantic Cache ===========
ALTER TABLE public.response_cache 
  ADD COLUMN IF NOT EXISTS question_embedding extensions.vector(768);

CREATE INDEX IF NOT EXISTS response_cache_embedding_idx 
  ON public.response_cache 
  USING ivfflat (question_embedding extensions.vector_cosine_ops) 
  WITH (lists = 100);

-- Function to find semantically similar cached answer
CREATE OR REPLACE FUNCTION public.find_cached_answer_semantic(
  query_embedding text,
  similarity_threshold double precision DEFAULT 0.92
)
RETURNS TABLE(
  id uuid,
  question text,
  answer text,
  sources text,
  similarity double precision
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emb_vector extensions.vector(768);
BEGIN
  IF query_embedding IS NULL OR query_embedding = '' THEN
    RETURN;
  END IF;
  
  emb_vector := query_embedding::extensions.vector(768);
  
  RETURN QUERY
  SELECT 
    rc.id,
    rc.question,
    rc.answer,
    rc.sources,
    (1 - (rc.question_embedding <=> emb_vector))::double precision AS similarity
  FROM public.response_cache rc
  WHERE rc.question_embedding IS NOT NULL
    AND rc.expires_at > now()
    AND (1 - (rc.question_embedding <=> emb_vector)) >= similarity_threshold
  ORDER BY rc.question_embedding <=> emb_vector ASC
  LIMIT 1;
END;
$$;

-- Default semantic cache threshold setting
INSERT INTO public.assistant_settings (key, value)
VALUES ('semantic_cache_threshold', '0.92')
ON CONFLICT (key) DO NOTHING;

-- =========== Phase D: Golden Dataset & Evaluation ===========
CREATE TABLE IF NOT EXISTS public.golden_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  expected_keywords text[] NOT NULL DEFAULT '{}',
  expected_sources text[] NOT NULL DEFAULT '{}',
  category text DEFAULT 'عام',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.golden_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read golden_questions" ON public.golden_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert golden_questions" ON public.golden_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update golden_questions" ON public.golden_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete golden_questions" ON public.golden_questions FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.evaluation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.golden_questions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  generated_answer text,
  generated_sources text,
  latency_ms integer,
  confidence double precision,
  keyword_match_score double precision,
  source_match_score double precision,
  passed boolean DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluation_runs_run_id_idx ON public.evaluation_runs(run_id, created_at DESC);

ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read evaluation_runs" ON public.evaluation_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluation_runs" ON public.evaluation_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete evaluation_runs" ON public.evaluation_runs FOR DELETE USING (true);

-- Advanced metrics function
CREATE OR REPLACE FUNCTION public.get_advanced_metrics()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent AS (
    SELECT * FROM public.chat_logs WHERE created_at > now() - interval '24 hours'
  ),
  fb AS (
    SELECT * FROM public.message_feedback WHERE created_at > now() - interval '7 days'
  )
  SELECT json_build_object(
    'requests_24h', (SELECT COUNT(*) FROM recent),
    'cache_hits_24h', (SELECT COUNT(*) FROM recent WHERE cached = true),
    'cache_hit_rate', CASE 
      WHEN (SELECT COUNT(*) FROM recent) = 0 THEN 0
      ELSE ROUND(((SELECT COUNT(*) FROM recent WHERE cached = true)::numeric / (SELECT COUNT(*) FROM recent)::numeric * 100), 1)
    END,
    'fallback_count_24h', (SELECT COUNT(*) FROM recent WHERE sources IS NULL OR sources = ''),
    'fallback_rate', CASE 
      WHEN (SELECT COUNT(*) FROM recent) = 0 THEN 0
      ELSE ROUND(((SELECT COUNT(*) FROM recent WHERE sources IS NULL OR sources = '')::numeric / (SELECT COUNT(*) FROM recent)::numeric * 100), 1)
    END,
    'cached_responses_total', (SELECT COUNT(*) FROM public.response_cache WHERE expires_at > now()),
    'cached_with_embedding', (SELECT COUNT(*) FROM public.response_cache WHERE expires_at > now() AND question_embedding IS NOT NULL),
    'feedback_helpful_7d', (SELECT COUNT(*) FROM fb WHERE is_helpful = true),
    'feedback_unhelpful_7d', (SELECT COUNT(*) FROM fb WHERE is_helpful = false),
    'avg_chunks_per_doc', (
      SELECT ROUND(AVG(c)::numeric, 1) FROM (
        SELECT COUNT(kc.id) AS c FROM public.knowledge_documents kd 
        LEFT JOIN public.knowledge_chunks kc ON kc.document_id = kd.id 
        WHERE kd.status = 'processed' GROUP BY kd.id
      ) t
    ),
    'total_chunks', (SELECT COUNT(*) FROM public.knowledge_chunks),
    'chunks_with_embedding', (SELECT COUNT(*) FROM public.knowledge_chunks WHERE embedding IS NOT NULL)
  );
$$;
