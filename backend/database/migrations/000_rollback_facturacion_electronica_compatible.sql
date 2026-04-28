-- ============================================================================
-- ROLLBACK: FACTURACIÓN ELECTRÓNICA DIAN - FACTUS
-- Base de datos: factufy_hotel
-- Descripción: Elimina todas las tablas y modificaciones de facturación electrónica
-- ADVERTENCIA: Este script elimina datos. Usar solo en desarrollo.
-- Compatible con pgAdmin, DBeaver y otros clientes SQL
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ELIMINAR VISTAS
-- ============================================================================

DROP VIEW IF EXISTS v_facturas_electronicas_completas CASCADE;
DROP VIEW IF EXISTS v_configuracion_factus_publica CASCADE;

-- ============================================================================
-- 2. ELIMINAR FUNCIÓN DE SINCRONIZACIÓN
-- ============================================================================

DROP FUNCTION IF EXISTS sincronizar_tipo_documento_dian() CASCADE;

-- ============================================================================
-- 3. REVERTIR MODIFICACIONES EN TABLAS EXISTENTES
-- ============================================================================

-- Tabla: facturas
ALTER TABLE facturas
  DROP CONSTRAINT IF EXISTS fk_facturas_fe CASCADE,
  DROP COLUMN IF EXISTS tiene_factura_electronica CASCADE,
  DROP COLUMN IF EXISTS factura_electronica_id CASCADE;

-- Tabla: huespedes
ALTER TABLE huespedes
  DROP CONSTRAINT IF EXISTS fk_huespedes_tipo_doc_dian CASCADE,
  DROP COLUMN IF EXISTS tipo_documento_dian CASCADE;

-- Tabla: clientes
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS fk_clientes_tipo_doc_dian CASCADE,
  DROP COLUMN IF EXISTS tipo_documento_dian CASCADE,
  DROP COLUMN IF EXISTS codigo_municipio_dane CASCADE,
  DROP COLUMN IF EXISTS digito_verificacion CASCADE;

-- ============================================================================
-- 4. ELIMINAR TABLAS NUEVAS (en orden inverso por dependencias)
-- ============================================================================

DROP TABLE IF EXISTS notas_credito CASCADE;
DROP TABLE IF EXISTS documentos_soporte CASCADE;
DROP TABLE IF EXISTS facturas_electronicas CASCADE;
DROP TABLE IF EXISTS configuracion_factus CASCADE;
DROP TABLE IF EXISTS tipos_documento_dian CASCADE;

-- ============================================================================
-- 5. MENSAJE DE CONFIRMACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ROLLBACK COMPLETADO';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas eliminadas:';
  RAISE NOTICE '  - tipos_documento_dian';
  RAISE NOTICE '  - configuracion_factus';
  RAISE NOTICE '  - facturas_electronicas';
  RAISE NOTICE '  - notas_credito';
  RAISE NOTICE '  - documentos_soporte';
  RAISE NOTICE '';
  RAISE NOTICE 'Columnas eliminadas:';
  RAISE NOTICE '  - clientes: tipo_documento_dian, codigo_municipio_dane, digito_verificacion';
  RAISE NOTICE '  - huespedes: tipo_documento_dian';
  RAISE NOTICE '  - facturas: tiene_factura_electronica, factura_electronica_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximo paso: Ejecutar 001_facturacion_electronica.sql';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Verificación (opcional - comentar si da error)
SELECT
  'Verificación: Tablas que NO deberían existir' AS mensaje;

SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tipos_documento_dian',
    'configuracion_factus',
    'facturas_electronicas',
    'notas_credito',
    'documentos_soporte'
  );
