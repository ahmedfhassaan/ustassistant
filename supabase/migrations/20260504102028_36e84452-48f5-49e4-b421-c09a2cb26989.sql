UPDATE public.assistant_settings SET value = '15' WHERE key = 'initial_results_count';
UPDATE public.assistant_settings SET value = '8'  WHERE key = 'final_results_count';
UPDATE public.assistant_settings SET value = '8'  WHERE key = 'search_results_count';
UPDATE public.assistant_settings SET value = '400' WHERE key = 'chunk_size';
UPDATE public.assistant_settings SET value = '80'  WHERE key = 'chunk_overlap';