
-- Create conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  source text,
  question text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations (public access, filtering by user_id in code)
CREATE POLICY "Anyone can read conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conversations" ON public.conversations FOR DELETE USING (true);

-- RLS policies for conversation_messages
CREATE POLICY "Anyone can read messages" ON public.conversation_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON public.conversation_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete messages" ON public.conversation_messages FOR DELETE USING (true);
