
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_source_url_unique
  ON public.knowledge_documents (source_url)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_documents_source_type_idx
  ON public.knowledge_documents (source_type);

INSERT INTO public.assistant_settings (key, value)
VALUES
  ('web_crawl_enabled', 'true'),
  ('web_crawl_root_url', 'https://www.ust.edu'),
  ('web_crawl_last_run_at', ''),
  ('web_crawl_last_status', '')
ON CONFLICT DO NOTHING;
