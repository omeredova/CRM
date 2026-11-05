BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(5);

-- Independent fixtures; all users, rows and history are rolled back at the end.
DO $$
DECLARE
  v_manager uuid := gen_random_uuid();
  v_executor uuid := gen_random_uuid();
  v_object uuid := gen_random_uuid();
  v_task uuid;
BEGIN
  INSERT INTO auth.users (id) VALUES (v_manager), (v_executor);
  UPDATE public.profiles SET role = 'manager' WHERE id = v_manager;
  INSERT INTO public.objects (id, name, address)
  VALUES (v_object, 'History order test', 'Test address');
  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  INSERT INTO public.tasks (title, object_id, assignee_id)
  VALUES ('History order test', v_object, v_executor)
  RETURNING id INTO v_task;

  PERFORM set_config('test.history_task', v_task::text, true);
  PERFORM set_config('test.history_manager', v_manager::text, true);
  PERFORM set_config('test.history_executor', v_executor::text, true);
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_task uuid := current_setting('test.history_task')::uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('test.history_executor'), true);
  PERFORM public.change_task_status(v_task, 'in_progress', NULL);
  PERFORM public.change_task_status(v_task, 'in_review', NULL);
  PERFORM set_config('request.jwt.claim.sub', current_setting('test.history_manager'), true);
  PERFORM public.change_task_status(v_task, 'revision', 'Test revision');
END;
$$;
RESET ROLE;

SELECT is(
  (SELECT count(DISTINCT created_at) FROM public.task_history
    WHERE task_id = current_setting('test.history_task')::uuid),
  1::bigint, 'Fixture events have exactly the same timestamp'
);
SELECT is(
  (SELECT array_agg(event_order ORDER BY event_order DESC) FROM public.task_history
    WHERE task_id = current_setting('test.history_task')::uuid),
  ARRAY[4, 3, 2, 1], 'Each event gets a consecutive order even in one transaction'
);
SELECT is(
  (SELECT array_agg(to_status::text ORDER BY event_order DESC) FROM public.task_history
    WHERE task_id = current_setting('test.history_task')::uuid),
  ARRAY['revision', 'in_review', 'in_progress', 'new'], 'Newest transition appears first'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.task_history', 'event_order', 'INSERT'),
  'Client cannot supply a history order'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.task_history', 'event_order', 'UPDATE'),
  'Client cannot rewrite a history order'
);
SELECT * FROM finish();
ROLLBACK;
