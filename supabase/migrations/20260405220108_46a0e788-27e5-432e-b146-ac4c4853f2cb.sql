
DROP FUNCTION IF EXISTS public.admin_list_students();

CREATE OR REPLACE FUNCTION public.admin_list_students()
 RETURNS TABLE(id uuid, student_id text, name text, created_at timestamp with time zone, plain_password text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, student_id, name, created_at, plain_password FROM public.students ORDER BY created_at DESC;
$function$;
