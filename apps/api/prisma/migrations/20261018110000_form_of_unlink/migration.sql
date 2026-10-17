-- CreateIndex
CREATE INDEX "sense_revisions_form_of_entry_id_idx" ON "sense_revisions"("form_of_entry_id");

-- L7: when a base entry is deleted (a private word removed, an import reverted), the FK sets form_of_entry_id to NULL;
-- this trigger clears form_kind with it, so no revision keeps a kind without a base.
CREATE FUNCTION clear_form_kind_of_deleted_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE sense_revisions SET form_kind = NULL WHERE form_of_entry_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER entries_clear_form_kind BEFORE DELETE ON entries
  FOR EACH ROW EXECUTE FUNCTION clear_form_kind_of_deleted_entry();
