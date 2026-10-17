-- D29: the CSV inflections cell has its own prefilter key (lemma, pos) hashed over the normalized cell.
ALTER TABLE "import_row_keys" DROP CONSTRAINT "import_row_keys_kind_check";
ALTER TABLE "import_row_keys" ADD CONSTRAINT "import_row_keys_kind_check" CHECK ("kind" IN ('level', 'content', 'inflection'));
