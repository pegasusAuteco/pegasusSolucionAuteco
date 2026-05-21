-- MotorConnect — Schema: Autenticación y usuarios
-- Ejecutar en: Supabase SQL Editor o via scripts/apply_schema.py

-- Enum de roles
DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('employee', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabla de usuarios
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

-- Índice en email (búsquedas de login)
CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

-- Función y trigger para actualizar updated_at automáticamente
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

-- RLS: deshabilitado (el backend usa service_role que lo bypasea)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
