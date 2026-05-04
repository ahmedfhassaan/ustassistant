INSERT INTO public.assistant_settings (key, value)
VALUES ('enable_query_rewriting', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now();