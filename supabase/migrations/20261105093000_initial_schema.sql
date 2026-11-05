SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "crm_private";

ALTER SCHEMA "crm_private" OWNER TO "postgres";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."crm_role" AS ENUM (
    'manager',
    'executor'
);

ALTER TYPE "public"."crm_role" OWNER TO "postgres";

CREATE TYPE "public"."task_status" AS ENUM (
    'new',
    'in_progress',
    'in_review',
    'accepted',
    'revision'
);

ALTER TYPE "public"."task_status" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "crm_private"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200),
    'executor'
  );

  return new;
end;
$$;

ALTER FUNCTION "crm_private"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "crm_private"."is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'manager'
  );
$$;

ALTER FUNCTION "crm_private"."is_manager"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "crm_private"."prepare_task"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = new.assignee_id
      and role = 'executor'
  ) then
    raise exception 'Исполнителем задачи должен быть пользователь с ролью executor';
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or not crm_private.is_manager() then
      raise exception 'Создавать задачи может только постановщик';
    end if;

    new.status := 'new';
    new.author_id := auth.uid();
    new.created_at := now();
  end if;

  new.updated_at := now();

  return new;
end;
$$;

ALTER FUNCTION "crm_private"."prepare_task"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "crm_private"."record_task_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.task_history (
    task_id,
    original_task_id,
    actor_id,
    from_status,
    to_status
  )
  values (
    new.id,
    new.id,
    new.author_id,
    null,
    'new'
  );

  return new;
end;
$$;

ALTER FUNCTION "crm_private"."record_task_creation"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "object_id" "uuid" NOT NULL,
    "assignee_id" "uuid" NOT NULL,
    "status" "public"."task_status" DEFAULT 'new'::"public"."task_status" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_description_check" CHECK (("length"("description") <= 20000)),
    CONSTRAINT "tasks_title_check" CHECK ((("length"("btrim"("title")) >= 1) AND ("length"("btrim"("title")) <= 300)))
);

ALTER TABLE "public"."tasks" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."change_task_status"("p_task_id" "uuid", "p_to_status" "public"."task_status", "p_comment" "text" DEFAULT NULL::"text") RETURNS "public"."tasks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_task public.tasks%rowtype;
  v_actor uuid := auth.uid();
  v_manager boolean;
  v_allowed boolean := false;
  v_comment text := nullif(btrim(p_comment), '');
begin
  if v_actor is null then
    raise exception 'Необходимо войти в систему'
      using errcode = '42501';
  end if;

  v_manager := crm_private.is_manager();

  select *
  into v_task
  from public.tasks
  where id = p_task_id
    and (v_manager or assignee_id = v_actor)
  for update;

  if not found then
    raise exception 'Задача не найдена или недоступна'
      using errcode = '42501';
  end if;

  if p_to_status is null then
    raise exception 'Укажите новый статус'
      using errcode = '22023';
  end if;

  if length(v_comment) > 5000 then
    raise exception 'Комментарий не должен превышать 5000 символов'
      using errcode = '22023';
  end if;

  if v_manager then
    if p_to_status not in ('accepted', 'revision') then
      raise exception 'Постановщик может только принять задачу или вернуть на доработку'
        using errcode = '42501';
    end if;
  else
    if p_to_status not in ('in_progress', 'in_review') then
      raise exception 'Исполнитель может только взять задачу в работу или отправить на проверку'
        using errcode = '42501';
    end if;
  end if;

  v_allowed :=
      (v_task.status in ('new', 'revision') and p_to_status = 'in_progress')
    or (v_task.status = 'in_progress' and p_to_status = 'in_review')
    or (v_task.status = 'in_review' and p_to_status in ('accepted', 'revision'));

  if not v_allowed then
    raise exception 'Переход из статуса % в % запрещён',
      v_task.status,
      p_to_status
      using errcode = '23514';
  end if;

  if p_to_status = 'revision' and v_comment is null then
    raise exception 'Для возврата на доработку необходим комментарий'
      using errcode = '23514';
  end if;

  update public.tasks
  set status = p_to_status
  where id = v_task.id;

  insert into public.task_history (
    task_id,
    original_task_id,
    actor_id,
    from_status,
    to_status,
    comment
  )
  values (
    v_task.id,
    v_task.id,
    v_actor,
    v_task.status,
    p_to_status,
    v_comment
  );

  select *
  into v_task
  from public.tasks
  where id = v_task.id;

  return v_task;
end;
$$;

ALTER FUNCTION "public"."change_task_status"("p_task_id" "uuid", "p_to_status" "public"."task_status", "p_comment" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "objects_address_check" CHECK ((("length"("btrim"("address")) >= 1) AND ("length"("btrim"("address")) <= 1000))),
    CONSTRAINT "objects_name_check" CHECK ((("length"("btrim"("name")) >= 1) AND ("length"("btrim"("name")) <= 300)))
);

ALTER TABLE "public"."objects" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."crm_role" DEFAULT 'executor'::"public"."crm_role" NOT NULL,
    CONSTRAINT "profiles_full_name_check" CHECK (("length"("full_name") <= 200))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "original_task_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "from_status" "public"."task_status",
    "to_status" "public"."task_status" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "revision_requires_comment" CHECK ((("to_status" <> 'revision'::"public"."task_status") OR (NULLIF("btrim"("comment"), ''::"text") IS NOT NULL))),
    CONSTRAINT "task_history_comment_check" CHECK (("length"("comment") <= 5000))
);

ALTER TABLE "public"."task_history" OWNER TO "postgres";

ALTER TABLE ONLY "public"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");

CREATE INDEX "task_history_actor_idx" ON "public"."task_history" USING "btree" ("actor_id");

CREATE INDEX "task_history_task_idx" ON "public"."task_history" USING "btree" ("task_id", "created_at");

CREATE INDEX "tasks_assignee_idx" ON "public"."tasks" USING "btree" ("assignee_id");

CREATE INDEX "tasks_author_idx" ON "public"."tasks" USING "btree" ("author_id");

CREATE INDEX "tasks_object_idx" ON "public"."tasks" USING "btree" ("object_id");

-- Application trigger on the managed auth schema, omitted by the schema dump.
CREATE TRIGGER crm_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION crm_private.handle_new_user();

CREATE OR REPLACE TRIGGER "crm_prepare_task" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "crm_private"."prepare_task"();

CREATE OR REPLACE TRIGGER "crm_record_task_creation" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "crm_private"."record_task_creation"();

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE RESTRICT;

CREATE POLICY "history_read" ON "public"."task_history" FOR SELECT TO "authenticated" USING (("crm_private"."is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_history"."task_id") AND ("t"."assignee_id" = ( SELECT "auth"."uid"() AS "uid")))))));

ALTER TABLE "public"."objects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objects_delete" ON "public"."objects" FOR DELETE TO "authenticated" USING ("crm_private"."is_manager"());

CREATE POLICY "objects_insert" ON "public"."objects" FOR INSERT TO "authenticated" WITH CHECK ("crm_private"."is_manager"());

CREATE POLICY "objects_read" ON "public"."objects" FOR SELECT TO "authenticated" USING (("crm_private"."is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."object_id" = "objects"."id") AND ("t"."assignee_id" = ( SELECT "auth"."uid"() AS "uid")))))));

CREATE POLICY "objects_update" ON "public"."objects" FOR UPDATE TO "authenticated" USING ("crm_private"."is_manager"()) WITH CHECK ("crm_private"."is_manager"());

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "crm_private"."is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."assignee_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("t"."author_id" = "profiles"."id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."task_history" "h"
     JOIN "public"."tasks" "t" ON (("t"."id" = "h"."task_id")))
  WHERE (("t"."assignee_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("h"."actor_id" = "profiles"."id"))))));

ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_delete" ON "public"."tasks" FOR DELETE TO "authenticated" USING ("crm_private"."is_manager"());

CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (("crm_private"."is_manager"() AND ("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'new'::"public"."task_status")));

CREATE POLICY "tasks_read" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("crm_private"."is_manager"() OR ("assignee_id" = ( SELECT "auth"."uid"() AS "uid"))));

CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ("crm_private"."is_manager"()) WITH CHECK ("crm_private"."is_manager"());

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "crm_private" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON FUNCTION "crm_private"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "crm_private"."is_manager"() FROM PUBLIC;
GRANT ALL ON FUNCTION "crm_private"."is_manager"() TO "authenticated";

REVOKE ALL ON FUNCTION "crm_private"."prepare_task"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "crm_private"."record_task_creation"() FROM PUBLIC;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tasks" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."tasks" TO "authenticated";

GRANT INSERT("title"),UPDATE("title") ON TABLE "public"."tasks" TO "authenticated";

GRANT INSERT("description"),UPDATE("description") ON TABLE "public"."tasks" TO "authenticated";

GRANT INSERT("object_id"),UPDATE("object_id") ON TABLE "public"."tasks" TO "authenticated";

GRANT INSERT("assignee_id"),UPDATE("assignee_id") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ON FUNCTION "public"."change_task_status"("p_task_id" "uuid", "p_to_status" "public"."task_status", "p_comment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_task_status"("p_task_id" "uuid", "p_to_status" "public"."task_status", "p_comment" "text") TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."objects" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."objects" TO "authenticated";

GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."objects" TO "authenticated";

GRANT INSERT("address"),UPDATE("address") ON TABLE "public"."objects" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."task_history" TO "service_role";
GRANT SELECT ON TABLE "public"."task_history" TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
