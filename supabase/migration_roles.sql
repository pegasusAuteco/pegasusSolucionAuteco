-- ============================================================
-- SETUP COMPLETO: Enum + Tabla usuarios + Tabla ingresos_taller
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- 1. Crear el enum con los 4 roles (incluye mecanico y secretario)
CREATE TYPE userrole AS ENUM ('employee', 'admin', 'mecanico', 'secretario');

-- 2. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Tabla de usuarios
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

-- Índice de login
CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Sin RLS (usamos service_role desde el frontend)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 4. Tabla de ingresos_taller
CREATE TABLE IF NOT EXISTS ingresos_taller (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente             VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(50)  NOT NULL,
    correo_electronico  VARCHAR(255),
    fecha_ingreso       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    marca_modelo        VARCHAR(255) NOT NULL,
    placa               VARCHAR(20)  NOT NULL,
    kilometraje         INTEGER      NOT NULL,
    observaciones       TEXT,
    created_at          TIMESTAMPTZ  DEFAULT now(),
    updated_at          TIMESTAMPTZ  DEFAULT now()
);

-- Trigger updated_at para ingresos
DROP TRIGGER IF EXISTS set_ingresos_taller_updated_at ON ingresos_taller;
CREATE TRIGGER set_ingresos_taller_updated_at
    BEFORE UPDATE ON ingresos_taller
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE ingresos_taller DISABLE ROW LEVEL SECURITY;

-- 5. Vista para mecánicos (solo 3 campos)
CREATE OR REPLACE VIEW vista_mecanicos_ingresos AS
SELECT id, marca_modelo, placa, observaciones
FROM ingresos_taller;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT enum_range(NULL::userrole);   -- Debe mostrar los 4 roles
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public';     -- Debe mostrar usuarios e ingresos_taller
