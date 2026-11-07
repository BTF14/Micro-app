-- Read-only canonical description of the public application schema.
-- One sortable text line per catalog fact. Owners, ACLs, OIDs and row data are
-- deliberately excluded: baseline adoption compares structure, not ownership.
-- PostgreSQL 18 NOT NULL pseudo-constraints (contype 'n') are excluded so the
-- output is stable across 16-18; nullability is already part of the column line.
SELECT line FROM (
  SELECT 'column|' || c.relname || '|' || a.attname || '|' ||
         pg_catalog.format_type(a.atttypid, a.atttypmod) || '|notnull=' || a.attnotnull::text ||
         '|default=' || COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '') ||
         '|generated=' || a.attgenerated::text || '|identity=' || a.attidentity::text AS line
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
   WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v','m','f')
     AND c.relname <> 'schema_migrations'
  UNION ALL
  SELECT 'relation|' || c.relname || '|kind=' || c.relkind::text || '|rls=' || c.relrowsecurity::text || '|forcerls=' || c.relforcerowsecurity::text
    FROM pg_catalog.pg_class c
   WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v','m','S','f')
     AND c.relname <> 'schema_migrations'
  UNION ALL
  SELECT 'constraint|' || c.relname || '|' || k.conname || '|' || k.contype::text || '|' || pg_catalog.pg_get_constraintdef(k.oid)
    FROM pg_catalog.pg_constraint k
    JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
   WHERE c.relnamespace = 'public'::regnamespace AND k.contype <> 'n'
     AND c.relname <> 'schema_migrations'
  UNION ALL
  SELECT 'index|' || tablename || '|' || indexname || '|' || replace(indexdef, 'public.', '')
    FROM pg_catalog.pg_indexes
   WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
  UNION ALL
  SELECT 'trigger|' || c.relname || '|' || t.tgname || '|' || replace(pg_catalog.pg_get_triggerdef(t.oid), 'public.', '')
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
   WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
     AND c.relname <> 'schema_migrations'
  UNION ALL
  SELECT 'function|' || p.proname || '|' || pg_catalog.pg_get_function_identity_arguments(p.oid) ||
         '|secdef=' || p.prosecdef::text || '|md5=' || pg_catalog.md5(p.prosrc)
    FROM pg_catalog.pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'type|' || t.typname || '|' || t.typtype::text || '|' ||
         COALESCE((SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
                     FROM pg_catalog.pg_enum e WHERE e.enumtypid = t.oid), '')
    FROM pg_catalog.pg_type t
   WHERE t.typnamespace = 'public'::regnamespace AND t.typtype IN ('e','d')
  UNION ALL
  SELECT 'extension|' || extname FROM pg_catalog.pg_extension WHERE extname <> 'plpgsql'
) f ORDER BY line COLLATE "C";
