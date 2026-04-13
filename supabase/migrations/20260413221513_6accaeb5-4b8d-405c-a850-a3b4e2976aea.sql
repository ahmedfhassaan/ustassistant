-- Drop the old vector-parameter overload that conflicts with the text-parameter version
DROP FUNCTION IF EXISTS public.search_knowledge_hybrid(text, extensions.vector, integer);

-- Also clear old cached responses that have wrong fallback answers
DELETE FROM public.response_cache;