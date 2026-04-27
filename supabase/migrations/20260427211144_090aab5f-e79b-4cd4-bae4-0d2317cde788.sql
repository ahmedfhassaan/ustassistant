CREATE OR REPLACE FUNCTION public.search_knowledge_hybrid(
  query_text text,
  query_embedding text DEFAULT NULL::text,
  max_results integer DEFAULT 5,
  weight_text double precision DEFAULT 0.4,
  weight_semantic double precision DEFAULT 0.6
)
 RETURNS TABLE(chunk_id uuid, document_name text, content text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  words text[];
  word_pattern text := '';
  w text;
  emb_vector extensions.vector(768);
  wt double precision;
  ws double precision;
BEGIN
  -- Normalize weights
  wt := GREATEST(0, LEAST(1, COALESCE(weight_text, 0.4)));
  ws := GREATEST(0, LEAST(1, COALESCE(weight_semantic, 0.6)));
  IF (wt + ws) = 0 THEN
    wt := 0.4; ws := 0.6;
  END IF;

  words := regexp_split_to_array(trim(query_text), '\s+');
  FOREACH w IN ARRAY words LOOP
    IF length(w) >= 2 THEN
      IF word_pattern != '' THEN
        word_pattern := word_pattern || '|';
      END IF;
      word_pattern := word_pattern || w;
    END IF;
  END LOOP;

  IF query_embedding IS NOT NULL AND query_embedding != '' THEN
    emb_vector := query_embedding::extensions.vector(768);
  END IF;

  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kd.name AS document_name,
    kc.content,
    (
      CASE 
        WHEN emb_vector IS NOT NULL THEN
          wt * GREATEST(
            ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
            ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text)),
            CASE WHEN word_pattern != '' AND kc.content ~* word_pattern THEN 0.1 ELSE 0.0 END
          )
          + ws * CASE 
            WHEN kc.embedding IS NOT NULL THEN 
              GREATEST(0, 1 - (kc.embedding <=> emb_vector))
            ELSE 0.0 
          END
        ELSE
          GREATEST(
            ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
            ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text)),
            CASE WHEN word_pattern != '' AND kc.content ~* word_pattern THEN 0.1 ELSE 0.0 END
          )
      END
    )::real AS rank
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.status = 'processed'
    AND (
      to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
      OR to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', query_text)
      OR (word_pattern != '' AND kc.content ~* word_pattern)
      OR (emb_vector IS NOT NULL AND kc.embedding IS NOT NULL AND (kc.embedding <=> emb_vector) < 0.8)
    )
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;