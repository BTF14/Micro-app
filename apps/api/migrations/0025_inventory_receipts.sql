BEGIN;
SET LOCAL lock_timeout='5s';
DO $preflight$ BEGIN
 IF current_user<>'microapp_migrator' OR session_user<>'microapp_migrator' THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime' AND rolcanlogin) THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_RUNTIME_ROLE_MISSING';
 END IF;
END; $preflight$;

CREATE TABLE public.inventory_receipts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 warehouse_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(pg_catalog.btrim(reason)) BETWEEN 1 AND 500),
 idempotency_key text NOT NULL CHECK(idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}
 created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
 UNIQUE(organization_id,branch_id,warehouse_id,id),
 UNIQUE(organization_id,created_by,idempotency_key),
 FOREIGN KEY(organization_id,branch_id,warehouse_id)
  REFERENCES public.warehouses(organization_id,branch_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(organization_id,created_by)
  REFERENCES public.organization_members(organization_id,user_id) ON DELETE RESTRICT
);
CREATE INDEX inventory_receipts_warehouse_history_idx
 ON public.inventory_receipts(organization_id,branch_id,warehouse_id,created_at DESC,id DESC);

CREATE TABLE public.inventory_receipt_lines(
 organization_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 warehouse_id uuid NOT NULL,
 receipt_id uuid NOT NULL,
 product_id uuid NOT NULL,
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 unit_cost_usd numeric(14,4) NOT NULL CHECK(unit_cost_usd>=0),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
 PRIMARY KEY(organization_id,receipt_id,product_id),
 FOREIGN KEY(organization_id,branch_id,warehouse_id,receipt_id)
  REFERENCES public.inventory_receipts(organization_id,branch_id,warehouse_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(organization_id,product_id)
  REFERENCES public.products(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX inventory_receipt_lines_product_idx
 ON public.inventory_receipt_lines(organization_id,product_id,receipt_id);

CREATE OR REPLACE FUNCTION public.validate_inventory_movement_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $validate_inventory_movement_source$
DECLARE
  count_type text;
  count_status text;
  actor_role text;
  line_expected_on_hand numeric(14,3);
  line_expected_version bigint;
  current_on_hand numeric(14,3);
  current_balance_version bigint;
  sale_branch_id uuid;
  sale_warehouse_id uuid;
  sale_actor_id uuid;
  sale_status text;
  sale_quantity numeric(14,3);
  sale_unit_cost numeric(14,4);
  receipt_branch_id uuid;
  receipt_warehouse_id uuid;
  receipt_actor_id uuid;
  receipt_reason text;
  receipt_quantity numeric(14,3);
  receipt_unit_cost numeric(14,4);
BEGIN
  IF NEW.movement_type IN ('opening', 'count_adjustment') THEN
    IF NEW.count_id IS NULL
      OR NEW.reference_type IS NOT NULL
      OR NEW.reference_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'COUNT_MOVEMENT_MUST_REFERENCE_CONFIRMED_COUNT_ONLY'
        USING ERRCODE = '23514';
    END IF;

    -- A count can be confirmed while its branch is active and the branch
    -- deactivated later. Revalidate and stabilize branch state at movement
    -- time; NOWAIT preserves fail-closed behavior without reversing API locks.
    PERFORM 1
      FROM public.branches AS branch
     WHERE branch.organization_id = NEW.organization_id
       AND branch.id = NEW.branch_id
       AND branch.is_active = true
     FOR SHARE NOWAIT;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID'
        USING ERRCODE = '23514';
    END IF;

    SELECT c.count_type, c.status
      INTO count_type, count_status
      FROM public.inventory_counts AS c
     WHERE c.organization_id = NEW.organization_id
       AND c.branch_id = NEW.branch_id
       AND c.warehouse_id = NEW.warehouse_id
       AND c.id = NEW.count_id
     FOR SHARE;

    IF NOT FOUND OR count_status <> 'confirmed'
      OR (NEW.movement_type = 'opening' AND count_type <> 'opening')
      OR (NEW.movement_type = 'count_adjustment' AND count_type <> 'physical')
    THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_MATCHING_CONFIRMED_COUNT'
        USING ERRCODE = '23514';
    END IF;

    -- Revalidate the claimed actor at movement time. NOWAIT prevents a
    -- warehouse->membership lock inversion from deadlocking an API request
    -- that already holds branch scope before taking the warehouse mutex.
    SELECT member.role
      INTO actor_role
      FROM public.organizations AS org
      JOIN public.organization_members AS member
        ON member.organization_id = org.id
       AND member.user_id = NEW.actor_user_id
       AND member.is_active = true
       AND member.role IN ('owner', 'admin', 'inventory')
      JOIN public.app_users AS actor_user
        ON actor_user.id = member.user_id
       AND actor_user.is_active = true
     WHERE org.id = NEW.organization_id
       AND org.is_active = true
     FOR SHARE OF org, member, actor_user NOWAIT;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED'
        USING ERRCODE = '23514';
    END IF;

    IF actor_role = 'inventory' THEN
      PERFORM 1
        FROM public.branch_memberships AS membership
       WHERE membership.organization_id = NEW.organization_id
         AND membership.branch_id = NEW.branch_id
         AND membership.user_id = NEW.actor_user_id
         AND membership.is_active = true
       FOR SHARE NOWAIT;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    SELECT line.expected_on_hand_quantity, line.expected_balance_version
      INTO line_expected_on_hand, line_expected_version
      FROM public.inventory_count_lines AS line
     WHERE line.organization_id = NEW.organization_id
       AND line.count_id = NEW.count_id
       AND line.product_id = NEW.product_id
     FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.movement_type = 'opening' THEN
      IF EXISTS (
        SELECT 1 FROM public.inventory_balances AS balance
         WHERE balance.organization_id = NEW.organization_id
           AND balance.branch_id = NEW.branch_id
           AND balance.warehouse_id = NEW.warehouse_id
           AND balance.product_id = NEW.product_id
      ) THEN
        RAISE EXCEPTION 'INVENTORY_OPENING_MOVEMENT_REQUIRES_EMPTY_PRODUCT_BALANCE'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      current_on_hand := 0.000;
      current_balance_version := 0;
      SELECT balance.on_hand_quantity, balance.balance_version
        INTO current_on_hand, current_balance_version
        FROM public.inventory_balances AS balance
       WHERE balance.organization_id = NEW.organization_id
         AND balance.branch_id = NEW.branch_id
         AND balance.warehouse_id = NEW.warehouse_id
         AND balance.product_id = NEW.product_id
       FOR UPDATE;

      IF NOT FOUND THEN
        current_on_hand := 0.000;
        current_balance_version := 0;
      END IF;

      IF line_expected_on_hand IS DISTINCT FROM current_on_hand
        OR line_expected_version IS DISTINCT FROM current_balance_version
      THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_SNAPSHOT_STALE'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.movement_type = 'purchase_receipt' THEN
    IF NEW.count_id IS NOT NULL OR NEW.reference_type IS DISTINCT FROM 'inventory_receipt'
      OR NEW.reference_id IS NULL OR NEW.quantity_delta <= 0 THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_SOURCE_INVALID' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.branches b WHERE b.organization_id=NEW.organization_id
      AND b.id=NEW.branch_id AND b.is_active=true FOR SHARE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID' USING ERRCODE = '23514'; END IF;
    SELECT r.branch_id,r.warehouse_id,r.created_by,r.reason
      INTO receipt_branch_id,receipt_warehouse_id,receipt_actor_id,receipt_reason
      FROM public.inventory_receipts r
     WHERE r.organization_id=NEW.organization_id AND r.id=NEW.reference_id FOR SHARE;
    IF NOT FOUND OR receipt_branch_id IS DISTINCT FROM NEW.branch_id
      OR receipt_warehouse_id IS DISTINCT FROM NEW.warehouse_id
      OR receipt_actor_id IS DISTINCT FROM NEW.actor_user_id
      OR receipt_reason IS DISTINCT FROM NEW.reason THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_SOURCE_SCOPE_INVALID' USING ERRCODE = '23514';
    END IF;
    SELECT l.quantity,l.unit_cost_usd INTO receipt_quantity,receipt_unit_cost
      FROM public.inventory_receipt_lines l
     WHERE l.organization_id=NEW.organization_id AND l.receipt_id=NEW.reference_id
       AND l.product_id=NEW.product_id FOR SHARE;
    IF NOT FOUND OR NEW.quantity_delta IS DISTINCT FROM receipt_quantity
      OR NEW.unit_cost_usd IS DISTINCT FROM receipt_unit_cost THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_MUST_MATCH_RECEIPT_LINE' USING ERRCODE = '23514';
    END IF;
    SELECT m.role INTO actor_role
      FROM public.organizations o
      JOIN public.organization_members m ON m.organization_id=o.id
        AND m.user_id=NEW.actor_user_id AND m.is_active=true
        AND m.role IN ('owner','admin','inventory')
      JOIN public.app_users u ON u.id=m.user_id AND u.is_active=true
     WHERE o.id=NEW.organization_id AND o.is_active=true
     FOR SHARE OF o,m,u NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514'; END IF;
    IF actor_role='inventory' THEN
      PERFORM 1 FROM public.branch_memberships bm
       WHERE bm.organization_id=NEW.organization_id AND bm.branch_id=NEW.branch_id
         AND bm.user_id=NEW.actor_user_id AND bm.is_active=true FOR SHARE NOWAIT;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID' USING ERRCODE = '23514'; END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public.warehouse_inventory_movements m
      WHERE m.organization_id=NEW.organization_id AND m.movement_type='purchase_receipt'
        AND m.reference_type='inventory_receipt' AND m.reference_id=NEW.reference_id
        AND m.product_id=NEW.product_id) THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_ALREADY_RECORDED' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.movement_type <> 'sale'
    OR NEW.count_id IS NOT NULL
    OR NEW.reference_type IS DISTINCT FROM 'sale'
    OR NEW.reference_id IS NULL
    OR NEW.quantity_delta >= 0
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_TYPE_NOT_AUTHORIZED'
      USING ERRCODE = '23514';
  END IF;

  SELECT s.branch_id, s.warehouse_id, s.created_by, s.status
    INTO sale_branch_id, sale_warehouse_id, sale_actor_id, sale_status
    FROM public.sales AS s
   WHERE s.organization_id = NEW.organization_id
     AND s.id = NEW.reference_id
   FOR UPDATE;

  IF NOT FOUND
    OR sale_status <> 'draft'
    OR sale_branch_id IS DISTINCT FROM NEW.branch_id
    OR sale_warehouse_id IS DISTINCT FROM NEW.warehouse_id
    OR sale_actor_id IS DISTINCT FROM NEW.actor_user_id
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_SOURCE_SCOPE_INVALID'
      USING ERRCODE = '23514';
  END IF;

  SELECT item.quantity, item.unit_cost_usd
    INTO sale_quantity, sale_unit_cost
    FROM public.sale_items AS item
   WHERE item.organization_id = NEW.organization_id
     AND item.sale_id = NEW.reference_id
     AND item.product_id = NEW.product_id
   FOR SHARE;

  IF NOT FOUND
    OR NEW.quantity_delta IS DISTINCT FROM -sale_quantity
    OR NEW.unit_cost_usd IS DISTINCT FROM sale_unit_cost
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_MUST_MATCH_SALE_LINE'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.warehouse_inventory_movements AS existing
     WHERE existing.organization_id = NEW.organization_id
       AND existing.movement_type = 'sale'
       AND existing.reference_type = 'sale'
       AND existing.reference_id = NEW.reference_id
       AND existing.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_ALREADY_RECORDED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_inventory_movement_source$;
ALTER FUNCTION public.validate_inventory_movement_source() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.validate_inventory_movement_source() FROM PUBLIC,microapp_runtime;

CREATE FUNCTION public.create_inventory_receipt(
 p_organization_id uuid,p_branch_id uuid,p_warehouse_id uuid,p_actor_user_id uuid,
 p_reason text,p_idempotency_key text,p_request_hash text,p_lines jsonb
) RETURNS TABLE(receipt_id uuid,replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $create_inventory_receipt$
DECLARE
 v_role text; v_receipt_id uuid; v_existing_hash text; v_existing_payload jsonb; v_line jsonb;
 v_product_id uuid; v_quantity numeric(14,3); v_unit_cost numeric(14,4);
BEGIN
 IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_warehouse_id IS NULL OR p_actor_user_id IS NULL
  OR p_reason IS NULL OR length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 500 OR p_reason ~ '[[:cntrl:]]'
  OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$'
  OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
  OR p_lines IS NULL OR pg_catalog.jsonb_typeof(p_lines)<>'array'
  OR pg_catalog.jsonb_array_length(p_lines) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_INPUT_INVALID' USING ERRCODE='22023';
 END IF;
 -- Global order: tenant/member -> branch/branch-member -> warehouse -> document/idempotency -> ledger.
 PERFORM 1 FROM public.organizations WHERE id=p_organization_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE='42501'; END IF;
 SELECT m.role INTO v_role FROM public.organization_members m
  JOIN public.app_users u ON u.id=m.user_id AND u.is_active
  WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id AND m.is_active
   AND m.role IN('owner','admin','inventory') FOR UPDATE OF m,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.branches WHERE organization_id=p_organization_id AND id=p_branch_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_BRANCH_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 IF v_role='inventory' THEN
  PERFORM 1 FROM public.branch_memberships WHERE organization_id=p_organization_id AND branch_id=p_branch_id
   AND user_id=p_actor_user_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_BRANCH_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.warehouses WHERE organization_id=p_organization_id AND branch_id=p_branch_id
  AND id=p_warehouse_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_WAREHOUSE_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_lines) x(value)
  WHERE pg_catalog.jsonb_typeof(value)<>'object'
   OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(value))<>3
   OR NOT(value?'product_id' AND value?'quantity' AND value?'unit_cost_usd')
   OR COALESCE(value->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR COALESCE(value->>'quantity','') !~ '^(0|[1-9][0-9]{0,10})(\.[0-9]{1,3})?$'
   OR COALESCE(value->>'unit_cost_usd','') !~ '^(0|[1-9][0-9]{0,9})(\.[0-9]{1,4})?$') THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_LINE_INVALID' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM pg_catalog.jsonb_array_elements(p_lines))<>
    (SELECT count(DISTINCT(value->>'product_id')::uuid) FROM pg_catalog.jsonb_array_elements(p_lines) x(value)) THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_DUPLICATE_PRODUCT' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_lines) x(value)
  LEFT JOIN public.products p ON p.organization_id=p_organization_id AND p.id=(value->>'product_id')::uuid
  WHERE p.id IS NULL) THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_PRODUCT_OUT_OF_SCOPE' USING ERRCODE='23503';
 END IF;
 INSERT INTO public.inventory_receipts(organization_id,branch_id,warehouse_id,reason,idempotency_key,request_hash,request_payload,created_by)
 VALUES(p_organization_id,p_branch_id,p_warehouse_id,pg_catalog.btrim(p_reason),p_idempotency_key,p_request_hash,p_lines,p_actor_user_id)
 ON CONFLICT(organization_id,created_by,idempotency_key) DO NOTHING RETURNING id INTO v_receipt_id;
 IF v_receipt_id IS NULL THEN
  SELECT id,request_hash,request_payload INTO v_receipt_id,v_existing_hash,v_existing_payload FROM public.inventory_receipts
   WHERE organization_id=p_organization_id AND created_by=p_actor_user_id AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_existing_hash IS DISTINCT FROM p_request_hash OR v_existing_payload IS DISTINCT FROM p_lines THEN
   RAISE EXCEPTION 'INVENTORY_RECEIPT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  RETURN QUERY SELECT v_receipt_id,true; RETURN;
 END IF;
 FOR v_line IN SELECT value FROM pg_catalog.jsonb_array_elements(p_lines) x(value) LOOP
  v_product_id:=(v_line->>'product_id')::uuid;
  v_quantity:=(v_line->>'quantity')::numeric(14,3);
  v_unit_cost:=(v_line->>'unit_cost_usd')::numeric(14,4);
  IF v_quantity<=0 OR v_unit_cost<0 THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_LINE_INVALID' USING ERRCODE='22023'; END IF;
  INSERT INTO public.inventory_receipt_lines(organization_id,branch_id,warehouse_id,receipt_id,product_id,quantity,unit_cost_usd)
   VALUES(p_organization_id,p_branch_id,p_warehouse_id,v_receipt_id,v_product_id,v_quantity,v_unit_cost);
  INSERT INTO public.warehouse_inventory_movements(organization_id,branch_id,warehouse_id,product_id,movement_type,
   quantity_delta,unit_cost_usd,reason,reference_type,reference_id,actor_user_id)
   VALUES(p_organization_id,p_branch_id,p_warehouse_id,v_product_id,'purchase_receipt',v_quantity,v_unit_cost,
    pg_catalog.btrim(p_reason),'inventory_receipt',v_receipt_id,p_actor_user_id);
 END LOOP;
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
 VALUES(p_organization_id,p_actor_user_id,'inventory.receipt.created','inventory_receipt',v_receipt_id::text,
  pg_catalog.jsonb_build_object('branch_id',p_branch_id,'warehouse_id',p_warehouse_id,'reason',pg_catalog.btrim(p_reason),
   'line_count',pg_catalog.jsonb_array_length(p_lines),'idempotency_key',p_idempotency_key));
 RETURN QUERY SELECT v_receipt_id,false;
END;
$create_inventory_receipt$;
ALTER FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) TO microapp_runtime;
REVOKE ALL ON TABLE public.inventory_receipts,public.inventory_receipt_lines FROM PUBLIC,microapp_runtime;
GRANT SELECT ON TABLE public.inventory_receipts,public.inventory_receipt_lines TO microapp_runtime;
COMMENT ON TABLE public.inventory_receipts IS 'Immutable source document for inventory receipt movements.';
COMMENT ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) IS 'SECURITY DEFINER receipt transaction; validates tenant/branch scope, idempotency, ledger and audit atomically.';
COMMIT;
),
 request_payload jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(request_payload)='array'),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
 UNIQUE(organization_id,branch_id,warehouse_id,id),
 UNIQUE(organization_id,created_by,idempotency_key),
 FOREIGN KEY(organization_id,branch_id,warehouse_id)
  REFERENCES public.warehouses(organization_id,branch_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(organization_id,created_by)
  REFERENCES public.organization_members(organization_id,user_id) ON DELETE RESTRICT
);
CREATE INDEX inventory_receipts_warehouse_history_idx
 ON public.inventory_receipts(organization_id,branch_id,warehouse_id,created_at DESC,id DESC);

CREATE TABLE public.inventory_receipt_lines(
 organization_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 warehouse_id uuid NOT NULL,
 receipt_id uuid NOT NULL,
 product_id uuid NOT NULL,
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 unit_cost_usd numeric(14,4) NOT NULL CHECK(unit_cost_usd>=0),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
 PRIMARY KEY(organization_id,receipt_id,product_id),
 FOREIGN KEY(organization_id,branch_id,warehouse_id,receipt_id)
  REFERENCES public.inventory_receipts(organization_id,branch_id,warehouse_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(organization_id,product_id)
  REFERENCES public.products(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX inventory_receipt_lines_product_idx
 ON public.inventory_receipt_lines(organization_id,product_id,receipt_id);

CREATE OR REPLACE FUNCTION public.validate_inventory_movement_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $validate_inventory_movement_source$
DECLARE
  count_type text;
  count_status text;
  actor_role text;
  line_expected_on_hand numeric(14,3);
  line_expected_version bigint;
  current_on_hand numeric(14,3);
  current_balance_version bigint;
  sale_branch_id uuid;
  sale_warehouse_id uuid;
  sale_actor_id uuid;
  sale_status text;
  sale_quantity numeric(14,3);
  sale_unit_cost numeric(14,4);
  receipt_branch_id uuid;
  receipt_warehouse_id uuid;
  receipt_actor_id uuid;
  receipt_reason text;
  receipt_quantity numeric(14,3);
  receipt_unit_cost numeric(14,4);
BEGIN
  IF NEW.movement_type IN ('opening', 'count_adjustment') THEN
    IF NEW.count_id IS NULL
      OR NEW.reference_type IS NOT NULL
      OR NEW.reference_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'COUNT_MOVEMENT_MUST_REFERENCE_CONFIRMED_COUNT_ONLY'
        USING ERRCODE = '23514';
    END IF;

    -- A count can be confirmed while its branch is active and the branch
    -- deactivated later. Revalidate and stabilize branch state at movement
    -- time; NOWAIT preserves fail-closed behavior without reversing API locks.
    PERFORM 1
      FROM public.branches AS branch
     WHERE branch.organization_id = NEW.organization_id
       AND branch.id = NEW.branch_id
       AND branch.is_active = true
     FOR SHARE NOWAIT;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID'
        USING ERRCODE = '23514';
    END IF;

    SELECT c.count_type, c.status
      INTO count_type, count_status
      FROM public.inventory_counts AS c
     WHERE c.organization_id = NEW.organization_id
       AND c.branch_id = NEW.branch_id
       AND c.warehouse_id = NEW.warehouse_id
       AND c.id = NEW.count_id
     FOR SHARE;

    IF NOT FOUND OR count_status <> 'confirmed'
      OR (NEW.movement_type = 'opening' AND count_type <> 'opening')
      OR (NEW.movement_type = 'count_adjustment' AND count_type <> 'physical')
    THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_MATCHING_CONFIRMED_COUNT'
        USING ERRCODE = '23514';
    END IF;

    -- Revalidate the claimed actor at movement time. NOWAIT prevents a
    -- warehouse->membership lock inversion from deadlocking an API request
    -- that already holds branch scope before taking the warehouse mutex.
    SELECT member.role
      INTO actor_role
      FROM public.organizations AS org
      JOIN public.organization_members AS member
        ON member.organization_id = org.id
       AND member.user_id = NEW.actor_user_id
       AND member.is_active = true
       AND member.role IN ('owner', 'admin', 'inventory')
      JOIN public.app_users AS actor_user
        ON actor_user.id = member.user_id
       AND actor_user.is_active = true
     WHERE org.id = NEW.organization_id
       AND org.is_active = true
     FOR SHARE OF org, member, actor_user NOWAIT;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED'
        USING ERRCODE = '23514';
    END IF;

    IF actor_role = 'inventory' THEN
      PERFORM 1
        FROM public.branch_memberships AS membership
       WHERE membership.organization_id = NEW.organization_id
         AND membership.branch_id = NEW.branch_id
         AND membership.user_id = NEW.actor_user_id
         AND membership.is_active = true
       FOR SHARE NOWAIT;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    SELECT line.expected_on_hand_quantity, line.expected_balance_version
      INTO line_expected_on_hand, line_expected_version
      FROM public.inventory_count_lines AS line
     WHERE line.organization_id = NEW.organization_id
       AND line.count_id = NEW.count_id
       AND line.product_id = NEW.product_id
     FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.movement_type = 'opening' THEN
      IF EXISTS (
        SELECT 1 FROM public.inventory_balances AS balance
         WHERE balance.organization_id = NEW.organization_id
           AND balance.branch_id = NEW.branch_id
           AND balance.warehouse_id = NEW.warehouse_id
           AND balance.product_id = NEW.product_id
      ) THEN
        RAISE EXCEPTION 'INVENTORY_OPENING_MOVEMENT_REQUIRES_EMPTY_PRODUCT_BALANCE'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      current_on_hand := 0.000;
      current_balance_version := 0;
      SELECT balance.on_hand_quantity, balance.balance_version
        INTO current_on_hand, current_balance_version
        FROM public.inventory_balances AS balance
       WHERE balance.organization_id = NEW.organization_id
         AND balance.branch_id = NEW.branch_id
         AND balance.warehouse_id = NEW.warehouse_id
         AND balance.product_id = NEW.product_id
       FOR UPDATE;

      IF NOT FOUND THEN
        current_on_hand := 0.000;
        current_balance_version := 0;
      END IF;

      IF line_expected_on_hand IS DISTINCT FROM current_on_hand
        OR line_expected_version IS DISTINCT FROM current_balance_version
      THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_SNAPSHOT_STALE'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.movement_type = 'purchase_receipt' THEN
    IF NEW.count_id IS NOT NULL OR NEW.reference_type IS DISTINCT FROM 'inventory_receipt'
      OR NEW.reference_id IS NULL OR NEW.quantity_delta <= 0 THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_SOURCE_INVALID' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.branches b WHERE b.organization_id=NEW.organization_id
      AND b.id=NEW.branch_id AND b.is_active=true FOR SHARE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID' USING ERRCODE = '23514'; END IF;
    SELECT r.branch_id,r.warehouse_id,r.created_by,r.reason
      INTO receipt_branch_id,receipt_warehouse_id,receipt_actor_id,receipt_reason
      FROM public.inventory_receipts r
     WHERE r.organization_id=NEW.organization_id AND r.id=NEW.reference_id FOR SHARE;
    IF NOT FOUND OR receipt_branch_id IS DISTINCT FROM NEW.branch_id
      OR receipt_warehouse_id IS DISTINCT FROM NEW.warehouse_id
      OR receipt_actor_id IS DISTINCT FROM NEW.actor_user_id
      OR receipt_reason IS DISTINCT FROM NEW.reason THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_SOURCE_SCOPE_INVALID' USING ERRCODE = '23514';
    END IF;
    SELECT l.quantity,l.unit_cost_usd INTO receipt_quantity,receipt_unit_cost
      FROM public.inventory_receipt_lines l
     WHERE l.organization_id=NEW.organization_id AND l.receipt_id=NEW.reference_id
       AND l.product_id=NEW.product_id FOR SHARE;
    IF NOT FOUND OR NEW.quantity_delta IS DISTINCT FROM receipt_quantity
      OR NEW.unit_cost_usd IS DISTINCT FROM receipt_unit_cost THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_MUST_MATCH_RECEIPT_LINE' USING ERRCODE = '23514';
    END IF;
    SELECT m.role INTO actor_role
      FROM public.organizations o
      JOIN public.organization_members m ON m.organization_id=o.id
        AND m.user_id=NEW.actor_user_id AND m.is_active=true
        AND m.role IN ('owner','admin','inventory')
      JOIN public.app_users u ON u.id=m.user_id AND u.is_active=true
     WHERE o.id=NEW.organization_id AND o.is_active=true
     FOR SHARE OF o,m,u NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514'; END IF;
    IF actor_role='inventory' THEN
      PERFORM 1 FROM public.branch_memberships bm
       WHERE bm.organization_id=NEW.organization_id AND bm.branch_id=NEW.branch_id
         AND bm.user_id=NEW.actor_user_id AND bm.is_active=true FOR SHARE NOWAIT;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID' USING ERRCODE = '23514'; END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public.warehouse_inventory_movements m
      WHERE m.organization_id=NEW.organization_id AND m.movement_type='purchase_receipt'
        AND m.reference_type='inventory_receipt' AND m.reference_id=NEW.reference_id
        AND m.product_id=NEW.product_id) THEN
      RAISE EXCEPTION 'INVENTORY_RECEIPT_MOVEMENT_ALREADY_RECORDED' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.movement_type <> 'sale'
    OR NEW.count_id IS NOT NULL
    OR NEW.reference_type IS DISTINCT FROM 'sale'
    OR NEW.reference_id IS NULL
    OR NEW.quantity_delta >= 0
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_TYPE_NOT_AUTHORIZED'
      USING ERRCODE = '23514';
  END IF;

  SELECT s.branch_id, s.warehouse_id, s.created_by, s.status
    INTO sale_branch_id, sale_warehouse_id, sale_actor_id, sale_status
    FROM public.sales AS s
   WHERE s.organization_id = NEW.organization_id
     AND s.id = NEW.reference_id
   FOR UPDATE;

  IF NOT FOUND
    OR sale_status <> 'draft'
    OR sale_branch_id IS DISTINCT FROM NEW.branch_id
    OR sale_warehouse_id IS DISTINCT FROM NEW.warehouse_id
    OR sale_actor_id IS DISTINCT FROM NEW.actor_user_id
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_SOURCE_SCOPE_INVALID'
      USING ERRCODE = '23514';
  END IF;

  SELECT item.quantity, item.unit_cost_usd
    INTO sale_quantity, sale_unit_cost
    FROM public.sale_items AS item
   WHERE item.organization_id = NEW.organization_id
     AND item.sale_id = NEW.reference_id
     AND item.product_id = NEW.product_id
   FOR SHARE;

  IF NOT FOUND
    OR NEW.quantity_delta IS DISTINCT FROM -sale_quantity
    OR NEW.unit_cost_usd IS DISTINCT FROM sale_unit_cost
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_MUST_MATCH_SALE_LINE'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.warehouse_inventory_movements AS existing
     WHERE existing.organization_id = NEW.organization_id
       AND existing.movement_type = 'sale'
       AND existing.reference_type = 'sale'
       AND existing.reference_id = NEW.reference_id
       AND existing.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_ALREADY_RECORDED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_inventory_movement_source$;
ALTER FUNCTION public.validate_inventory_movement_source() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.validate_inventory_movement_source() FROM PUBLIC,microapp_runtime;

CREATE FUNCTION public.create_inventory_receipt(
 p_organization_id uuid,p_branch_id uuid,p_warehouse_id uuid,p_actor_user_id uuid,
 p_reason text,p_idempotency_key text,p_request_hash text,p_lines jsonb
) RETURNS TABLE(receipt_id uuid,replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $create_inventory_receipt$
DECLARE
 v_role text; v_receipt_id uuid; v_existing_hash text; v_line jsonb;
 v_product_id uuid; v_quantity numeric(14,3); v_unit_cost numeric(14,4);
BEGIN
 IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_warehouse_id IS NULL OR p_actor_user_id IS NULL
  OR p_reason IS NULL OR length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 500 OR p_reason ~ '[[:cntrl:]]'
  OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$'
  OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
  OR p_lines IS NULL OR pg_catalog.jsonb_typeof(p_lines)<>'array'
  OR pg_catalog.jsonb_array_length(p_lines) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_INPUT_INVALID' USING ERRCODE='22023';
 END IF;
 -- Global order: tenant/member -> branch/branch-member -> warehouse -> document/idempotency -> ledger.
 PERFORM 1 FROM public.organizations WHERE id=p_organization_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE='42501'; END IF;
 SELECT m.role INTO v_role FROM public.organization_members m
  JOIN public.app_users u ON u.id=m.user_id AND u.is_active
  WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id AND m.is_active
   AND m.role IN('owner','admin','inventory') FOR UPDATE OF m,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.branches WHERE organization_id=p_organization_id AND id=p_branch_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_BRANCH_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 IF v_role='inventory' THEN
  PERFORM 1 FROM public.branch_memberships WHERE organization_id=p_organization_id AND branch_id=p_branch_id
   AND user_id=p_actor_user_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_BRANCH_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.warehouses WHERE organization_id=p_organization_id AND branch_id=p_branch_id
  AND id=p_warehouse_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_WAREHOUSE_SCOPE_INVALID' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_lines) x(value)
  WHERE pg_catalog.jsonb_typeof(value)<>'object'
   OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(value))<>3
   OR NOT(value?'product_id' AND value?'quantity' AND value?'unit_cost_usd')
   OR COALESCE(value->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR COALESCE(value->>'quantity','') !~ '^(0|[1-9][0-9]{0,10})(\.[0-9]{1,3})?$'
   OR COALESCE(value->>'unit_cost_usd','') !~ '^(0|[1-9][0-9]{0,9})(\.[0-9]{1,4})?$') THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_LINE_INVALID' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM pg_catalog.jsonb_array_elements(p_lines))<>
    (SELECT count(DISTINCT(value->>'product_id')::uuid) FROM pg_catalog.jsonb_array_elements(p_lines) x(value)) THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_DUPLICATE_PRODUCT' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_lines) x(value)
  LEFT JOIN public.products p ON p.organization_id=p_organization_id AND p.id=(value->>'product_id')::uuid
  WHERE p.id IS NULL) THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_PRODUCT_OUT_OF_SCOPE' USING ERRCODE='23503';
 END IF;
 INSERT INTO public.inventory_receipts(organization_id,branch_id,warehouse_id,reason,idempotency_key,request_hash,created_by)
 VALUES(p_organization_id,p_branch_id,p_warehouse_id,pg_catalog.btrim(p_reason),p_idempotency_key,p_request_hash,p_actor_user_id)
 ON CONFLICT(organization_id,created_by,idempotency_key) DO NOTHING RETURNING id INTO v_receipt_id;
 IF v_receipt_id IS NULL THEN
  SELECT id,request_hash INTO v_receipt_id,v_existing_hash FROM public.inventory_receipts
   WHERE organization_id=p_organization_id AND created_by=p_actor_user_id AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_existing_hash IS DISTINCT FROM p_request_hash THEN
   RAISE EXCEPTION 'INVENTORY_RECEIPT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  RETURN QUERY SELECT v_receipt_id,true; RETURN;
 END IF;
 FOR v_line IN SELECT value FROM pg_catalog.jsonb_array_elements(p_lines) x(value) LOOP
  v_product_id:=(v_line->>'product_id')::uuid;
  v_quantity:=(v_line->>'quantity')::numeric(14,3);
  v_unit_cost:=(v_line->>'unit_cost_usd')::numeric(14,4);
  IF v_quantity<=0 OR v_unit_cost<0 THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_LINE_INVALID' USING ERRCODE='22023'; END IF;
  INSERT INTO public.inventory_receipt_lines(organization_id,branch_id,warehouse_id,receipt_id,product_id,quantity,unit_cost_usd)
   VALUES(p_organization_id,p_branch_id,p_warehouse_id,v_receipt_id,v_product_id,v_quantity,v_unit_cost);
  INSERT INTO public.warehouse_inventory_movements(organization_id,branch_id,warehouse_id,product_id,movement_type,
   quantity_delta,unit_cost_usd,reason,reference_type,reference_id,actor_user_id)
   VALUES(p_organization_id,p_branch_id,p_warehouse_id,v_product_id,'purchase_receipt',v_quantity,v_unit_cost,
    pg_catalog.btrim(p_reason),'inventory_receipt',v_receipt_id,p_actor_user_id);
 END LOOP;
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
 VALUES(p_organization_id,p_actor_user_id,'inventory.receipt.created','inventory_receipt',v_receipt_id::text,
  pg_catalog.jsonb_build_object('branch_id',p_branch_id,'warehouse_id',p_warehouse_id,'reason',pg_catalog.btrim(p_reason),
   'line_count',pg_catalog.jsonb_array_length(p_lines),'idempotency_key',p_idempotency_key));
 RETURN QUERY SELECT v_receipt_id,false;
END;
$create_inventory_receipt$;
ALTER FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) TO microapp_runtime;
REVOKE ALL ON TABLE public.inventory_receipts,public.inventory_receipt_lines FROM PUBLIC,microapp_runtime;
GRANT SELECT ON TABLE public.inventory_receipts,public.inventory_receipt_lines TO microapp_runtime;
COMMENT ON TABLE public.inventory_receipts IS 'Immutable source document for inventory receipt movements.';
COMMENT ON FUNCTION public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb) IS 'SECURITY DEFINER receipt transaction; validates tenant/branch scope, idempotency, ledger and audit atomically.';
COMMIT;
