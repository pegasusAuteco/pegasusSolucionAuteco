-- MotorConnect — Schema: Workshop (motorcycles & parts)
-- Run in: Supabase SQL Editor
-- Requires: set_updated_at() function defined in schema_usuarios.sql (run that first)

-- ----------------------------------------------------------------
-- Enum: repair status
-- ----------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE repairstatus AS ENUM ('pending', 'finished');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------
-- Table: motorcycles
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motorcycles (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name     VARCHAR(150)  NOT NULL,
    client_id       VARCHAR(50)   NOT NULL,
    email           VARCHAR(255),
    model           VARCHAR(100)  NOT NULL,
    -- UNIQUE constraint guarantees one active entry per plate at the DB level
    plate           VARCHAR(10)   NOT NULL UNIQUE,
    mileage         INTEGER       NOT NULL,
    entry_date      DATE          NOT NULL,
    observations    TEXT          NOT NULL,
    mechanic_notes  TEXT,
    status          repairstatus  NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Explicit index on plate for fast lookups (UNIQUE already creates one, this is a named alias)
CREATE INDEX IF NOT EXISTS ix_motorcycles_plate ON motorcycles (plate);

-- Auto-update updated_at on every row change
DROP TRIGGER IF EXISTS trg_motorcycles_updated_at ON motorcycles;
CREATE TRIGGER trg_motorcycles_updated_at
    BEFORE UPDATE ON motorcycles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE motorcycles DISABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- Table: parts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    motorcycle_id   UUID          NOT NULL REFERENCES motorcycles (id) ON DELETE CASCADE,
    name            VARCHAR(200)  NOT NULL,
    quantity        INTEGER       NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index to speed up joins and per-motorcycle part lookups
CREATE INDEX IF NOT EXISTS ix_parts_motorcycle_id ON parts (motorcycle_id);

ALTER TABLE parts DISABLE ROW LEVEL SECURITY;