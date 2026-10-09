CREATE TABLE waitlist (
  email      TEXT PRIMARY KEY,
  locale     TEXT NOT NULL CHECK (locale IN ('vi', 'en')),
  created_at TEXT NOT NULL
);
