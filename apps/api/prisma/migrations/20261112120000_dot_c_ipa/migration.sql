-- Round C (design §5): UK and US transcription per sense revision, so it goes through draft, review and publish like the rest of the content.
-- ipa_source_id says which data source it came from (null = typed by hand); ipa_custom is the learner's own note on a private word.
ALTER TABLE sense_revisions
  ADD COLUMN ipa_uk varchar(100),
  ADD COLUMN ipa_us varchar(100),
  ADD COLUMN ipa_source_id uuid REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN ipa_custom varchar(100);
