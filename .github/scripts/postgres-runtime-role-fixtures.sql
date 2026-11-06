-- Disposable fixture rows for the actual microapp_runtime LOGIN smoke test.
INSERT INTO public.organizations (id,name,slug)
VALUES ('11111111-1111-4111-8111-111111111111','Runtime Role Fixture','runtime-role-fixture');
INSERT INTO public.app_users (id,email,display_name)
VALUES ('22222222-2222-4222-8222-222222222222','runtime-fixture@example.invalid','Runtime Role Fixture');
INSERT INTO public.organization_members (organization_id,user_id,role)
VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','cashier');
INSERT INTO public.branches (id,organization_id,name,slug)
VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Runtime Branch','runtime-branch');
INSERT INTO public.warehouses (id,organization_id,branch_id,code,name)
VALUES ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','main','Runtime Warehouse');
INSERT INTO public.auth_allowlist (email,added_by,note)
VALUES ('runtime-fixture@example.invalid','ci-runtime-harness','disposable');

INSERT INTO public.branch_memberships (organization_id,branch_id,user_id)
VALUES ('11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222');
INSERT INTO public.registers (id,organization_id,branch_id,name,code)
VALUES ('44444444-4444-4444-8444-444444444444',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        'Runtime Register','runtime-register');
INSERT INTO public.register_shifts
  (organization_id,branch_id,register_id,cashier_user_id,opening_cash_usd,opening_cash_ves)
VALUES ('11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
        '22222222-2222-4222-8222-222222222222',0,0);
