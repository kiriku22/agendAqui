-- ============================================================================
-- Migración 053: Agregar estado TRA a tabla hospedajes
-- Permite ver rápidamente el estado del reporte TRA en cada hospedaje
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 053: Agregar estado TRA a hospedajes ===';
END $$;

-- Estado del reporte TRA en el hospedaje
ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS tra_estado VARCHAR(20) DEFAULT 'pendiente';

-- Costo de alojamiento para reportar a TRA (puede diferir del precio_total_hospedaje)
ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS costo_alojamiento_tra DECIMAL(10,2);

-- Comentarios
COMMENT ON COLUMN hospedajes.tra_estado IS 'Estado del reporte TRA: pendiente, enviado, error, no_configurado';
COMMENT ON COLUMN hospedajes.costo_alojamiento_tra IS 'Costo total de alojamiento para reportar a TRA';

DO $$
BEGIN
    RAISE NOTICE '✓ Campos TRA agregados a tabla hospedajes: tra_estado, costo_alojamiento_tra';
END $$;
