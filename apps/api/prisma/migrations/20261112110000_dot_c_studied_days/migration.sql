-- Round C (design §4.3, DC28): a day counts toward the study streak only when the learner studied (flipped a card, gave a final
-- answer in a session, or pressed a review button), not when they only added or removed words. Days before this column existed
-- are counted as studied: nobody real used the app yet.
ALTER TABLE learning_activity_days ADD COLUMN studied boolean NOT NULL DEFAULT false;
UPDATE learning_activity_days SET studied = true;
