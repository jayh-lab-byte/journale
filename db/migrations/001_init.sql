CREATE TABLE IF NOT EXISTS journeys (
  id uuid PRIMARY KEY,
  owner_key_hash text NOT NULL,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  cover_photo_id uuid,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journeys_owner_idx ON journeys (owner_key_hash);

CREATE TABLE IF NOT EXISTS days (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  date date,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS days_journey_idx ON days (journey_id);

CREATE TABLE IF NOT EXISTS moments (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES days (id) ON DELETE CASCADE,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  latitude double precision,
  longitude double precision,
  location_confidence text,
  story text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moments_journey_idx ON moments (journey_id);
CREATE INDEX IF NOT EXISTS moments_day_idx ON moments (day_id);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  moment_id uuid REFERENCES moments (id) ON DELETE SET NULL,
  blob_url text NOT NULL,
  filename text,
  taken_at timestamptz,
  latitude double precision,
  longitude double precision,
  width integer,
  height integer,
  vision_description text,
  is_representative boolean NOT NULL DEFAULT false,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_journey_idx ON photos (journey_id);
CREATE INDEX IF NOT EXISTS photos_moment_idx ON photos (moment_id);

CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  name text,
  latitude double precision,
  longitude double precision,
  confidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS places_journey_idx ON places (journey_id);

CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY,
  moment_id uuid NOT NULL REFERENCES moments (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_moment_idx ON memories (moment_id);

CREATE TABLE IF NOT EXISTS journey_shares (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  share_token_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journey_shares_journey_idx ON journey_shares (journey_id);
