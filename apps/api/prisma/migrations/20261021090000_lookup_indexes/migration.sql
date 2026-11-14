CREATE INDEX "senses_entry_id_idx" ON "senses"("entry_id");
CREATE INDEX entries_catalog_lower_lemma_idx ON entries (lower(lemma)) WHERE scope = 'catalog';
CREATE INDEX entries_private_owner_lower_lemma_idx ON entries (owner_user_id, lower(lemma)) WHERE scope = 'private';
CREATE INDEX entry_variants_lower_text_idx ON entry_variants (lower(text));
