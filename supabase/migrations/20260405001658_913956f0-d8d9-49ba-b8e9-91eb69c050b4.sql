CREATE OR REPLACE FUNCTION public.search_knowledge(query_text text, max_results integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_name text, content text, rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    kc.id AS chunk_id,
    kd.name AS document_name,
    kc.content,
    GREATEST(
      ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
      ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text))
    )::real AS rank
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.status = 'processed'
    AND (
      to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
      OR to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', query_text)
      OR kc.content ILIKE '%' || query_text || '%'
    )
  ORDER BY rank DESC
  LIMIT max_results;
$$;