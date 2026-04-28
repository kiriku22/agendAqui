-- ============================================================================
-- Migración 054: Actualizar configuracion_tra para API real (Resolución 409)
--
-- Cambios basados en el Manual de Integración PMS Resolución 409 de 2022:
-- - La API NO usa codigo_establecimiento ni codigo_alojamiento
-- - La API SÍ requiere nombre_establecimiento y tipo_acomodacion
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 054: Actualizar configuracion_tra para API real ===';
END $$;

-- 1. Agregar campos que la API real SÍ necesita
ALTER TABLE configuracion_tra ADD COLUMN IF NOT EXISTS nombre_establecimiento VARCHAR(200);
ALTER TABLE configuracion_tra ADD COLUMN IF NOT EXISTS tipo_acomodacion VARCHAR(100) DEFAULT 'Hotel';

-- 2. Eliminar campos que la API real NO usa
ALTER TABLE configuracion_tra DROP COLUMN IF EXISTS codigo_establecimiento;
ALTER TABLE configuracion_tra DROP COLUMN IF EXISTS codigo_alojamiento;

DO $$
BEGIN
    RAISE NOTICE '✓ configuracion_tra actualizada: +nombre_establecimiento, +tipo_acomodacion, -codigo_establecimiento, -codigo_alojamiento';
END $$;
