-- PostgreSQL 18 disposable harness. TEMP fixtures only; outer transaction rolls back.
BEGIN;
CREATE TEMP TABLE iar_movements (
 organization_id text NOT NULL, branch_id text NOT NULL, warehouse_id text NOT NULL,
 product_id text NOT NULL, movement_id text PRIMARY KEY, quantity_delta numeric(14,3) NOT NULL CHECK(quantity_delta<>0)
);
CREATE TEMP TABLE iar_balances (
 organization_id text NOT NULL, branch_id text NOT NULL, warehouse_id text NOT NULL,
 product_id text NOT NULL, on_hand_quantity numeric(14,3) NOT NULL, reserved_quantity numeric(14,3) NOT NULL,
 PRIMARY KEY(organization_id,branch_id,warehouse_id,product_id),
 CHECK(on_hand_quantity>=0 AND reserved_quantity>=0 AND reserved_quantity<=on_hand_quantity)
);
CREATE TEMP TABLE iar_sales(sale_id text PRIMARY KEY,subtotal_usd numeric(14,4) NOT NULL,total_usd numeric(14,4) NOT NULL);
CREATE TEMP TABLE iar_sale_lines(sale_id text,line_no int,quantity numeric(14,3),unit_price_usd numeric(14,4),line_total_usd numeric(14,4),PRIMARY KEY(sale_id,line_no));
CREATE TEMP TABLE iar_payments(sale_id text,payment_no int,currency text,amount numeric(14,4),PRIMARY KEY(sale_id,payment_no),CHECK(currency<>'VES' OR amount=round(amount,2)));

DO $$
BEGIN
 IF round(1.23445::numeric,4)<>1.2345 OR round(-1.23445::numeric,4)<>-1.2345 THEN RAISE EXCEPTION 'tie rounding mismatch'; END IF;
 IF round(1.23444::numeric,4)<>1.2344 THEN RAISE EXCEPTION 'below-tie rounding mismatch'; END IF;
 PERFORM 99999999999.999::numeric(14,3);
 PERFORM 9999999999.9999::numeric(14,4);
 PERFORM 99999999999999.99::numeric(16,2);
 PERFORM 9999999999.99999999::numeric(18,8);
 BEGIN PERFORM 100000000000.000::numeric(14,3); RAISE EXCEPTION 'NUMERIC(14,3) overflow not rejected'; EXCEPTION WHEN numeric_value_out_of_range THEN NULL; END;
 BEGIN PERFORM 10000000000.0000::numeric(14,4); RAISE EXCEPTION 'NUMERIC(14,4) overflow not rejected'; EXCEPTION WHEN numeric_value_out_of_range THEN NULL; END;
 BEGIN PERFORM 100000000000000.00::numeric(16,2); RAISE EXCEPTION 'NUMERIC(16,2) overflow not rejected'; EXCEPTION WHEN numeric_value_out_of_range THEN NULL; END;
 BEGIN PERFORM 10000000000.00000000::numeric(18,8); RAISE EXCEPTION 'NUMERIC(18,8) overflow not rejected'; EXCEPTION WHEN numeric_value_out_of_range THEN NULL; END;
END $$;

INSERT INTO iar_movements VALUES ('org-a','branch-a','wh-a','product-a','m-1',2.000),('org-a','branch-a','wh-a','product-a','m-2',-0.500);
INSERT INTO iar_balances VALUES ('org-a','branch-a','wh-a','product-a',1.500,0.250);
DO $$
DECLARE projected numeric(14,3);
BEGIN
 SELECT coalesce(sum(quantity_delta),0) INTO projected FROM iar_movements WHERE organization_id='org-a' AND branch_id='branch-a' AND warehouse_id='wh-a' AND product_id='product-a';
 IF projected<>(SELECT on_hand_quantity FROM iar_balances WHERE organization_id='org-a' AND branch_id='branch-a' AND warehouse_id='wh-a' AND product_id='product-a') THEN RAISE EXCEPTION 'baseline ledger mismatch'; END IF;
END $$;

-- Controlled stock mutation in a temporary copy.
UPDATE iar_movements SET quantity_delta=quantity_delta+0.001 WHERE movement_id='m-1';
DO $$ DECLARE projected numeric(14,3); BEGIN
 SELECT sum(quantity_delta) INTO projected FROM iar_movements;
 IF projected=1.500 THEN RAISE EXCEPTION 'stock mutant not detected'; END IF;
END $$;
UPDATE iar_movements SET quantity_delta=quantity_delta-0.001 WHERE movement_id='m-1';

-- Controlled tenant and branch scope mutations.
INSERT INTO iar_movements VALUES ('org-b','branch-a','wh-a','product-a','m-cross-tenant',0.100),('org-a','branch-b','wh-a','product-a','m-cross-branch',0.100);
DO $$ BEGIN
 IF (SELECT count(*) FROM iar_movements m LEFT JOIN iar_balances b
   ON (b.organization_id,b.branch_id,b.warehouse_id,b.product_id)=(m.organization_id,m.branch_id,m.warehouse_id,m.product_id)
   WHERE m.movement_id IN ('m-cross-tenant','m-cross-branch') AND b.organization_id IS NULL)<>2
 THEN RAISE EXCEPTION 'tenant/branch mutants not detected'; END IF;
END $$;

INSERT INTO iar_sales VALUES ('sale-a',29.8125,29.8125);
INSERT INTO iar_sale_lines VALUES ('sale-a',1,1.250,23.8500,29.8125);
INSERT INTO iar_payments VALUES ('sale-a',1,'USD',29.8125),('sale-a',2,'VES',12.34);
DO $$ DECLARE ls numeric(14,4); ps numeric(14,4); BEGIN
 SELECT sum(line_total_usd) INTO ls FROM iar_sale_lines WHERE sale_id='sale-a';
 SELECT sum(amount) INTO ps FROM iar_payments WHERE sale_id='sale-a' AND currency='USD';
 IF ls<>(SELECT subtotal_usd FROM iar_sales WHERE sale_id='sale-a') OR ls<>(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a') OR ps<>(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a')
 THEN RAISE EXCEPTION 'baseline sale/payment reconciliation failed'; END IF;
END $$;
UPDATE iar_payments SET amount=amount-0.0001 WHERE sale_id='sale-a' AND currency='USD';
DO $$ BEGIN
 IF (SELECT sum(amount) FROM iar_payments WHERE sale_id='sale-a' AND currency='USD')=(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a')
 THEN RAISE EXCEPTION 'payment mutant not detected'; END IF;
END $$;
DO $ves_check$
BEGIN
 BEGIN
  INSERT INTO iar_payments VALUES ('sale-ves',1,'VES',1.2345);
  RAISE EXCEPTION 'VES payment scale constraint not enforced';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END
$ves_check$;

-- Quantity-mode contract and controlled mutants. All fixtures are TEMP and rolled back.
CREATE TEMP TABLE iar_products (
  product_id text PRIMARY KEY, unit text NOT NULL, quantity_mode text NOT NULL
    CHECK (quantity_mode IN ('integer','fractional')),
  minimum_stock numeric(14,3) NOT NULL,
  CHECK (quantity_mode <> 'integer' OR minimum_stock=trunc(minimum_stock))
);
CREATE TEMP TABLE iar_quantity_balances (
  product_id text NOT NULL, on_hand numeric(14,3) NOT NULL, reserved numeric(14,3) NOT NULL
);
CREATE TEMP TABLE iar_sale_snapshots (
  product_id text NOT NULL, unit_snapshot text NOT NULL CHECK(length(btrim(unit_snapshot))>0),
  quantity_mode_snapshot text NOT NULL CHECK(quantity_mode_snapshot IN ('integer','fractional')),
  quantity numeric(14,3) NOT NULL CHECK(quantity>0),
  CHECK(quantity_mode_snapshot<>'integer' OR quantity=trunc(quantity))
);
CREATE TEMP TABLE iar_count_lines (
  product_id text NOT NULL, counted_quantity numeric(14,3) NOT NULL CHECK(counted_quantity>=0)
);
CREATE TEMP TABLE iar_receipt_lines (
  product_id text NOT NULL, quantity numeric(14,3) NOT NULL CHECK(quantity>0)
);
INSERT INTO iar_products VALUES ('integer-a','unidad','integer',0.000),('fractional-a','kg','fractional',0.000);

CREATE FUNCTION pg_temp.iar_guard_sale_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
 SELECT unit,quantity_mode INTO p FROM iar_products WHERE product_id=NEW.product_id;
 IF NOT FOUND OR NEW.unit_snapshot IS DISTINCT FROM p.unit
   OR NEW.quantity_mode_snapshot IS DISTINCT FROM p.quantity_mode THEN
   RAISE EXCEPTION 'sale quantity snapshot mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER iar_sale_snapshot_guard BEFORE INSERT ON iar_sale_snapshots
FOR EACH ROW EXECUTE FUNCTION pg_temp.iar_guard_sale_snapshot();

CREATE FUNCTION pg_temp.iar_guard_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode text;
BEGIN
 SELECT quantity_mode INTO mode FROM iar_products WHERE product_id=NEW.product_id;
 IF mode='integer' AND NEW.counted_quantity<>trunc(NEW.counted_quantity) THEN
   RAISE EXCEPTION 'integer count quantity must be whole' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER iar_count_guard BEFORE INSERT ON iar_count_lines
FOR EACH ROW EXECUTE FUNCTION pg_temp.iar_guard_count();

CREATE FUNCTION pg_temp.iar_guard_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode text;
BEGIN
 SELECT quantity_mode INTO mode FROM iar_products WHERE product_id=NEW.product_id;
 IF mode='integer' AND NEW.quantity<>trunc(NEW.quantity) THEN
   RAISE EXCEPTION 'integer receipt quantity must be whole' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER iar_receipt_guard BEFORE INSERT ON iar_receipt_lines
FOR EACH ROW EXECUTE FUNCTION pg_temp.iar_guard_receipt();

CREATE FUNCTION pg_temp.iar_guard_mode_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.quantity_mode='integer' AND OLD.quantity_mode='fractional'
    AND EXISTS(SELECT 1 FROM iar_quantity_balances b WHERE b.product_id=NEW.product_id
      AND (b.on_hand<>trunc(b.on_hand) OR b.reserved<>trunc(b.reserved))) THEN
   RAISE EXCEPTION 'fractional inventory balance blocks integer mode' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER iar_product_mode_guard BEFORE UPDATE OF quantity_mode ON iar_products
FOR EACH ROW EXECUTE FUNCTION pg_temp.iar_guard_mode_transition();

DO $quantity_mode_tests$
BEGIN
 BEGIN
   INSERT INTO iar_sale_snapshots VALUES ('integer-a','unidad','integer',0.500);
   RAISE EXCEPTION 'integer sale item accepted 0.500';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   INSERT INTO iar_count_lines VALUES ('integer-a',0.500);
   RAISE EXCEPTION 'integer count accepted 0.500';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   INSERT INTO iar_receipt_lines VALUES ('integer-a',0.500);
   RAISE EXCEPTION 'integer receipt accepted 0.500';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO iar_sale_snapshots VALUES ('fractional-a','kg','fractional',1.250);
 BEGIN
   INSERT INTO iar_sale_snapshots VALUES ('fractional-a','unidad','fractional',1.250);
   RAISE EXCEPTION 'false unit_snapshot accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO iar_count_lines VALUES ('fractional-a',1.250);
 INSERT INTO iar_receipt_lines VALUES ('fractional-a',1.250);
 INSERT INTO iar_quantity_balances VALUES ('fractional-a',1.500,0.000);
 BEGIN
   UPDATE iar_products SET quantity_mode='integer' WHERE product_id='fractional-a';
   RAISE EXCEPTION 'fractional balance transition accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT quantity_mode FROM iar_products WHERE product_id='fractional-a')<>'fractional' THEN
   RAISE EXCEPTION 'failed integer transition changed the product';
 END IF;
END
$quantity_mode_tests$;

ROLLBACK;
