-- AlterTable
ALTER TABLE "entry_inflections" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;


-- D46: AGID 2016.01.19 is the library source of inflected forms; listed by GET /v1/sources (B2#64).
-- Full notices: THIRD_PARTY_NOTICES.md at the repository root.
INSERT INTO "data_sources" ("id", "kind", "name", "version", "url", "license", "attribution", "display_priority") VALUES
    ('00000000-0000-4000-8000-000000000002', 'third_party', 'AGID', '2016.01.19', 'http://wordlist.aspell.net',
     'Copyright 2000-2014 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell this database, the associated scripts, the output created from the scripts and its documentation for any purpose is hereby granted without fee, provided that the above copyright notice appears in all copies and that both that copyright notice and this permission notice appear in supporting documentation. Also under the WordNet 1.6 licence (Princeton University) and the UK Advanced Cryptics Dictionary notice; see THIRD_PARTY_NOTICES.md.',
     'Automatically Generated Inflection Database (AGID) by Kevin Atkinson; part-of-speech data from Alan Beale''s 2of12id and WordNet 1.6 (Copyright 1997 by Princeton University).',
     100);
