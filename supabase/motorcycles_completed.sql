-- ============================================================
-- Schema: Motos completadas
-- ============================================================
-- This table receives rows moved from 'motorcycles' once a
-- repair is marked as finished. The move is atomic: INSERT here
-- + DELETE from 'motorcycles' happens inside a single transaction
-- in the backend so no record is ever lost or duplicated.
--
-- Run in: Supabase SQL Editor
-- ============================================================

-- Enable pgcrypto extension if not already active (needed for gen_random_uuid).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Main table ────────────────────────────────────────────────────────────────
-- Mirrors every column from 'motorcycles' so no data is lost on move.
-- Two extra columns track when the repair closed and whether the
-- WhatsApp notification was dispatched.

CREATE TABLE IF NOT EXISTS motorcycles_completed (

    -- Primary key: reuses the same UUID from 'motorcycles' for traceability.
    id              UUID          PRIMARY KEY,

    -- Client information
    client_name     VARCHAR(255)  NOT NULL,
    client_id       VARCHAR(50)   NOT NULL,   -- CC or NIT
    phone           VARCHAR(50),
    email           VARCHAR(255),

    -- Motorcycle information
    model           VARCHAR(255)  NOT NULL,
    plate           VARCHAR(20)   NOT NULL,
    mileage         INTEGER       NOT NULL,
    observations    TEXT,

    -- Lifecycle timestamps
    entry_date      TIMESTAMPTZ   NOT NULL,   -- original workshop entry date
    completed_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),  -- when repair was closed

    -- Final status snapshot copied from 'motorcycles' at move time.
    status          VARCHAR(50)   NOT NULL DEFAULT 'completed',

    -- WhatsApp notification flag.
    -- Set to true once the confirmation message has been sent to the client.
    whatsapp_sent   BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Plate lookup: used to check repair history for a given vehicle.
CREATE INDEX IF NOT EXISTS idx_motorcycles_completed_plate
    ON motorcycles_completed (plate);

-- Time-range queries: dashboards and reports filtered by completion date.
CREATE INDEX IF NOT EXISTS idx_motorcycles_completed_completed_at
    ON motorcycles_completed (completed_at DESC);

-- WhatsApp pending filter: quick scan for records where the message was not sent yet.
CREATE INDEX IF NOT EXISTS idx_motorcycles_completed_whatsapp_pending
    ON motorcycles_completed (whatsapp_sent)
    WHERE whatsapp_sent = FALSE;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Disabled: the backend uses the service_role key which bypasses RLS.
-- Re-enable and add policies if direct client access is introduced in the future.
ALTER TABLE motorcycles_completed DISABLE ROW LEVEL SECURITY;
