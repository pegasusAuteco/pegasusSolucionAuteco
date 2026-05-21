-- MotorConnect — Schema: Authentication and users
-- Run in: Supabase SQL Editor or via scripts/db/apply_schema.py
-- ----------------------------------------------------------------
-- Enum: user roles
-- ----------------------------------------------------------------
-- (TABLE CREATED AND READY FOR DATA ENTRY)

DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('employee', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------
-- Table: usuarios
-- ----------------------------------------------------------------
-- (TABLE CREATED AND READY FOR DATA ENTRY)

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(150)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    accept_terms  BOOLEAN       NOT NULL DEFAULT FALSE,
    rol           userrole      NOT NULL DEFAULT 'employee',
    empresa_taller VARCHAR(200),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index on email for fast login lookups
CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

-- Function and trigger to auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- RLS disabled — backend uses service_role key which bypasses it
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- Schema: Workshop intake (ingresos_taller)
-- ----------------------------------------------------------------
-- (TABLE CREATED AND READY FOR DATA ENTRY)

CREATE TABLE IF NOT EXISTS ingresos_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(50) NOT NULL, -- national ID or tax ID
    correo_electronico VARCHAR(255),
    fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
    marca_modelo VARCHAR(255) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    kilometraje INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reuse set_updated_at() to keep updated_at current
CREATE TRIGGER set_ingresos_taller_updated_at
    BEFORE UPDATE ON ingresos_taller
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- RLS disabled — backend uses service_role key
ALTER TABLE ingresos_taller DISABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- NOTE: Role-based data filtering
-- ----------------------------------------------------------------
-- (KEEP IN MIND FOR ROLE-BASED FRONTEND DISPLAY)

/*
=============================================================================
IMPLEMENTATION GUIDE: MECHANIC VIEW (FRONTEND & BACKEND)
=============================================================================
Problem: mechanics must not see client personal data (name, ID, email);
they should only access vehicle data.

Architecture: do NOT create a separate table to avoid data duplication.
Keep a single source of truth (ingresos_taller).

Choose one of the two implementation options below:

OPTION 1: Backend filtering (FastAPI) — RECOMMENDED
-----------------------------------------------------------------------------
1. In backend (schemas.py): define a strict Pydantic model:
   class MotoMecanicoResponse(BaseModel):
       id: str
       marca_modelo: str
       placa: str
       observaciones: str

2. In backend (router.py): expose a dedicated GET endpoint:
   @router.get("/api/mecanicos/motos", response_model=list[MotoMecanicoResponse])
   FastAPI will automatically strip sensitive fields before sending the response.

3. In frontend (React/Web): fetch "/api/mecanicos/motos" and render the table.
   No extra hiding logic needed — the server never sent the sensitive data.

OPTION 2: SQL View
-----------------------------------------------------------------------------
Query the view "vista_mecanicos_ingresos" instead of the main table.
The database returns only the 4 allowed columns.
=============================================================================
*/

-- SQL view for Option 2 (optional but useful to have ready):
CREATE OR REPLACE VIEW vista_mecanicos_ingresos AS
SELECT
    id,
    marca_modelo,
    placa,
    observaciones
FROM ingresos_taller;


-- ----------------------------------------------------------------
-- NOTE: Motorcycle-to-mechanic assignment
-- ----------------------------------------------------------------
/*
=============================================================================
ARCHITECTURE NOTES: ASSIGNING MOTORCYCLES TO MECHANICS
=============================================================================
Workflow:
1. Receptionist registers the motorcycle (enters the general queue, unassigned).
2. Mechanic opens the panel, sees available motorcycles and clicks "Take".

Two structural options:

OPTION 1: Quick approach (MVP — easiest to implement)
-----------------------------------------------------------------------------
Best when a single mechanic handles a repair from start to finish.
Add two columns to ingresos_taller:
    mecanico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    estado VARCHAR(50) DEFAULT 'en_cola'
When the mechanic clicks the button, the backend runs an UPDATE to assign their ID.
If mecanico_id IS NULL → motorcycle appears in the general queue.

OPTION 2: Professional approach — recommended for traceability
-----------------------------------------------------------------------------
Best when you need a history log (e.g. Carlos worked 2h, then Juan worked 1h).
Create a new table asignaciones_taller:
    CREATE TABLE asignaciones_taller (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingreso_id UUID REFERENCES ingresos_taller(id),
        mecanico_id INTEGER REFERENCES usuarios(id),
        fecha_inicio TIMESTAMPTZ DEFAULT now()
    );
When the mechanic clicks the button, the backend inserts a row here.
=============================================================================
*/