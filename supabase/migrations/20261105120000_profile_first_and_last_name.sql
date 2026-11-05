BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN first_name text NOT NULL DEFAULT '',
  ADD COLUMN last_name text NOT NULL DEFAULT '',
  ADD COLUMN name_set_at timestamptz,
  ADD CONSTRAINT profiles_first_last_name_check CHECK (
    (name_set_at IS NULL AND first_name = '' AND last_name = '')
    OR (name_set_at IS NOT NULL AND length(btrim(first_name)) BETWEEN 1 AND 100
      AND length(btrim(last_name)) BETWEEN 1 AND 100
      AND full_name = first_name || ' ' || last_name)
  );

-- All name changes now go through a checked function; direct updates are closed.
REVOKE UPDATE (full_name) ON TABLE public.profiles FROM authenticated;
DROP POLICY IF EXISTS profiles_update_own_name ON public.profiles;

CREATE FUNCTION public.set_profile_name(p_user_id uuid, p_first_name text, p_last_name text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%rowtype;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
  v_manager boolean := crm_private.is_manager();
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS DISTINCT FROM auth.uid() AND NOT v_manager) THEN
    RAISE EXCEPTION 'Нет доступа к изменению профиля' USING ERRCODE = '42501';
  END IF;
  IF length(v_first) NOT BETWEEN 1 AND 100 OR length(v_last) NOT BETWEEN 1 AND 100
    OR length(v_first || ' ' || v_last) > 200 THEN
    RAISE EXCEPTION 'Укажите имя и фамилию: до 100 символов каждое, до 200 вместе с пробелом'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize concurrent first-time submissions so only one can succeed.
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Профиль недоступен' USING ERRCODE = '42501';
  END IF;
  IF v_profile.name_set_at IS NOT NULL AND NOT v_manager THEN
    RAISE EXCEPTION 'Имя и фамилию уже сохранили. Изменить их может только постановщик'
      USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET first_name = v_first, last_name = v_last, full_name = v_first || ' ' || v_last,
    name_set_at = coalesce(name_set_at, now())
  WHERE id = p_user_id
  RETURNING * INTO v_profile;
  RETURN v_profile;
END;
$$;

CREATE FUNCTION public.list_user_profiles()
RETURNS TABLE (id uuid, full_name text, first_name text, last_name text,
  role public.crm_role, name_set_at timestamptz, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT crm_private.is_manager() THEN
    RAISE EXCEPTION 'Список пользователей доступен только постановщику' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.first_name, p.last_name, p.role, p.name_set_at, coalesce(u.email::text, '')
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    ORDER BY p.full_name, p.id;
END;
$$;

ALTER FUNCTION public.set_profile_name(uuid, text, text) OWNER TO postgres;
ALTER FUNCTION public.list_user_profiles() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_profile_name(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_user_profiles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_name(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_profiles() TO authenticated;

COMMIT;
