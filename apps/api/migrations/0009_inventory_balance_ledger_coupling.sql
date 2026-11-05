BEGIN;
CREATE TABLE public.inventory_balance_ledger_intents (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON TABLE public.inventory_balance_ledger_intents FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.inventory_balance_ledger_intents_event_id_seq FROM PUBLIC;
CREATE FUNCTION public.record_inventory_balance_ledger_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE previous_quantity numeric(14,3); delta_quantity numeric(14,3);
BEGIN
  IF TG_OP = 'INSERT' THEN previous_quantity := 0; ELSE previous_quantity := OLD.on_hand_quantity; END IF;
  delta_quantity := NEW.on_hand_quantity - previous_quantity;
  IF delta_quantity <> 0 THEN
    INSERT INTO public.inventory_balance_ledger_intents
      (transaction_id, organization_id, branch_id, warehouse_id, product_id, quantity_delta)
    VALUES (txid_current(), NEW.organization_id, NEW.branch_id, NEW.warehouse_id, NEW.product_id, delta_quantity);
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.consume_inventory_balance_ledger_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE matching_event_id bigint;
BEGIN
  SELECT event_id INTO matching_event_id FROM public.inventory_balance_ledger_intents
   WHERE transaction_id = txid_current() AND organization_id = NEW.organization_id
     AND branch_id = NEW.branch_id AND warehouse_id = NEW.warehouse_id
     AND product_id = NEW.product_id AND quantity_delta = NEW.quantity_delta AND consumed = false
   ORDER BY event_id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_MATCHING_BALANCE_CHANGE' USING ERRCODE = '23514';
  END IF;
  UPDATE public.inventory_balance_ledger_intents SET consumed = true WHERE event_id = matching_event_id;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.assert_inventory_balance_ledger_intent_consumed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE intent_consumed boolean;
BEGIN
  SELECT consumed INTO intent_consumed FROM public.inventory_balance_ledger_intents
   WHERE event_id = NEW.event_id FOR UPDATE;
  IF NOT FOUND OR intent_consumed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_CHANGE_REQUIRES_MATCHING_LEDGER_MOVEMENT' USING ERRCODE = '23514';
  END IF;
  DELETE FROM public.inventory_balance_ledger_intents WHERE event_id = NEW.event_id;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.record_inventory_balance_ledger_intent() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_inventory_balance_ledger_intent() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_inventory_balance_ledger_intent_consumed() FROM PUBLIC;
REVOKE TRUNCATE ON TABLE public.inventory_balances, public.warehouse_inventory_movements FROM PUBLIC;

CREATE FUNCTION public.prevent_inventory_ledger_truncate()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'INVENTORY_LEDGER_TRUNCATE_FORBIDDEN' USING ERRCODE = '23514';
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_inventory_ledger_truncate() FROM PUBLIC;

CREATE TRIGGER inventory_balances_no_truncate
BEFORE TRUNCATE ON public.inventory_balances
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_inventory_ledger_truncate();
CREATE TRIGGER warehouse_inventory_movements_no_truncate
BEFORE TRUNCATE ON public.warehouse_inventory_movements
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_inventory_ledger_truncate();

CREATE FUNCTION public.prevent_inventory_balance_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog
AS $prevent_inventory_balance_identity_change$
BEGIN
  IF ROW(NEW.organization_id, NEW.branch_id, NEW.warehouse_id, NEW.product_id)
      IS DISTINCT FROM ROW(OLD.organization_id, OLD.branch_id, OLD.warehouse_id, OLD.product_id) THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_IDENTITY_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;\nEND;\n$prevent_inventory_balance_identity_change$;\nREVOKE ALL ON FUNCTION public.prevent_inventory_balance_identity_change() FROM PUBLIC;

CREATE TRIGGER inventory_balances_identity_immutable
BEFORE UPDATE OF organization_id, branch_id, warehouse_id, product_id ON public.inventory_balances
FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_balance_identity_change();

CREATE TRIGGER inventory_balances_ledger_intent
AFTER INSERT OR UPDATE ON public.inventory_balances
FOR EACH ROW EXECUTE FUNCTION public.record_inventory_balance_ledger_intent();
CREATE TRIGGER warehouse_inventory_movements_require_balance_intent
BEFORE INSERT ON public.warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.consume_inventory_balance_ledger_intent();
CREATE CONSTRAINT TRIGGER inventory_balance_ledger_intent_complete
AFTER INSERT ON public.inventory_balance_ledger_intents
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_inventory_balance_ledger_intent_consumed();
COMMENT ON TABLE public.inventory_balance_ledger_intents IS
  'Private transaction-scoped pairing intents. Every non-zero on-hand change must consume exactly one matching append-only ledger movement before commit.';
COMMENT ON FUNCTION public.prevent_inventory_balance_identity_change() IS
  'Prevents re-keying a balance row; inventory relocation must use explicit paired ledger movements.';
COMMENT ON FUNCTION public.record_inventory_balance_ledger_intent() IS
  'Records a private same-transaction intent for every non-zero on-hand balance change.';
COMMENT ON FUNCTION public.consume_inventory_balance_ledger_intent() IS
  'Requires each ledger movement to consume one exact same-transaction balance change intent.';
COMMENT ON FUNCTION public.assert_inventory_balance_ledger_intent_consumed() IS
  'Deferred commit-time assertion that no non-zero on-hand change was committed without its matching ledger movement.';
COMMIT;