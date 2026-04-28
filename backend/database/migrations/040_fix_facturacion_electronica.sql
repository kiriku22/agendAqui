-- ============================================================================
-- MIGRACIÓN: Corregir facturación electrónica - Prefijo y Numeración DIAN
-- Base de datos: factufy_hotel
-- Fecha: 2026-02-25
-- Descripción:
--   1. Agregar factus_numbering_range_id a resoluciones_dian
--   2. Agregar prefijo a facturas (separar de numero_factura)
--   3. Agregar numero_factus a facturas_electronicas (reconciliación)
--   4. Migrar datos existentes: extraer prefijo de numero_factura
-- ============================================================================

SET timezone = 'America/Bogota';

-- ============================================================================
-- 1. Agregar factus_numbering_range_id a resoluciones_dian
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resoluciones_dian' AND column_name = 'factus_numbering_range_id'
  ) THEN
    ALTER TABLE resoluciones_dian ADD COLUMN factus_numbering_range_id INTEGER;
    COMMENT ON COLUMN resoluciones_dian.factus_numbering_range_id IS 'ID del rango de numeración en Factus. Requerido para que Factus use el prefijo correcto.';
    RAISE NOTICE 'Columna factus_numbering_range_id agregada a resoluciones_dian';
  ELSE
    RAISE NOTICE 'Columna factus_numbering_range_id ya existe en resoluciones_dian';
  END IF;
END $$;

-- ============================================================================
-- 2. Agregar prefijo a facturas
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas' AND column_name = 'prefijo'
  ) THEN
    ALTER TABLE facturas ADD COLUMN prefijo VARCHAR(10);
    COMMENT ON COLUMN facturas.prefijo IS 'Prefijo de la resolución DIAN. Separado de numero_factura para correcta identificación.';
    RAISE NOTICE 'Columna prefijo agregada a facturas';
  ELSE
    RAISE NOTICE 'Columna prefijo ya existe en facturas';
  END IF;
END $$;

-- ============================================================================
-- 3. Agregar numero_factus a facturas_electronicas (para reconciliación)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_electronicas' AND column_name = 'numero_factus'
  ) THEN
    ALTER TABLE facturas_electronicas ADD COLUMN numero_factus VARCHAR(50);
    COMMENT ON COLUMN facturas_electronicas.numero_factus IS 'Número completo asignado por Factus (ej: SEPC990000021). Para reconciliación.';
    RAISE NOTICE 'Columna numero_factus agregada a facturas_electronicas';
  ELSE
    RAISE NOTICE 'Columna numero_factus ya existe en facturas_electronicas';
  END IF;
END $$;

-- ============================================================================
-- 4. Migrar datos existentes: separar prefijo de numero_factura
-- ============================================================================

-- 4a. Poblar prefijo en facturas desde la resolución DIAN activa de tipo factura
DO $$
DECLARE
  v_prefijo TEXT;
  v_count INTEGER;
BEGIN
  -- Obtener prefijo de la resolución activa
  SELECT prefijo INTO v_prefijo
  FROM resoluciones_dian
  WHERE tipo_documento = 'factura' AND activo = true
  LIMIT 1;

  IF v_prefijo IS NOT NULL AND v_prefijo != '' THEN
    -- Actualizar facturas que tienen el prefijo embebido en numero_factura
    UPDATE facturas
    SET prefijo = v_prefijo
    WHERE prefijo IS NULL
      AND numero_factura LIKE v_prefijo || '%';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Facturas actualizadas con prefijo "%": %', v_prefijo, v_count;

    -- Remover prefijo del numero_factura
    UPDATE facturas
    SET numero_factura = SUBSTRING(numero_factura FROM LENGTH(prefijo) + 1)
    WHERE prefijo IS NOT NULL
      AND prefijo != ''
      AND numero_factura LIKE prefijo || '%';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'numero_factura limpiados (prefijo removido): %', v_count;
  ELSE
    RAISE NOTICE 'No se encontró resolución activa de tipo factura, no se migran datos';
  END IF;
END $$;

-- 4b. Poblar numero_factus en facturas_electronicas desde numero_factura_electronica
UPDATE facturas_electronicas
SET numero_factus = numero_factura_electronica
WHERE numero_factus IS NULL
  AND numero_factura_electronica IS NOT NULL;

-- ============================================================================
-- 5. Actualizar constraint UNIQUE en facturas para ser compuesto
-- ============================================================================
-- Si existe constraint único solo en numero_factura, cambiarlo a compuesto (prefijo, numero_factura)
DO $$
BEGIN
  -- Intentar eliminar constraint existente (puede no existir)
  BEGIN
    ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_numero_factura_key;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se encontró constraint facturas_numero_factura_key';
  END;

  -- Crear nuevo índice único compuesto
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'facturas' AND indexname = 'idx_facturas_prefijo_numero_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_facturas_prefijo_numero_unique
    ON facturas (COALESCE(prefijo, ''), numero_factura);
    RAISE NOTICE 'Índice único compuesto (prefijo, numero_factura) creado';
  ELSE
    RAISE NOTICE 'Índice idx_facturas_prefijo_numero_unique ya existe';
  END IF;
END $$;

-- ============================================================================
-- Verificación
-- ============================================================================
DO $$
DECLARE
  v_count_prefijo INTEGER;
  v_count_sin_prefijo INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_prefijo FROM facturas WHERE prefijo IS NOT NULL;
  SELECT COUNT(*) INTO v_count_sin_prefijo FROM facturas WHERE prefijo IS NULL;

  RAISE NOTICE '=== VERIFICACIÓN ===';
  RAISE NOTICE 'Facturas con prefijo: %', v_count_prefijo;
  RAISE NOTICE 'Facturas sin prefijo: %', v_count_sin_prefijo;
  RAISE NOTICE 'Migración completada exitosamente';
END $$;
