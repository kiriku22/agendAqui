-- ============================================================================
-- VERIFICACIÓN DE MIGRACIÓN: FACTURACIÓN ELECTRÓNICA
-- ============================================================================

\echo '============================================================================'
\echo 'VERIFICANDO INSTALACIÓN DE FACTURACIÓN ELECTRÓNICA'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. VERIFICAR TABLAS CREADAS
-- ============================================================================

\echo '1. VERIFICANDO TABLAS CREADAS:'
\echo ''

SELECT
  table_name AS "Tabla",
  CASE
    WHEN table_name IN (
      'tipos_documento_dian',
      'configuracion_factus',
      'facturas_electronicas',
      'notas_credito',
      'documentos_soporte'
    ) THEN '✓'
    ELSE '✗'
  END AS "Estado"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tipos_documento_dian',
    'configuracion_factus',
    'facturas_electronicas',
    'notas_credito',
    'documentos_soporte'
  )
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 2. VERIFICAR DATOS INICIALES
-- ============================================================================

\echo '2. VERIFICANDO DATOS INICIALES:'
\echo ''

\echo '2.1 Tipos de Documento DIAN:'
SELECT
  codigo_dian AS "Código",
  codigo_interno AS "Interno",
  descripcion AS "Descripción",
  CASE WHEN requiere_digito_verificacion THEN 'Sí' ELSE 'No' END AS "DV"
FROM tipos_documento_dian
ORDER BY codigo_dian;

\echo ''
\echo '2.2 Configuración Factus:'
SELECT
  id AS "ID",
  ambiente AS "Ambiente",
  CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END AS "Estado",
  email AS "Email",
  endpoint AS "Endpoint"
FROM configuracion_factus;

\echo ''

-- ============================================================================
-- 3. VERIFICAR COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ============================================================================

\echo '3. VERIFICANDO COLUMNAS NUEVAS:'
\echo ''

\echo '3.1 Tabla clientes:'
SELECT
  column_name AS "Columna",
  data_type AS "Tipo"
FROM information_schema.columns
WHERE table_name = 'clientes'
  AND column_name IN ('tipo_documento_dian', 'codigo_municipio_dane', 'digito_verificacion')
ORDER BY column_name;

\echo ''
\echo '3.2 Tabla huespedes:'
SELECT
  column_name AS "Columna",
  data_type AS "Tipo"
FROM information_schema.columns
WHERE table_name = 'huespedes'
  AND column_name IN ('tipo_documento_dian')
ORDER BY column_name;

\echo ''
\echo '3.3 Tabla facturas:'
SELECT
  column_name AS "Columna",
  data_type AS "Tipo"
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name IN ('tiene_factura_electronica', 'factura_electronica_id')
ORDER BY column_name;

\echo ''

-- ============================================================================
-- 4. VERIFICAR ÍNDICES
-- ============================================================================

\echo '4. VERIFICANDO ÍNDICES:'
\echo ''

SELECT
  tablename AS "Tabla",
  indexname AS "Índice"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'tipos_documento_dian',
    'configuracion_factus',
    'facturas_electronicas',
    'notas_credito',
    'documentos_soporte'
  )
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- 5. VERIFICAR VISTAS
-- ============================================================================

\echo '5. VERIFICANDO VISTAS:'
\echo ''

SELECT
  table_name AS "Vista"
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'v_facturas_electronicas_completas',
    'v_configuracion_factus_publica'
  )
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 6. ESTADÍSTICAS DE MIGRACIÓN
-- ============================================================================

\echo '6. ESTADÍSTICAS:'
\echo ''

SELECT
  'Tipos de Documento DIAN' AS "Concepto",
  COUNT(*) AS "Cantidad"
FROM tipos_documento_dian
UNION ALL
SELECT
  'Configuraciones Factus' AS "Concepto",
  COUNT(*) AS "Cantidad"
FROM configuracion_factus
UNION ALL
SELECT
  'Clientes con tipo_documento_dian' AS "Concepto",
  COUNT(*) AS "Cantidad"
FROM clientes
WHERE tipo_documento_dian IS NOT NULL
UNION ALL
SELECT
  'Huéspedes con tipo_documento_dian' AS "Concepto",
  COUNT(*) AS "Cantidad"
FROM huespedes
WHERE tipo_documento_dian IS NOT NULL;

\echo ''

-- ============================================================================
-- 7. PRUEBA DE CONFIGURACIÓN
-- ============================================================================

\echo '7. CONFIGURACIÓN ACTUAL DE FACTUS:'
\echo ''

SELECT * FROM v_configuracion_factus_publica;

\echo ''
\echo '============================================================================'
\echo 'VERIFICACIÓN COMPLETADA'
\echo '============================================================================'
\echo ''
\echo 'Próximos pasos:'
\echo '  1. Revisar que todas las tablas estén creadas (✓)'
\echo '  2. Verificar datos iniciales (7 tipos de documento DIAN, 1 configuración Factus)'
\echo '  3. Probar conexión con Factus (Fase 1.5)'
\echo '  4. Continuar con Fase 2 - Backend (FactusService.js)'
\echo ''