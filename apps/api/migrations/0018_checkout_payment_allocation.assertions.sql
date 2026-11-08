BEGIN;
DO $checkout_payment_allocation_assertions$
DECLARE
  function_oid oid;
  function_definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid='public.payments'::regclass
       AND attname='allocation_position'
       AND atttypid='smallint'::regtype
       AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_POSITION_COLUMN_MISSING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.payments'::regclass AND conname='payments_allocation_position_ck'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
     WHERE oid='public.payments_checkout_allocation_position_uidx'::regclass AND relkind='i'
  ) THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_POSITION_CONSTRAINTS_MISSING';
  END IF;
  SELECT oid INTO function_oid
    FROM pg_catalog.pg_proc
   WHERE oid='public.assert_completed_sale_payment_allocation()'::regprocedure
     AND prosecdef=true
     AND proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator');
  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_FUNCTION_SECURITY_CONTRACT_INVALID';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(function_oid) INTO function_definition;
  IF pg_catalog.strpos(function_definition,'allocation_position')=0
    OR pg_catalog.strpos(function_definition,'prior_expected_usd')=0
    OR pg_catalog.strpos(function_definition,'pg_catalog.trunc')=0
  THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_FUNCTION_DEFINITION_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(
      COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=function_oid),
               pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=function_oid)))
    ) acl
    WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
  ) OR pg_catalog.has_function_privilege('microapp_runtime',function_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_FUNCTION_MUST_NOT_BE_PUBLIC_OR_RUNTIME_EXECUTABLE';
  END IF;
  IF NOT pg_catalog.has_column_privilege('microapp_runtime','public.payments','allocation_position','INSERT')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.payments','allocation_position','UPDATE')
  THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_RUNTIME_COLUMN_GRANTS_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
     WHERE tgname='sales_payment_allocation_reconciled'
       AND tgdeferrable=true AND tginitdeferred=true AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
     WHERE tgname='payments_payment_allocation_reconciled'
       AND tgdeferrable=true AND tginitdeferred=true AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_DEFERRED_TRIGGERS_MISSING';
  END IF;
END;
$checkout_payment_allocation_assertions$;
ROLLBACK;
