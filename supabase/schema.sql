-- ============================================================
-- MotorConnect — Schema completo de Supabase
-- Versión: 2.0  |  Fecha: 2026-06-02
-- Ejecutar en: Supabase SQL Editor
-- Idempotente: puede correrse múltiples veces sin error
-- ============================================================


-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('employee', 'admin', 'mecanico', 'secretario');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE repairstatus AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- TABLA: usuarios
-- Autenticación y perfiles de usuarios del sistema.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(150)  NOT NULL,
    email          VARCHAR(255)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255)  NOT NULL,
    accept_terms   BOOLEAN       NOT NULL DEFAULT FALSE,
    rol            userrole      NOT NULL DEFAULT 'employee',
    empresa_taller VARCHAR(200),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLA: ingresos_taller
-- Registro de recepción de motos. Fuente de verdad del taller.
-- ============================================================

CREATE TABLE IF NOT EXISTS ingresos_taller (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente             VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(50)  NOT NULL,
    correo_electronico  VARCHAR(255),
    celular             VARCHAR(50),
    fecha_ingreso       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    marca_modelo        VARCHAR(255) NOT NULL,
    placa               VARCHAR(20)  NOT NULL,
    kilometraje         INTEGER      NOT NULL,
    observaciones       TEXT,
    estado              VARCHAR(50)  NOT NULL DEFAULT 'en_cola',
    mecanico_id         INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ingresos_estado     ON ingresos_taller (estado);
CREATE INDEX IF NOT EXISTS ix_ingresos_mecanico   ON ingresos_taller (mecanico_id);
CREATE INDEX IF NOT EXISTS ix_ingresos_placa      ON ingresos_taller (placa);

DROP TRIGGER IF EXISTS trg_ingresos_updated_at ON ingresos_taller;
CREATE TRIGGER trg_ingresos_updated_at
    BEFORE UPDATE ON ingresos_taller
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ingresos_taller DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- VISTA: vista_mecanicos_ingresos
-- Expone solo los campos no-PII para el panel del mecánico.
-- ============================================================

CREATE OR REPLACE VIEW vista_mecanicos_ingresos AS
SELECT
    id,
    marca_modelo,
    placa,
    observaciones,
    estado
FROM ingresos_taller;


-- ============================================================
-- TABLA: motorcycles
-- Tabla legacy de motos (sistema anterior). Mantener mientras
-- existan referencias activas en el frontend o historial.
-- ============================================================

CREATE TABLE IF NOT EXISTS motorcycles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name     VARCHAR(255) NOT NULL,
    client_id       VARCHAR(50),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    model           VARCHAR(255) NOT NULL,
    plate           VARCHAR(20)  NOT NULL,
    mileage         INTEGER,
    entry_date      TIMESTAMPTZ  DEFAULT NOW(),
    observations    TEXT,
    mechanic_notes  TEXT,
    status          repairstatus DEFAULT 'pending',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_motorcycles_plate  ON motorcycles (plate);
CREATE INDEX IF NOT EXISTS ix_motorcycles_status ON motorcycles (status);

DROP TRIGGER IF EXISTS trg_motorcycles_updated_at ON motorcycles;
CREATE TRIGGER trg_motorcycles_updated_at
    BEFORE UPDATE ON motorcycles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE motorcycles DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLA: motorcycles_completed
-- Archivo de motos entregadas (historial inmutable).
-- ============================================================

CREATE TABLE IF NOT EXISTS motorcycles_completed (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name    VARCHAR(255) NOT NULL,
    client_id      VARCHAR(50),
    phone          VARCHAR(50),
    email          VARCHAR(255),
    model          VARCHAR(255) NOT NULL,
    plate          VARCHAR(20)  NOT NULL,
    mileage        INTEGER,
    observations   TEXT,
    entry_date     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ  DEFAULT NOW(),
    whatsapp_sent  BOOLEAN      DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_completed_plate ON motorcycles_completed (plate);

ALTER TABLE motorcycles_completed DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLA: parts
-- Repuestos asociados a una moto en reparación.
-- ============================================================

CREATE TABLE IF NOT EXISTS parts (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    motorcycle_id UUID        NOT NULL REFERENCES motorcycles(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    quantity      INTEGER      NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_parts_motorcycle ON parts (motorcycle_id);

ALTER TABLE parts DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLA: manuales_chunks
-- Fragmentos de manuales técnicos indexados para RAG.
-- Requiere extensión pgvector habilitada en Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS manuales_chunks (
    id         BIGSERIAL    PRIMARY KEY,
    texto      TEXT         NOT NULL,
    fuente     TEXT,
    pagina     INTEGER,
    datos      JSONB,
    embedding  vector(1536),
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_manuales_fuente ON manuales_chunks (fuente);

ALTER TABLE manuales_chunks DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLA: fallas_diagnostico
-- Base de conocimiento de fallas para diagnóstico asistido.
-- ============================================================

CREATE TABLE IF NOT EXISTS fallas_diagnostico (
    id              BIGSERIAL PRIMARY KEY,
    modelo          TEXT,
    componente      TEXT,
    sintoma         TEXT,
    causa           TEXT,
    solucion        TEXT,
    pasos_revision  TEXT,
    embedding       vector(1536)
);

CREATE INDEX IF NOT EXISTS ix_fallas_modelo ON fallas_diagnostico (modelo);

ALTER TABLE fallas_diagnostico DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- VERIFICACIÓN (ejecutar por separado para confirmar)
-- ============================================================

-- SELECT enum_range(NULL::userrole);
-- SELECT enum_range(NULL::repairstatus);
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';


-- ============================================================
-- NOTAS DE USO
-- ============================================================

-- 1. Este archivo es idempotente: CREATE IF NOT EXISTS y DO $$
--    permiten re-ejecutarlo sin errores en un schema ya existente.
--
-- 2. RLS está deshabilitado en todas las tablas porque el acceso
--    ocurre siempre a través del BFF/backend con service_role key.
--
-- 3. La extensión pgvector debe estar habilitada para manuales_chunks
--    y fallas_diagnostico. En Supabase: Database → Extensions → vector.
--
-- 4. motorcycles y motorcycles_completed son tablas del sistema
--    anterior. Evaluar deprecación una vez confirmado que ingresos_taller
--    las reemplaza completamente.
--
-- 5. Para agregar valores a un enum existente:
--    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'nuevo_rol';
