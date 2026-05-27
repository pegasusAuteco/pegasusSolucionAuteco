-- Añadir columna de teléfono a la tabla motorcycles
ALTER TABLE motorcycles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Si todavía usan ingresos_taller en alguna parte de la app antigua, también se puede añadir ahí:
ALTER TABLE ingresos_taller ADD COLUMN IF NOT EXISTS celular VARCHAR(50);
