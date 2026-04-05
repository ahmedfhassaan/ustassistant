
-- Function to add a student
CREATE OR REPLACE FUNCTION public.admin_add_student(
  p_student_id text,
  p_name text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO public.students (student_id, name, password_hash)
  VALUES (p_student_id, p_name, extensions.crypt(p_password, extensions.gen_salt('bf')));
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'الرقم الجامعي مسجل مسبقاً');
END;
$$;

-- Function to update student name
CREATE OR REPLACE FUNCTION public.admin_update_student(
  p_id uuid,
  p_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.students SET name = p_name WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطالب غير موجود');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;

-- Function to reset student password
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_id uuid,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.students 
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطالب غير موجود');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;

-- Function to delete student
CREATE OR REPLACE FUNCTION public.admin_delete_student(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.students WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطالب غير موجود');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;

-- Function to list all students (without password_hash)
CREATE OR REPLACE FUNCTION public.admin_list_students()
RETURNS TABLE(id uuid, student_id text, name text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, student_id, name, created_at FROM public.students ORDER BY created_at DESC;
$$;
