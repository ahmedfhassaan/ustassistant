
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to knowledge_chunks
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS embedding extensions.vector(768);

-- Create index for fast vector search (need at least some rows first, so use IF NOT EXISTS pattern)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
  ON public.knowledge_chunks 
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Create hybrid search function
CREATE OR REPLACE FUNCTION public.search_knowledge_hybrid(
  query_text text,
  query_embedding extensions.vector(768),
  max_results integer DEFAULT 5
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
BEGIN
  words := regexp_split_to_array(trim(query_text), '\s+');
  FOREACH w IN ARRAY words LOOP
    IF length(w) >= 2 THEN
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
    (
      -- Hybrid score: 0.4 * keyword_rank + 0.6 * cosine_similarity
      0.4 * GREATEST(
        ts_rank(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', query_text)),
        ts_rank(to_tsvector('simple', kc.content), plainto_tsquery('simple', query_text)),
        CASE WHEN word_pattern != '' AND kc.content ~* word_pattern THEN 0.1 ELSE 0.0 END
      )
      +
      0.6 * CASE 
        WHEN kc.embedding IS NOT NULL THEN 
          GREATEST(0, 1 - (kc.embedding <=> query_embedding))
        ELSE 0.0 
      END
    )::real AS rank
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.status = 'processed'
    AND (
      to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', query_text)
      OR to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', query_text)
      OR (word_pattern != '' AND kc.content ~* word_pattern)
      OR (kc.embedding IS NOT NULL AND (kc.embedding <=> query_embedding) < 0.8)
    )
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;
