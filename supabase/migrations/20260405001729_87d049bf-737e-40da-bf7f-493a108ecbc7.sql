CREATE OR REPLACE FUNCTION public.search_knowledge(query_text text, max_results integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_name text, content text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  words text[];
  word_pattern text := '';
  w text;
BEGIN
  -- Build ILIKE pattern from individual words (3+ chars)
  words := regexp_split_to_array(trim(query_text), '\s+');
  FOREACH w IN ARRAY words LOOP
    IF length(w) >= 3 THEN
      IF word_pattern != '' THEN
        word_pattern := word_pattern || '|';
      END IF;
      word_pattern := word_pattern || w;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kd.name AS document_name,
    kc.content,
    GREATEST(
      ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
      ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text)),
      CASE WHEN word_pattern != '' AND kc.content ~* word_pattern THEN 0.05 ELSE 0.0 END
    )::real AS rank
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.status = 'processed'
    AND (
      to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
      OR to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', query_text)
      OR (word_pattern != '' AND kc.content ~* word_pattern)
    )
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$;