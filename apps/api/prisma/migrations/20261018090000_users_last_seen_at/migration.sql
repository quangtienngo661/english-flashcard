-- Last time the user was seen (login or session refresh); kept on the user so it survives session cleanup (M6).
ALTER TABLE "users" ADD COLUMN "last_seen_at" TIMESTAMPTZ;

UPDATE "users" u SET "last_seen_at" = c."last_used_at"
FROM (SELECT "user_id", MAX("last_used_at") AS "last_used_at" FROM "session_chains" GROUP BY "user_id") c
WHERE c."user_id" = u."id";
