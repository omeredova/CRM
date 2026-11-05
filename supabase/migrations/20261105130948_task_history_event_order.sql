BEGIN;

-- Status changes lock the task before inserting history. Use the same lock order
-- so no history can be appended while existing rows are being numbered.
LOCK TABLE public.tasks IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.task_history IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.task_history ADD COLUMN event_order integer;

-- Recover existing order from time and the status chain. Never guess using UUIDs
-- or physical row positions. Ambiguous or broken history aborts the migration.
DO $$
DECLARE
  v_task_id uuid;
  v_previous public.task_status;
  v_time timestamptz;
  v_candidates bigint;
  v_entry_id uuid;
  v_order integer;
BEGIN
  FOR v_task_id IN SELECT DISTINCT original_task_id FROM public.task_history LOOP
    v_previous := NULL;
    v_order := 0;

    LOOP
      SELECT min(created_at) INTO v_time
      FROM public.task_history
      WHERE original_task_id = v_task_id AND event_order IS NULL;
      EXIT WHEN v_time IS NULL;

      SELECT count(*) INTO v_candidates
      FROM public.task_history
      WHERE original_task_id = v_task_id AND event_order IS NULL
        AND created_at = v_time
        AND from_status IS NOT DISTINCT FROM v_previous;

      IF v_candidates <> 1 THEN
        RAISE EXCEPTION 'Cannot unambiguously order history for task % at %', v_task_id, v_time;
      END IF;

      SELECT id INTO STRICT v_entry_id
      FROM public.task_history
      WHERE original_task_id = v_task_id AND event_order IS NULL
        AND created_at = v_time
        AND from_status IS NOT DISTINCT FROM v_previous;

      v_order := v_order + 1;
      UPDATE public.task_history SET event_order = v_order
      WHERE id = v_entry_id
      RETURNING to_status INTO v_previous;
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.task_history
  ALTER COLUMN event_order SET NOT NULL,
  ADD CONSTRAINT task_history_event_order_positive CHECK (event_order > 0),
  ADD CONSTRAINT task_history_task_event_order_key UNIQUE (original_task_id, event_order);

-- Supports task history reads and pagination with newest events first.
CREATE INDEX task_history_task_event_order_idx
  ON public.task_history (task_id, event_order DESC);

CREATE FUNCTION crm_private.assign_task_history_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.tasks
  WHERE id = NEW.task_id AND id = NEW.original_task_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot append history for a missing or mismatched task';
  END IF;

  SELECT coalesce(max(event_order), 0) + 1 INTO NEW.event_order
  FROM public.task_history
  WHERE original_task_id = NEW.original_task_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION crm_private.assign_task_history_order() OWNER TO postgres;
REVOKE ALL ON FUNCTION crm_private.assign_task_history_order() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER crm_assign_task_history_order
BEFORE INSERT ON public.task_history
FOR EACH ROW EXECUTE FUNCTION crm_private.assign_task_history_order();

NOTIFY pgrst, 'reload schema';

COMMIT;
