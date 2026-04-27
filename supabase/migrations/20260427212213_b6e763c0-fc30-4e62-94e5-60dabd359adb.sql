UPDATE public.assistant_settings SET value = '35', updated_at = now() WHERE key = 'confidence_threshold';
DELETE FROM public.response_cache;