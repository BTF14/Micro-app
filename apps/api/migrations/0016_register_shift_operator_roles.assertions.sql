DO $register_shift_operator_role_assertions$
DECLARE
  opening_definition text;
  scope_definition text;
  opening_owner name;
  scope_owner name;
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.validate_register_shift_opening()'::regprocedure),
         r.rolname
    INTO opening_definition, opening_owner
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
   WHERE p.oid = 'public.validate_register_shift_opening()'::regprocedure;

  SELECT pg_catalog.pg_get_functiondef('public.prevent_scope_deactivation_with_open_register_shift()'::regprocedure),
         r.rolname
    INTO scope_definition, scope_owner
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
   WHERE p.oid = 'public.prevent_scope_deactivation_with_open_register_shift()'::regprocedure;

  IF (pg_catalog.strpos(opening_definition, 'owner') = 0 OR pg_catalog.strpos(opening_definition, 'admin') = 0 OR pg_catalog.strpos(opening_definition, 'cashier') = 0) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPENING_ROLE_MATRIX_NOT_ALIGNED';
  END IF;
  IF (pg_catalog.strpos(scope_definition, 'owner') = 0 OR pg_catalog.strpos(scope_definition, 'admin') = 0 OR pg_catalog.strpos(scope_definition, 'cashier') = 0) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPEN_SCOPE_ROLE_GUARD_NOT_ALIGNED';
  END IF;
  IF opening_owner <> 'microapp_migrator' OR scope_owner <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_ROLE_FUNCTION_OWNERSHIP_INVALID';
  END IF;
END;
$register_shift_operator_role_assertions$;
