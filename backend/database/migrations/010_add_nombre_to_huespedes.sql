-- ============================================================================
-- MIGRACIÓN: Agregar campos nombre y apellido a huéspedes
-- Fecha: 2025-12-19
-- Propósito: Permitir que los huéspedes tengan nombre propio diferente al cliente
-- ============================================================================

-- Paso 1: Agregar columnas nombre y apellido a huespedes
ALTER TABLE huespedes
ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
ADD COLUMN IF NOT EXISTS apellido VARCHAR(100);

-- Paso 2: Migrar datos existentes desde la tabla clientes
-- Para cada huésped, copiar el nombre del cliente asociado
UPDATE huespedes h
SET nombre = c.nombre,
    apellido = c.apellido
FROM clientes c
WHERE h.cliente_id = c.id
  AND h.nombre IS NULL;

-- Paso 3: Hacer NOT NULL la columna nombre (requerido)
ALTER TABLE huespedes
ALTER COLUMN nombre SET NOT NULL;

-- Paso 4: Actualizar comentarios
COMMENT ON COLUMN huespedes.nombre IS 'Nombre(s) del huésped - puede ser diferente al cliente que paga';
COMMENT ON COLUMN huespedes.apellido IS 'Apellido(s) del huésped';

-- Paso 5: Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_huespedes_nombre ON huespedes(nombre, apellido);

-- Verificación
SELECT
    'Total huéspedes' as descripcion,
    COUNT(*) as cantidad
FROM huespedes
UNION ALL
SELECT
    'Huéspedes con nombre',
    COUNT(*)
FROM huespedes
WHERE nombre IS NOT NULL;
