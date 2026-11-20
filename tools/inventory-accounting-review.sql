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
CREATE TEMP TABLE iar_payments(sale_id text,payment_no int,amount_usd numeric(14,4),PRIMARY KEY(sale_id,payment_no));

DO $$
BEGIN
 IF round(1.23445::numeric,4)<>1.2345 OR round(-1.23445::numeric,4)<>-1.2345 THEN RAISE EXCEPTION 'tie rounding mismatch'; END IF;
 IF round(1.23444::numeric,4)<>1.2344 THEN RAISE EXCEPTION 'below-tie rounding mismatch'; END IF;
 BEGIN
  PERFORM 100000000000.000::numeric(14,3);
  RAISE EXCEPTION 'NUMERIC(14,3) overflow not rejected';
 EXCEPTION WHEN numeric_value_out_of_range THEN NULL;
 END;
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
INSERT INTO iar_payments VALUES ('sale-a',1,29.8125);
DO $$ DECLARE ls numeric(14,4); ps numeric(14,4); BEGIN
 SELECT sum(line_total_usd) INTO ls FROM iar_sale_lines WHERE sale_id='sale-a';
 SELECT sum(amount_usd) INTO ps FROM iar_payments WHERE sale_id='sale-a';
 IF ls<>(SELECT subtotal_usd FROM iar_sales WHERE sale_id='sale-a') OR ls<>(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a') OR ps<>(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a')
 THEN RAISE EXCEPTION 'baseline sale/payment reconciliation failed'; END IF;
END $$;
UPDATE iar_payments SET amount_usd=amount_usd-0.0001 WHERE sale_id='sale-a';
DO $$ BEGIN
 IF (SELECT sum(amount_usd) FROM iar_payments WHERE sale_id='sale-a')=(SELECT total_usd FROM iar_sales WHERE sale_id='sale-a')
 THEN RAISE EXCEPTION 'payment mutant not detected'; END IF;
END $$;
ROLLBACK;
