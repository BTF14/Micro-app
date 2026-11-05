-- Run after 0014_sales_without_discounts.sql against disposable PostgreSQL.
BEGIN;

DO $no_discount_contract_assertions$
DECLARE
  organization_id uuid;
  user_id uuid;
  rate_id uuid;
  sale_id uuid;
  product_id uuid;
  stored_price text;
  stored_quantity text;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute
     WHERE attrelid = 'public.sales'::regclass
       AND attname = 'discount_usd'
       AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'SALES_DISCOUNT_COLUMN_MUST_NOT_EXIST';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint
     WHERE conrelid = 'public.sales'::regclass
       AND conname = 'sales_total_equals_subtotal'
       AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%total_usd = subtotal_usd%'
  ) THEN
    RAISE EXCEPTION 'SALES_TOTAL_MUST_EQUAL_SUBTOTAL';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES ('No Discounts Assertion', 'no-discounts-assertion')
  RETURNING id INTO organization_id;

  INSERT INTO public.app_users (email, display_name)
  VALUES ('no-discounts-assertion@example.invalid', 'No Discounts Assertion')
  RETURNING id INTO user_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (organization_id, user_id, 'owner');

  INSERT INTO public.exchange_rates (rate, source, effective_date)
  VALUES (250.12345678, 'no-discounts-assertion', CURRENT_DATE)
  RETURNING id INTO rate_id;

  INSERT INTO public.products (
    organization_id, sku, name, price_usd, stock_quantity
  ) VALUES (
    organization_id, 'DECIMAL-2385', 'Decimal Price Assertion', 23.85, 1.250
  ) RETURNING id INTO product_id;

  SELECT price_usd::text INTO stored_price
    FROM public.products WHERE id = product_id;
  SELECT stock_quantity::text INTO stored_quantity
    FROM public.products WHERE id = product_id;

  IF stored_price <> '23.8500' OR stored_quantity <> '1.250' THEN
    RAISE EXCEPTION 'DECIMAL_PRICE_OR_FRACTIONAL_QUANTITY_NOT_PRESERVED';
  END IF;

  INSERT INTO public.sales (
    organization_id, idempotency_key, status, subtotal_usd, total_usd,
    exchange_rate_id, exchange_rate_snapshot, total_ves_snapshot,
    created_by, completed_at
  ) VALUES (
    organization_id, 'no-discount-valid-sale', 'completed', 23.85, 23.85,
    rate_id, 250.12345678, 5965.45, user_id, now()
  ) RETURNING id INTO sale_id;

  BEGIN
    INSERT INTO public.sales (
      organization_id, idempotency_key, subtotal_usd, total_usd, created_by
    ) VALUES (
      organization_id, 'discounted-sale-must-fail', 23.85, 22.85, user_id
    );
    RAISE EXCEPTION 'FAIL: sales accepted total_usd different from subtotal_usd';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$no_discount_contract_assertions$;

ROLLBACK;
