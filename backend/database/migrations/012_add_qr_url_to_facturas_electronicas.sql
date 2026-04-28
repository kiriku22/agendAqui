-- ============================================================================
-- MIGRACIÓN 012: AGREGAR CAMPO qr_url A facturas_electronicas
-- ============================================================================
-- Descripción: Agregar campo para almacenar URL del código QR generado por Factus
-- Fecha: 2025-12-23
-- Autor: Claude Code
-- ============================================================================

-- Agregar campo qr_url para código QR de la factura
ALTER TABLE facturas_electronicas
ADD COLUMN IF NOT EXISTS qr_url TEXT;

COMMENT ON COLUMN facturas_electronicas.qr_url IS 'URL del código QR generado por Factus para validación DIAN';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 012 completada: Campo qr_url agregado a facturas_electronicas';
END $$;
