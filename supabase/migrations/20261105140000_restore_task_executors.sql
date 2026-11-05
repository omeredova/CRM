BEGIN;

-- Restore the RPC missing from the remote schema without rewriting migration history.
CREATE OR REPLACE FUNCTION public.list_task_executors()
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT crm_private.is_manager() THEN
    RAISE EXCEPTION 'Список исполнителей доступен только постановщику'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, coalesce(u.email::text, '')
    FROM public.profiles AS p
    JOIN auth.users AS u ON u.id = p.id
    WHERE p.role = 'executor'
    ORDER BY p.full_name, p.id;
END;
$$;

ALTER FUNCTION public.list_task_executors() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_task_executors() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_task_executors() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
