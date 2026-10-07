-- prisma/sql/tryAdvisoryLock.sql
-- @param {String} $1:key
-- @param {String} $2:userId
-- @param {String} $3:endpoint
SELECT pg_try_advisory_xact_lock(hashtext($1 || ':' || $2 || ':' || $3)::bigint) AS locked
