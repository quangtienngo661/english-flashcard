-- The results of a run now live in ai_eval_run_items (20261030090000_nhom_b_m1_golden_set moved them); the Json columns are no longer read or written.
ALTER TABLE ai_eval_runs DROP COLUMN items, DROP COLUMN example_ids;
