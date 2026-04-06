ALTER TABLE public.message_feedback
  ADD COLUMN reason text,
  ADD COLUMN reason_other text,
  ADD COLUMN notes text,
  ADD COLUMN question_content text,
  ADD COLUMN sources text;