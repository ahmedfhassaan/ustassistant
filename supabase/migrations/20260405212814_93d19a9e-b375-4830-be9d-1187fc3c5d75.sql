
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- No direct read policy - access only through verify function

-- Create verify function
CREATE OR REPLACE FUNCTION public.verify_student_login(p_student_id text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
BEGIN
  SELECT id, student_id, name INTO student_record
  FROM public.students
  WHERE students.student_id = p_student_id
    AND students.password_hash = crypt(p_password, students.password_hash);
  
  IF student_record IS NULL THEN
    RETURN json_build_object('success', false);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'id', student_record.id,
    'student_id', student_record.student_id,
    'name', student_record.name
  );
END;
$$;

-- Insert 3 student accounts with hashed passwords
INSERT INTO public.students (student_id, name, password_hash) VALUES
  ('20230001', 'أحمد علي صالح', crypt('Stu@123', gen_salt('bf'))),
  ('20230002', 'محمد حسن عبدالله', crypt('Uni@456', gen_salt('bf'))),
  ('20230003', 'فاطمة سعيد محمد', crypt('Std@789', gen_salt('bf')));
