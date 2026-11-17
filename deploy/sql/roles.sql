-- Splits the database login in three (restore-safety design §3.3): the bootstrap superuser stays for ops, the migrator owns the
-- schema and runs migrations, the app role reads and writes rows only. Run it through deploy/scripts/db-roles.sh, which passes
--   :db       database name (POSTGRES_DB)
--   :mig_pw   password of wordmet_migrator (MIGRATOR_DB_PASSWORD)
--   :app_pw   password of wordmet_app (APP_DB_PASSWORD)
-- as psql variables and connects as the superuser to that database. Idempotent: safe to run again after every restore and
-- whenever a password in .env changes. The last line must read `left over: 0`.
\set ON_ERROR_STOP on
SELECT format('CREATE ROLE wordmet_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION PASSWORD %L', :'mig_pw')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wordmet_migrator') \gexec
SELECT format('CREATE ROLE wordmet_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION PASSWORD %L', :'app_pw')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wordmet_app') \gexec
-- The roles may already exist (a second run): keep their passwords equal to the ones in .env.
ALTER ROLE wordmet_migrator PASSWORD :'mig_pw';
ALTER ROLE wordmet_app PASSWORD :'app_pw';

BEGIN;
-- Hand every app object in schema public to the migrator (REASSIGN OWNED fails: the bootstrap superuser owns the system catalogs).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
             AND pg_get_userbyid(c.relowner) <> 'wordmet_migrator' LOOP
    EXECUTE format(CASE r.relkind WHEN 'v' THEN 'ALTER VIEW %I OWNER TO wordmet_migrator'
                                  WHEN 'm' THEN 'ALTER MATERIALIZED VIEW %I OWNER TO wordmet_migrator'
                                  ELSE 'ALTER TABLE %I OWNER TO wordmet_migrator' END, r.relname);
  END LOOP;
  -- Sequences not owned by a column (owned ones follow their table).
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'S' AND pg_get_userbyid(c.relowner) <> 'wordmet_migrator'
             AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a','i')) LOOP
    EXECUTE format('ALTER SEQUENCE %I OWNER TO wordmet_migrator', r.relname);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype IN ('e','d','c') AND t.typrelid = 0
             AND pg_get_userbyid(t.typowner) <> 'wordmet_migrator' LOOP
    EXECUTE format('ALTER TYPE %I OWNER TO wordmet_migrator', r.typname);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig, p.prokind FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND pg_get_userbyid(p.proowner) <> 'wordmet_migrator' LOOP
    EXECUTE format(CASE r.prokind WHEN 'p' THEN 'ALTER PROCEDURE %s OWNER TO wordmet_migrator'
                                  ELSE 'ALTER FUNCTION %s OWNER TO wordmet_migrator' END, r.sig);
  END LOOP;
END $$;

GRANT CONNECT, TEMPORARY ON DATABASE :"db" TO wordmet_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO wordmet_migrator;
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO wordmet_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO wordmet_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wordmet_app;
-- Prisma's own bookkeeping table: only the migrator touches it. A fresh database has none until the first migration; then the
-- default privileges below would hand it to the app role, so run this script again after the first `migrate deploy`.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM wordmet_app;
  END IF;
END $$;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO wordmet_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wordmet_app;

-- Objects later migrations create (as wordmet_migrator) get the same grants.
ALTER DEFAULT PRIVILEGES FOR ROLE wordmet_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wordmet_app;
ALTER DEFAULT PRIVILEGES FOR ROLE wordmet_migrator IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO wordmet_app;
ALTER DEFAULT PRIVILEGES FOR ROLE wordmet_migrator IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO wordmet_app;
COMMIT;

-- Report: anything in public still not owned by the migrator must be empty.
SELECT 'left over: ' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND pg_get_userbyid(c.relowner) <> 'wordmet_migrator';
