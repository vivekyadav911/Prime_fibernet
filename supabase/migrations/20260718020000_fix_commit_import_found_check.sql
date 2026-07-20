-- Fail commit if an update match_key hits 0 rows (was previously counted as updated)
CREATE OR REPLACE FUNCTION public.commit_import_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity text;
  v_performed_by uuid;
  v_file_name text;
  v_inserted int := 0;
  v_updated int := 0;
  v_unchanged int := 0;
  v_errored int := 0;
  v_history_id uuid;
  v_field_diffs jsonb := '[]'::jsonb;
  r record;
  d jsonb;
  k text;
  v_new jsonb;
BEGIN
  PERFORM set_config('app.import_commit', '1', true);

  IF p_batch_id IS NULL THEN
    RAISE EXCEPTION 'batch_id required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.import_history WHERE batch_id = p_batch_id) THEN
    RAISE EXCEPTION 'batch already committed';
  END IF;

  SELECT entity_type, performed_by, file_name
    INTO v_entity, v_performed_by, v_file_name
  FROM public.import_staging
  WHERE import_batch_id = p_batch_id
  LIMIT 1;

  IF v_entity IS NULL THEN
    RAISE EXCEPTION 'batch not found';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE action = 'unchanged'),
    COUNT(*) FILTER (WHERE action = 'error')
  INTO v_unchanged, v_errored
  FROM public.import_staging
  WHERE import_batch_id = p_batch_id;

  FOR r IN
    SELECT * FROM public.import_staging
    WHERE import_batch_id = p_batch_id AND action = 'insert'
    ORDER BY row_number
  LOOP
    v_new := r.raw_row;

    IF v_entity = 'users' THEN
      INSERT INTO public.users (
        email, name, phone, first_name, middle_name, last_name,
        city, address, district, pincode, state,
        customer_id, username, role
      ) VALUES (
        lower(trim(v_new->>'email')),
        COALESCE(NULLIF(trim(v_new->>'name'), ''), trim(CONCAT_WS(' ', v_new->>'first_name', v_new->>'last_name'))),
        NULLIF(trim(v_new->>'phone'), ''),
        NULLIF(trim(v_new->>'first_name'), ''),
        NULLIF(trim(v_new->>'middle_name'), ''),
        NULLIF(trim(v_new->>'last_name'), ''),
        NULLIF(trim(v_new->>'city'), ''),
        NULLIF(trim(v_new->>'address'), ''),
        NULLIF(trim(v_new->>'district'), ''),
        NULLIF(trim(v_new->>'pincode'), ''),
        NULLIF(trim(v_new->>'state'), ''),
        NULLIF(trim(v_new->>'customer_id'), ''),
        NULLIF(trim(v_new->>'username'), ''),
        COALESCE(NULLIF(trim(v_new->>'role'), ''), 'customer')
      );
      v_inserted := v_inserted + 1;

    ELSIF v_entity = 'plans' THEN
      INSERT INTO public.plans (
        name, display_name, speed, speed_mbps, price, validity_days,
        description, is_active, plan_tag, category, data_limit
      ) VALUES (
        trim(v_new->>'name'),
        COALESCE(NULLIF(trim(v_new->>'display_name'), ''), trim(v_new->>'name')),
        NULLIF(trim(v_new->>'speed'), ''),
        NULLIF(v_new->>'speed_mbps', '')::int,
        NULLIF(v_new->>'price', '')::numeric,
        NULLIF(v_new->>'validity_days', '')::int,
        NULLIF(trim(v_new->>'description'), ''),
        COALESCE((v_new->>'is_active')::boolean, true),
        NULLIF(trim(v_new->>'plan_tag'), ''),
        COALESCE(NULLIF(trim(v_new->>'category'), ''), 'standard'),
        NULLIF(trim(v_new->>'data_limit'), '')
      );
      v_inserted := v_inserted + 1;

    ELSE
      RAISE EXCEPTION 'insert not allowed for entity %', v_entity;
    END IF;
  END LOOP;

  FOR r IN
    SELECT * FROM public.import_staging
    WHERE import_batch_id = p_batch_id AND action = 'update'
    ORDER BY row_number
  LOOP
    d := COALESCE(r.diff, '{}'::jsonb);
    IF d = '{}'::jsonb THEN
      CONTINUE;
    END IF;

    FOR k IN SELECT jsonb_object_keys(d)
    LOOP
      v_field_diffs := v_field_diffs || jsonb_build_array(
        jsonb_build_object(
          'row', r.row_number,
          'match_key', r.match_key,
          'field', k,
          'old_value', d->k->'old',
          'new_value', d->k->'new'
        )
      );
    END LOOP;

    IF v_entity = 'users' THEN
      UPDATE public.users u SET
        name = CASE WHEN d ? 'name' THEN NULLIF(trim(d->'name'->>'new'), '') ELSE u.name END,
        phone = CASE WHEN d ? 'phone' THEN NULLIF(trim(d->'phone'->>'new'), '') ELSE u.phone END,
        first_name = CASE WHEN d ? 'first_name' THEN NULLIF(trim(d->'first_name'->>'new'), '') ELSE u.first_name END,
        middle_name = CASE WHEN d ? 'middle_name' THEN NULLIF(trim(d->'middle_name'->>'new'), '') ELSE u.middle_name END,
        last_name = CASE WHEN d ? 'last_name' THEN NULLIF(trim(d->'last_name'->>'new'), '') ELSE u.last_name END,
        city = CASE WHEN d ? 'city' THEN NULLIF(trim(d->'city'->>'new'), '') ELSE u.city END,
        address = CASE WHEN d ? 'address' THEN NULLIF(trim(d->'address'->>'new'), '') ELSE u.address END,
        district = CASE WHEN d ? 'district' THEN NULLIF(trim(d->'district'->>'new'), '') ELSE u.district END,
        pincode = CASE WHEN d ? 'pincode' THEN NULLIF(trim(d->'pincode'->>'new'), '') ELSE u.pincode END,
        state = CASE WHEN d ? 'state' THEN NULLIF(trim(d->'state'->>'new'), '') ELSE u.state END,
        customer_id = CASE WHEN d ? 'customer_id' THEN NULLIF(trim(d->'customer_id'->>'new'), '') ELSE u.customer_id END,
        username = CASE WHEN d ? 'username' THEN NULLIF(trim(d->'username'->>'new'), '') ELSE u.username END,
        updated_at = now()
      WHERE lower(u.email) = lower(r.match_key);

    ELSIF v_entity = 'plans' THEN
      UPDATE public.plans p SET
        display_name = CASE WHEN d ? 'display_name' THEN NULLIF(trim(d->'display_name'->>'new'), '') ELSE p.display_name END,
        speed = CASE WHEN d ? 'speed' THEN NULLIF(trim(d->'speed'->>'new'), '') ELSE p.speed END,
        speed_mbps = CASE WHEN d ? 'speed_mbps' THEN NULLIF(d->'speed_mbps'->>'new', '')::int ELSE p.speed_mbps END,
        price = CASE WHEN d ? 'price' THEN NULLIF(d->'price'->>'new', '')::numeric ELSE p.price END,
        validity_days = CASE WHEN d ? 'validity_days' THEN NULLIF(d->'validity_days'->>'new', '')::int ELSE p.validity_days END,
        description = CASE WHEN d ? 'description' THEN NULLIF(trim(d->'description'->>'new'), '') ELSE p.description END,
        is_active = CASE WHEN d ? 'is_active' THEN (d->'is_active'->>'new')::boolean ELSE p.is_active END,
        plan_tag = CASE WHEN d ? 'plan_tag' THEN NULLIF(trim(d->'plan_tag'->>'new'), '') ELSE p.plan_tag END,
        category = CASE WHEN d ? 'category' THEN NULLIF(trim(d->'category'->>'new'), '') ELSE p.category END,
        data_limit = CASE WHEN d ? 'data_limit' THEN NULLIF(trim(d->'data_limit'->>'new'), '') ELSE p.data_limit END,
        updated_at = now()
      WHERE p.name = r.match_key
        AND COALESCE(p.is_deleted, false) = false;

    ELSIF v_entity = 'officers' THEN
      UPDATE public.officers o SET
        full_name = CASE WHEN d ? 'full_name' THEN NULLIF(trim(d->'full_name'->>'new'), '') ELSE o.full_name END,
        email = CASE WHEN d ? 'email' THEN NULLIF(trim(d->'email'->>'new'), '') ELSE o.email END,
        phone = CASE WHEN d ? 'phone' THEN NULLIF(trim(d->'phone'->>'new'), '') ELSE o.phone END,
        alternate_phone = CASE WHEN d ? 'alternate_phone' THEN NULLIF(trim(d->'alternate_phone'->>'new'), '') ELSE o.alternate_phone END,
        status = CASE WHEN d ? 'status' THEN NULLIF(trim(d->'status'->>'new'), '') ELSE o.status END,
        city = CASE WHEN d ? 'city' THEN NULLIF(trim(d->'city'->>'new'), '') ELSE o.city END,
        state = CASE WHEN d ? 'state' THEN NULLIF(trim(d->'state'->>'new'), '') ELSE o.state END,
        pincode = CASE WHEN d ? 'pincode' THEN NULLIF(trim(d->'pincode'->>'new'), '') ELSE o.pincode END,
        current_address = CASE WHEN d ? 'current_address' THEN NULLIF(trim(d->'current_address'->>'new'), '') ELSE o.current_address END,
        updated_at = now()
      WHERE o.employee_id = r.match_key;

    ELSIF v_entity = 'transactions' THEN
      UPDATE public.payments p SET
        notes = CASE WHEN d ? 'notes' THEN NULLIF(trim(d->'notes'->>'new'), '') ELSE p.notes END,
        review_notes = CASE WHEN d ? 'review_notes' THEN NULLIF(trim(d->'review_notes'->>'new'), '') ELSE p.review_notes END,
        cash_collection_notes = CASE WHEN d ? 'cash_collection_notes' THEN NULLIF(trim(d->'cash_collection_notes'->>'new'), '') ELSE p.cash_collection_notes END,
        amount = CASE
          WHEN d ? 'amount' AND p.status NOT IN ('confirmed', 'refunded')
            THEN NULLIF(d->'amount'->>'new', '')::numeric
          ELSE p.amount
        END,
        total_amount = CASE
          WHEN d ? 'total_amount' AND p.status NOT IN ('confirmed', 'refunded')
            THEN NULLIF(d->'total_amount'->>'new', '')::numeric
          ELSE p.total_amount
        END,
        status = CASE
          WHEN d ? 'status' AND p.status NOT IN ('confirmed', 'refunded')
            THEN (d->'status'->>'new')::payment_status
          ELSE p.status
        END,
        updated_at = now()
      WHERE p.payment_number = r.match_key;
    END IF;

    IF FOUND THEN
      v_updated := v_updated + 1;
    ELSE
      RAISE EXCEPTION 'update matched 0 rows for % key %', v_entity, r.match_key;
    END IF;
  END LOOP;

  INSERT INTO public.import_history (
    batch_id, entity_type, performed_by, file_name,
    rows_inserted, rows_updated, rows_unchanged, rows_errored,
    field_level_diff
  ) VALUES (
    p_batch_id, v_entity, v_performed_by, v_file_name,
    v_inserted, v_updated, v_unchanged, v_errored,
    v_field_diffs
  )
  RETURNING id INTO v_history_id;

  DELETE FROM public.import_staging WHERE import_batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'history_id', v_history_id,
    'batch_id', p_batch_id,
    'entity_type', v_entity,
    'rows_inserted', v_inserted,
    'rows_updated', v_updated,
    'rows_unchanged', v_unchanged,
    'rows_errored', v_errored
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_import_batch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_import_batch(uuid) TO service_role;
