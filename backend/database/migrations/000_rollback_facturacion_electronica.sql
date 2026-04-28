-- ============================================================================
-- ROLLBACK: FACTURACIÓN ELECTRÓNICA DIAN - FACTUS
-- Base de datos: factufy_hotel
-- Descripción: Elimina todas las tablas y modificaciones de facturación electrónica
-- ADVERTENCIA: Este script elimina datos. Usar solo en desarrollo.
-- ============================================================================

BEGIN;

\echo '============================================================================'
\echo 'ROLLBACK DE FACTURACIÓN ELECTRÓNICA'
\echo 'ADVERTENCIA: Este script eliminará todas las tablas y datos relacionados'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. ELIMINAR VISTAS
-- ============================================================================

\echo '1. Eliminando vistas...'

DROP VIEW IF EXISTS v_facturas_electronicas_completas CASCADE;
DROP VIEW IF EXISTS v_configuracion_factus_publica CASCADE;

\echo '   ✓ Vistas eliminadas'
\echo ''

-- ============================================================================
-- 2. ELIMINAR FUNCIÓN DE SINCRONIZACIÓN
-- ============================================================================

\echo '2. Eliminando funciones...'

DROP FUNCTION IF EXISTS sincronizar_tipo_documento_dian() CASCADE;

\echo '   ✓ Funciones eliminadas'
\echo ''

-- ============================================================================
-- 3. REVERTIR MODIFICACIONES EN TABLAS EXISTENTES
-- ============================================================================

\echo '3. Revirtiendo modificaciones en tablas existentes...'

-- Tabla: facturas
ALTER TABLE facturas
  DROP CONSTRAINT IF EXISTS fk_facturas_fe CASCADE,
  DROP COLUMN IF EXISTS tiene_factura_electronica CASCADE,
  DROP COLUMN IF EXISTS factura_electronica_id CASCADE;

\echo '   ✓ Tabla facturas revertida'

-- Tabla: huespedes
ALTER TABLE huespedes
  DROP CONSTRAINT IF EXISTS fk_huespedes_tipo_doc_dian CASCADE,
  DROP COLUMN IF EXISTS tipo_documento_dian CASCADE;

\echo '   ✓ Tabla huespedes revertida'

-- Tabla: clientes
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS fk_clientes_tipo_doc_dian CASCADE,
  DROP COLUMN IF EXISTS tipo_documento_dian CASCADE,
  DROP COLUMN IF EXISTS codigo_municipio_dane CASCADE,
  DROP COLUMN IF EXISTS digito_verificacion CASCADE;

\echo '   ✓ Tabla clientes revertida'
\echo ''

-- ============================================================================
-- 4. ELIMINAR TABLAS NUEVAS (en orden inverso por dependencias)
-- ============================================================================

\echo '4. Eliminando tablas de facturación electrónica...'

DROP TABLE IF EXISTS notas_credito CASCADE;
\echo '   ✓ Tabla notas_credito eliminada'

DROP TABLE IF EXISTS documentos_soporte CASCADE;
\echo '   ✓ Tabla documentos_soporte eliminada'

DROP TABLE IF EXISTS facturas_electronicas CASCADE;
\echo '   ✓ Tabla facturas_electronicas eliminada'

DROP TABLE IF EXISTS configuracion_factus CASCADE;
\echo '   ✓ Tabla configuracion_factus eliminada'

DROP TABLE IF EXISTS tipos_documento_dian CASCADE;
\echo '   ✓ Tabla tipos_documento_dian eliminada'

\echo ''

-- ============================================================================
-- 5. VERIFICACIÓN
-- ============================================================================

\echo '5. Verificando eliminación...'
\echo ''

SELECT
  table_name AS "Tablas restantes (no deberían aparecer):"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tipos_documento_dian',
    'configuracion_factus',
    'facturas_electronicas',
    'notas_credito',
    'documentos_soporte'
  );

\echo ''

-- ============================================================================
-- FINALIZACIÓN
-- ============================================================================

COMMIT;

\echo '============================================================================'
\echo 'ROLLBACK COMPLETADO'
\echo '============================================================================'
\echo ''
\echo 'Todas las tablas y modificaciones de facturación electrónica han sido eliminadas.'
\echo ''
\echo 'Próximo paso:'
\echo '  Ejecutar nuevamente: 001_facturacion_electronica.sql'
\echo ''
