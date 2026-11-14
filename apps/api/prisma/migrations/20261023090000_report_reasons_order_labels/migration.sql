-- Data only (learner UI round, design §8.4): "Khác" last, shorter English labels. Each statement changes a row only while no admin
-- has edited it (updated_by IS NULL) and the value is still the Bước 7 seed (GD2); stored report labels never change (GD3).
UPDATE "practice_report_reasons" SET "position" = 1000 WHERE "code" = 'other' AND "updated_by" IS NULL AND "position" = 4;
UPDATE "practice_report_reasons" SET "label_en" = 'Wrong meaning' WHERE "code" = 'meaning_wrong' AND "updated_by" IS NULL AND "label_en" = 'The meaning is wrong';
UPDATE "practice_report_reasons" SET "label_en" = 'Right answer marked wrong' WHERE "code" = 'graded_wrong' AND "updated_by" IS NULL AND "label_en" = 'My right answer was marked wrong';
UPDATE "practice_report_reasons" SET "label_en" = 'Wrong hint' WHERE "code" = 'hint_wrong' AND "updated_by" IS NULL AND "label_en" = 'The hint is wrong';
UPDATE "practice_report_reasons" SET "label_en" = 'Ungrammatical or unnatural' WHERE "code" = 'ai_sentence_unnatural' AND "updated_by" IS NULL AND "label_en" = 'The sentence is ungrammatical or unnatural';
UPDATE "practice_report_reasons" SET "label_en" = 'More than one right answer' WHERE "code" = 'ai_more_than_one_answer' AND "updated_by" IS NULL AND "label_en" = 'More than one answer is right';
UPDATE "practice_report_reasons" SET "label_en" = 'Wrong meaning of the word' WHERE "code" = 'ai_wrong_meaning' AND "updated_by" IS NULL AND "label_en" = 'The sentence uses the wrong meaning of the word';
