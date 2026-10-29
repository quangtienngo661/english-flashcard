-- The old per-operation choice is history now (the gateway reads the live config): a model only an old choice names can be deleted (design §4).
ALTER TABLE "ai_operation_settings" DROP CONSTRAINT "ai_operation_settings_model_ref_fkey";
