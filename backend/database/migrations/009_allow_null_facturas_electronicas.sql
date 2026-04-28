-- ============================================================================
-- MIGRACIÓN: Permitir NULL en campos de Factus para guardar facturas pendientes
-- Base de datos: factufy_hotel
-- Fecha: 2025-12-16
-- Descripción: Modifica facturas_electronicas para permitir guardar registros
--              cuando Factus falla, marcándolos como 'pending' o 'error'
-- ============================================================================

SET timezone = 'America/Bogota';

-- Permitir NULL en columnas que vienen de Factus (no disponibles cuando falla)
ALTER TABLE facturas_electronicas
  ALTER COLUMN numero_factura_electronica DROP NOT NULL;

ALTER TABLE facturas_electronicas
  ALTER COLUMN prefijo DROP NOT NULL;

ALTER TABLE facturas_electronicas
  ALTER COLUMN numero DROP NOT NULL;

-- Actualizar CHECK constraint para incluir nuevos estados
ALTER TABLE facturas_electronicas
  DROP CONSTRAINT IF EXISTS chk_fe_status;

ALTER TABLE facturas_electronicas
  ADD CONSTRAINT chk_fe_status
  CHECK (factus_status IN ('pending', 'Created', 'approved', 'rejected', 'error', 'Pendiente'));

-- Comentario actualizado
COMMENT ON COLUMN facturas_electronicas.factus_status IS
  'Estado de la factura: pending (esperando envío), Pendiente (error en envío, pendiente reintento), Created (enviada), approved (aprobada DIAN), rejected (rechazada), error (error permanente)';

-- Índice para encontrar facturas pendientes de reenvío
CREATE INDEX IF NOT EXISTS idx_fe_pending_retry
  ON facturas_electronicas(factus_status)
  WHERE factus_status IN ('pending', 'Pendiente', 'error');

SELECT 'Migración 009 completada: facturas_electronicas ahora permite guardar registros pendientes' as resultado;
