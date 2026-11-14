-- Round C (design §5.5): one row per pre-made recording. key = sha256(voice name | text | phonemes), so the same words in the same voice share
-- one file; status moves pending -> ready | failed. The file itself lives in R2 at tts/v1/<key>.mp3.
CREATE TABLE speech_audio (
  key text PRIMARY KEY,
  voice text NOT NULL CHECK (voice IN ('uk', 'us')),
  voice_name text NOT NULL,
  text text NOT NULL,
  phonemes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  char_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz
);
CREATE INDEX speech_audio_status_updated_at_idx ON speech_audio (status, updated_at);
