
-- Create knowledge_documents table
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL DEFAULT 'text',
  file_size BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_chunks table for text chunks
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for full-text search on chunks
CREATE INDEX idx_knowledge_chunks_content ON public.knowledge_chunks USING gin(to_tsvector('arabic', content));
CREATE INDEX idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Allow public read access (the chatbot needs to read knowledge)
CREATE POLICY "Anyone can read knowledge_documents" ON public.knowledge_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can read knowledge_chunks" ON public.knowledge_chunks FOR SELECT USING (true);

-- Allow insert/delete for now (no auth yet, admin will manage)
CREATE POLICY "Allow insert knowledge_documents" ON public.knowledge_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete knowledge_documents" ON public.knowledge_documents FOR DELETE USING (true);
CREATE POLICY "Allow update knowledge_documents" ON public.knowledge_documents FOR UPDATE USING (true);
CREATE POLICY "Allow insert knowledge_chunks" ON public.knowledge_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete knowledge_chunks" ON public.knowledge_chunks FOR DELETE USING (true);

-- Create storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge', 'knowledge', true);

-- Storage policies
CREATE POLICY "Anyone can upload to knowledge" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'knowledge');
CREATE POLICY "Anyone can read knowledge files" ON storage.objects FOR SELECT USING (bucket_id = 'knowledge');
CREATE POLICY "Anyone can delete knowledge files" ON storage.objects FOR DELETE USING (bucket_id = 'knowledge');
