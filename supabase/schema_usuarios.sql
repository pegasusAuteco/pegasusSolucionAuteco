-- MotorConnect — Schema: Autenticación y usuarios
-- Ejecutar en: Supabase SQL Editor o via scripts/apply_schema.py


-- Enum de roles
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))

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



----------------------------------------------------------------
-- MotorConnect — Schema: Recepción / Ingreso de Motos
----------------------------------------------------------------
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))
(((((CREADA Y LISTA PARA INGRESO DE DATA)))))

CREATE TABLE IF NOT EXISTS ingresos_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(50) NOT NULL, -- CC o NIT
    correo_electronico VARCHAR(255),
    fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
    marca_modelo VARCHAR(255) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    kilometraje INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para actualizar automaticamente el updated_at
CREATE TRIGGER set_ingresos_taller_updated_at
    BEFORE UPDATE ON ingresos_taller
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- RLS: deshabilitado (el backend usa service_role)
ALTER TABLE ingresos_taller DISABLE ROW LEVEL SECURITY;


(((((A TENER EN CUENTA PARA MOSTRAR INFORMACION POR ROLES)))))
/*
=============================================================================
GUÍA DE IMPLEMENTACIÓN: VISTA PARA MECÁNICOS (FRONTEND & BACKEND)
=============================================================================
Problema: Los mecánicos no deben ver información personal del cliente 
(nombre, cédula, correo), solo deben acceder a los datos de la moto.

Arquitectura: NO crear una tabla separada para evitar duplicidad de datos. 
Se debe mantener una única "fuente de la verdad" (la tabla ingresos_taller).

Para resolver esto de forma segura, el equipo de desarrollo debe elegir 
una de estas dos opciones de implementación:

OPCIÓN 1: Filtrado en el Backend (FastAPI) - [RECOMENDADA]
-----------------------------------------------------------------------------
1. En Backend (`schemas.py`): Crear un modelo Pydantic estricto:
   class MotoMecanicoResponse(BaseModel):
       id: str
       marca_modelo: str
       placa: str
       observaciones: str

2. En Backend (`router.py`): Crear un endpoint GET específico:
   @router.get("/api/mecanicos/motos", response_model=list[MotoMecanicoResponse])
   (Al usar response_model, FastAPI automáticamente omite los datos sensibles
   al enviarlos al frontend, es completamente seguro).

3. En Frontend (React/Web): El encargado de frontend solo debe hacer un 
   `fetch` a la ruta `/api/mecanicos/motos` y renderizar la tabla con la respuesta. 
   No requiere lógica extra de ocultamiento de datos porque el servidor nunca
   los envió.

OPCIÓN 2: Uso de Vista SQL (View)
-----------------------------------------------------------------------------
Utilizar la vista 'vista_mecanicos_ingresos' (creada justo aquí abajo).
El backend en lugar de hacer un SELECT a la tabla principal, hace la consulta
a la vista. La base de datos entregará únicamente las 4 columnas permitidas.
=============================================================================
*/

-- Vista SQL para la Opción 2 (Opcional pero recomendada tenerla lista):
CREATE OR REPLACE VIEW vista_mecanicos_ingresos AS
SELECT 
    id,
    marca_modelo,
    placa,
    observaciones
FROM ingresos_taller;


FROM ingresos_taller;