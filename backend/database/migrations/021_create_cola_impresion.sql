-- ============================================================================
-- MIGRACIÓN 021: Crear tabla cola_impresion
-- Sistema de cola de impresión para el agente local
-- ============================================================================

-- Tabla principal de cola de impresión
CREATE TABLE IF NOT EXISTS cola_impresion (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,                -- 'factura', 'cierre'
  documento_id INT NOT NULL,                -- ID de factura o turno_caja
  impresora_destino VARCHAR(255),           -- NULL = impresora predeterminada
  datos_json TEXT NOT NULL,                 -- JSON completo con datos para formatear
  estado VARCHAR(20) DEFAULT 'pendiente',   -- 'pendiente', 'procesando', 'impreso', 'error'
  prioridad INT DEFAULT 5,                  -- 1=alta prioridad, 10=baja prioridad
  intentos INT DEFAULT 0,                   -- Número de intentos realizados
  max_intentos INT DEFAULT 3,               -- Máximo de intentos antes de marcar error
  error_mensaje TEXT,                       -- Mensaje de error si falla
  agente_id VARCHAR(100),                   -- ID del agente que procesó el trabajo
  created_at TIMESTAMP DEFAULT NOW(),
  procesado_at TIMESTAMP                    -- Fecha de procesamiento exitoso
);

-- Índices para optimizar consultas del agente
CREATE INDEX IF NOT EXISTS idx_cola_estado ON cola_impresion(estado);
CREATE INDEX IF NOT EXISTS idx_cola_prioridad ON cola_impresion(prioridad, created_at);
CREATE INDEX IF NOT EXISTS idx_cola_tipo ON cola_impresion(tipo);
CREATE INDEX IF NOT EXISTS idx_cola_created ON cola_impresion(created_at);

-- Comentarios descriptivos
COMMENT ON TABLE cola_impresion IS 'Cola de trabajos de impresión para el agente local';
COMMENT ON COLUMN cola_impresion.tipo IS 'Tipo de documento: factura, cierre';
COMMENT ON COLUMN cola_impresion.documento_id IS 'ID del documento original (factura_id o turno_caja_id)';
COMMENT ON COLUMN cola_impresion.impresora_destino IS 'Nombre de impresora específica, NULL usa la predeterminada';
COMMENT ON COLUMN cola_impresion.datos_json IS 'JSON con todos los datos necesarios para formatear e imprimir';
COMMENT ON COLUMN cola_impresion.estado IS 'Estado: pendiente, procesando, impreso, error';
COMMENT ON COLUMN cola_impresion.prioridad IS 'Prioridad 1-10 (1=máxima, 10=mínima)';
COMMENT ON COLUMN cola_impresion.agente_id IS 'Identificador único del agente que procesó el trabajo';
