CREATE TABLE "idempotency_keys" (
	"key" text,
	"user_id" uuid,
	"endpoint" text,
	"status" text,
	"payload_hash" text,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "idempotency_keys_key_user_id_endpoint_unique" UNIQUE("key","user_id","endpoint")
);
