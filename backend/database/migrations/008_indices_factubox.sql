-- ============================================================================
-- MIGRACIÓN 008: ÍNDICES DE OPTIMIZACIÓN PARA FACTUBOX
-- ============================================================================
-- Fecha: 9 de diciembre de 2025
-- Objetivo: Crear índices para mejorar el rendimiento de queries en FactuBox
-- ============================================================================

-- Índices en facturas_electronicas
-- ============================================================================

-- Índice compuesto para filtros comunes (fecha + estado)
CREATE INDEX IF NOT EXISTS idx_fe_fecha_estado
ON facturas_electronicas(fecha_envio, estado_dian);

-- Índice para búsqueda por CUFE
CREATE INDEX IF NOT EXISTS idx_fe_cufe
ON facturas_electronicas(cufe);

-- Índice para join con facturas (ya debe existir por FK, pero lo aseguramos)
CREATE INDEX IF NOT EXISTS idx_fe_factura_id
ON facturas_electronicas(factura_id);

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_fe_created_at
ON facturas_electronicas(created_at DESC);


-- Índices en notas_credito
-- ============================================================================

-- Índice para ordenamiento por fecha de emisión
CREATE INDEX IF NOT EXISTS idx_nc_fecha
ON notas_credito(created_at DESC);

-- Índice para join con facturas_electronicas
CREATE INDEX IF NOT EXISTS idx_nc_fe_id
ON notas_credito(factura_electronica_id);

-- Índice para búsqueda por CUFE
CREATE INDEX IF NOT EXISTS idx_nc_cufe
ON notas_credito(cufe);


-- Índices en facturas (para mejorar joins de FactuBox)
-- ============================================================================

-- Índice para búsqueda por número de factura
CREATE INDEX IF NOT EXISTS idx_facturas_numero
ON facturas(numero_factura);

-- Índice para ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_facturas_fecha
ON facturas(fecha DESC);

-- Índice para join con hospedajes
CREATE INDEX IF NOT EXISTS idx_facturas_hospedaje_id
ON facturas(hospedaje_id);

-- Índice para join con clientes
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id
ON facturas(cliente_id);


-- Índices en huespedes y clientes (para búsquedas de FactuBox)
-- ============================================================================

-- Índice para búsqueda por nombre completo en huespedes
CREATE INDEX IF NOT EXISTS idx_huespedes_nombre
ON huespedes(nombre_completo);

-- Índice para búsqueda por documento en huespedes
CREATE INDEX IF NOT EXISTS idx_huespedes_documento
ON huespedes(numero_documento);

-- Índice para búsqueda por nombre completo en clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre
ON clientes(nombre_completo);

-- Índice para búsqueda por documento en clientes
CREATE INDEX IF NOT EXISTS idx_clientes_documento
ON clientes(numero_documento);


-- ============================================================================
-- ANÁLISIS DE RENDIMIENTO
-- ============================================================================

-- Analizar tablas para actualizar estadísticas del query planner
ANALYZE facturas_electronicas;
ANALYZE notas_credito;
ANALYZE facturas;
ANALYZE huespedes;
ANALYZE clientes;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON INDEX idx_fe_fecha_estado IS 'Índice compuesto para filtros de fecha y estado en FactuBox';
COMMENT ON INDEX idx_fe_cufe IS 'Índice para búsqueda rápida por CUFE en FactuBox';
COMMENT ON INDEX idx_nc_fecha IS 'Índice para ordenamiento de notas de crédito por fecha';

-- ============================================================================
-- FIN DE MIGRACIÓN 008
-- ============================================================================

-- Verificar índices creados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('facturas_electronicas', 'notas_credito', 'facturas', 'huespedes', 'clientes')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
