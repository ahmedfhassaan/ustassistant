
-- Drop and recreate the function with correct schema reference
CREATE OR REPLACE FUNCTION public.verify_student_login(p_student_id text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  student_record RECORD;
BEGIN
  SELECT id, student_id, name INTO student_record
  FROM public.students
  WHERE students.student_id = p_student_id
    AND students.password_hash = extensions.crypt(p_password, students.password_hash);
  
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

-- Re-insert students with correct crypt path
DELETE FROM public.students;
INSERT INTO public.students (student_id, name, password_hash) VALUES
  ('20230001', 'أحمد علي صالح', extensions.crypt('Stu@123', extensions.gen_salt('bf'))),
  ('20230002', 'محمد حسن عبدالله', extensions.crypt('Uni@456', extensions.gen_salt('bf'))),
  ('20230003', 'فاطمة سعيد محمد', extensions.crypt('Std@789', extensions.gen_salt('bf')));
