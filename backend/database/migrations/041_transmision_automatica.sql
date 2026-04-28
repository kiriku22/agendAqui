-- ============================================================================
-- Migración 041: Agregar transmisión automática a resoluciones DIAN
-- ============================================================================
-- Agrega campo transmision_automatica para que las facturas POS
-- se transmitan automáticamente a Factus/DIAN al momento de la venta.
-- ============================================================================

ALTER TABLE resoluciones_dian
  ADD COLUMN IF NOT EXISTS transmision_automatica BOOLEAN DEFAULT false;

COMMENT ON COLUMN resoluciones_dian.transmision_automatica IS
  'Si es true, las facturas generadas con esta resolución se transmiten automáticamente a Factus/DIAN';
