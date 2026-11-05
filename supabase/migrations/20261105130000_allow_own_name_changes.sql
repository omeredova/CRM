BEGIN;

-- Keep applied migrations intact; replace the rule with self-service for both roles.
CREATE OR REPLACE FUNCTION public.set_profile_name(p_user_id uuid, p_first_name text, p_last_name text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%rowtype;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Можно изменять только собственный профиль' USING ERRCODE = '42501';
  END IF;
  IF length(v_first) NOT BETWEEN 1 AND 100 OR length(v_last) NOT BETWEEN 1 AND 100
    OR length(v_first || ' ' || v_last) > 200 THEN
    RAISE EXCEPTION 'Укажите имя и фамилию: до 100 символов каждое, до 200 вместе с пробелом'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET first_name = v_first, last_name = v_last, full_name = v_first || ' ' || v_last,
    name_set_at = coalesce(name_set_at, now())
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Профиль недоступен' USING ERRCODE = '42501';
  END IF;
  RETURN v_profile;
END;
$$;

ALTER FUNCTION public.set_profile_name(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_profile_name(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_name(uuid, text, text) TO authenticated;

-- No user management screen needs the extended list of names and email anymore.
DROP FUNCTION public.list_user_profiles();

COMMIT;
