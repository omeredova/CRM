BEGIN;

-- Column privileges prevent changing id or role, even via a direct API request.
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

CREATE POLICY profiles_update_own_name
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

COMMIT;
