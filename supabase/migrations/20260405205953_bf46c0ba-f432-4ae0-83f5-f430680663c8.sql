
CREATE TABLE public.assistant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.assistant_settings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert settings" ON public.assistant_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.assistant_settings FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete settings" ON public.assistant_settings FOR DELETE TO public USING (true);

-- Insert default values
INSERT INTO public.assistant_settings (key, value) VALUES
  ('assistant_name', 'المساعد الجامعي الذكي'),
  ('welcome_message', 'كيف يمكنني مساعدتك اليوم؟'),
  ('tone', 'professional'),
  ('max_response_length', '1000'),
  ('show_sources', 'true'),
  ('fallback_message', 'عذراً، لم أجد معلومات مؤكدة حول هذا السؤال. يرجى التواصل مع الجهة المختصة في الجامعة.'),
  ('strict_sources', 'false'),
  ('cache_enabled', 'true'),
  ('cache_ttl_minutes', '1440'),
  ('auto_clear_cache', 'true'),
  ('admin_password', 'admin123'),
  ('max_messages_per_day', '100'),
  ('abuse_protection', 'true'),
  ('search_results_count', '5'),
  ('ai_model', 'google/gemini-3-flash-preview'),
  ('confidence_threshold', '30'),
  ('low_confidence_message', 'لا توجد معلومة مؤكدة حول هذا الموضوع. يرجى مراجعة الجهة المختصة.')
ON CONFLICT (key) DO NOTHING;
