
CREATE OR REPLACE FUNCTION public.search_knowledge(query_text TEXT, max_results INTEGER DEFAULT 5)
RETURNS TABLE (
  chunk_id UUID,
  document_name TEXT,
  content TEXT,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    kc.id AS chunk_id,
    kd.name AS document_name,
    kc.content,
    ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)) AS rank
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.status = 'processed'
    AND (
      to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
      OR kc.content ILIKE '%' || query_text || '%'
    )
  ORDER BY rank DESC
  LIMIT max_results;
$$;
