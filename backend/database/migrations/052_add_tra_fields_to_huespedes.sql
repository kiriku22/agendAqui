-- ============================================================================
-- Migración 052: Agregar campos TRA a tabla huespedes
-- Campos requeridos por la Tarjeta de Registro de Alojamiento (MinCIT)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 052: Agregar campos TRA a huespedes ===';
END $$;

-- Campos requeridos por TRA para cada huésped
ALTER TABLE huespedes ADD COLUMN IF NOT EXISTS lugar_residencia VARCHAR(200);
ALTER TABLE huespedes ADD COLUMN IF NOT EXISTS lugar_procedencia VARCHAR(200);
ALTER TABLE huespedes ADD COLUMN IF NOT EXISTS motivo_viaje VARCHAR(100);

-- Comentarios descriptivos
COMMENT ON COLUMN huespedes.lugar_residencia IS 'Lugar de residencia habitual del huésped (requerido por TRA)';
COMMENT ON COLUMN huespedes.lugar_procedencia IS 'Lugar de procedencia/origen del huésped (requerido por TRA)';
COMMENT ON COLUMN huespedes.motivo_viaje IS 'Motivo del viaje: turismo, negocios, salud, educacion, eventos, otro (requerido por TRA)';

DO $$
BEGIN
    RAISE NOTICE '✓ Campos TRA agregados a tabla huespedes: lugar_residencia, lugar_procedencia, motivo_viaje';
END $$;
