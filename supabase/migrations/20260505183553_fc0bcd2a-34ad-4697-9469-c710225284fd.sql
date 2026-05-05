DROP FUNCTION IF EXISTS public.search_knowledge_hybrid(text, text, integer, double precision, double precision);
DROP FUNCTION IF EXISTS public.search_knowledge_hybrid(text, text, integer);

CREATE OR REPLACE FUNCTION public.search_knowledge_hybrid(
  query_text text,
  query_embedding text DEFAULT NULL::text,
  max_results integer DEFAULT 5,
  weight_text double precision DEFAULT 0.4,
  weight_semantic double precision DEFAULT 0.6
)
 RETURNS TABLE(chunk_id uuid, document_name text, category text, content text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  words text[];
  word_pattern text := '';
  meaningful_words int := 0;
  w text;
  emb_vector extensions.vector(768);
  wt double precision;
  ws double precision;
  stop_words text[] := ARRAY[
    'كيف','ماذا','متى','أين','اين','هل','ما','من','إلى','الى','على','في','عن',
    'مع','بعد','قبل','عند','يعني','هو','هي','انت','أنت','انا','أنا','نحن',
    'يحصل','يحدث','يكون','هذا','هذه','ذلك','تلك','كل','بعض','شو','وش','ايش',
    'لماذا','لما','يوجد','توجد','كم','اي','أي','او','أو','و','ف','لكن','ثم'
  ];
BEGIN
  wt := GREATEST(0, LEAST(1, COALESCE(weight_text, 0.4)));
  ws := GREATEST(0, LEAST(1, COALESCE(weight_semantic, 0.6)));
  IF (wt + ws) = 0 THEN
    wt := 0.4; ws := 0.6;
  END IF;

  words := regexp_split_to_array(trim(query_text), '\s+');
  FOREACH w IN ARRAY words LOOP
    IF length(w) >= 3 AND NOT (w = ANY(stop_words)) THEN
      IF word_pattern != '' THEN
        word_pattern := word_pattern || '|';
      END IF;
      word_pattern := word_pattern || w;
      meaningful_words := meaningful_words + 1;
    END IF;
  END LOOP;

  IF query_embedding IS NOT NULL AND query_embedding != '' THEN
    emb_vector := query_embedding::extensions.vector(768);
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      kc.id AS chunk_id,
      kd.name AS document_name,
      kd.category AS category,
      kc.content,
      GREATEST(
        ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
        ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text))
      ) AS fts_score,
      CASE
        WHEN meaningful_words > 0 AND word_pattern != '' THEN
          LEAST(1.0,
            (
              SELECT COUNT(DISTINCT lower(m[1]))::double precision
              FROM regexp_matches(kc.content, '(' || word_pattern || ')', 'gi') AS m
            ) / meaningful_words::double precision
          )
        ELSE 0.0
      END AS keyword_score,
      CASE
        WHEN emb_vector IS NOT NULL AND kc.embedding IS NOT NULL THEN
          GREATEST(0, 1 - (kc.embedding <=> emb_vector))
        ELSE 0.0
      END AS sem_score
    FROM public.knowledge_chunks kc
    JOIN public.knowledge_documents kd ON kd.id = kc.document_id
    WHERE kd.status = 'processed'
      AND (
        (word_pattern != '' AND kc.content ~* word_pattern)
        OR to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
        OR (emb_vector IS NOT NULL AND kc.embedding IS NOT NULL AND (kc.embedding <=> emb_vector) < 0.7)
      )
  )
  SELECT
    s.chunk_id,
    s.document_name,
    s.category,
    s.content,
    (
      CASE
        WHEN emb_vector IS NOT NULL THEN
          wt * GREATEST(s.fts_score, s.keyword_score) + ws * s.sem_score
        ELSE
          GREATEST(s.fts_score, s.keyword_score)
      END
    )::real AS rank
  FROM scored s
  WHERE (s.keyword_score > 0 OR s.fts_score > 0 OR s.sem_score > 0.5)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;