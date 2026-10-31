-- The switch-over (nhóm B design §6.1): each operation's current prompt and current choice become one published config, and the live pointer names it.
-- number = the prompt's current revision, so `ai_calls.prompt_revision` and `meta.prompt_revision` keep their numbers; nothing a learner sees changes.
-- An operation that has no model yet keeps none. `ai_prompts`, `ai_prompt_revisions` and `ai_operation_settings` stay as history; the gateway stops reading them.
INSERT INTO ai_configs (operation, number, version, instructions, examples, model_ref, effort, thinking, max_output_tokens, status,
                        created_by, created_at, published_by, published_at)
SELECT p.operation, p.revision, 0, p.instructions, p.examples, s.model_ref, s.effort, s.thinking, s.max_output_tokens, 'published',
       p.updated_by, p.updated_at, COALESCE(s.updated_by, p.updated_by), GREATEST(p.updated_at, s.updated_at)
FROM ai_prompts p JOIN ai_operation_settings s ON s.operation = p.operation;

INSERT INTO ai_live_configs (operation, config_id, previous_config_id, version, last_number)
SELECT c.operation, c.id, NULL, 0, c.number FROM ai_configs c WHERE c.status = 'published';
