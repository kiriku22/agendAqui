-- ============================================================================
-- MIGRACIÓN 013: AGREGAR CAMPO logo_url A configuracion_factus
-- ============================================================================
-- Descripción: Agregar campo para almacenar URL del logo del hotel
-- Fecha: 2025-12-23
-- Autor: Claude Code
-- ============================================================================

-- Agregar campo logo_url para logo del hotel
ALTER TABLE configuracion_factus
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN configuracion_factus.logo_url IS 'URL del logo del hotel para mostrar en facturas';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 013 completada: Campo logo_url agregado a configuracion_factus';
END $$;
