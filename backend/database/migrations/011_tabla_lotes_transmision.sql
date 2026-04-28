-- ============================================================================
-- MIGRACIÓN 011: TABLA DE AUDITORÍA PARA TRANSMISIÓN EN LOTE
-- ============================================================================
-- Descripción: Tabla para registrar lotes de transmisión masiva de facturas
--              a DIAN vía Factus. Incluye usuario, timestamp, resultados, etc.
-- Fecha: 2025-12-22
-- Autor: Claude Code
-- ============================================================================

-- Crear tabla lotes_transmision
CREATE TABLE IF NOT EXISTS lotes_transmision (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  cantidad_total INT NOT NULL,
  cantidad_exitosa INT NOT NULL DEFAULT 0,
  cantidad_fallida INT NOT NULL DEFAULT 0,
  facturas_ids INT[] NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  duracion_segundos INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios en tabla y columnas
COMMENT ON TABLE lotes_transmision IS 'Registro de lotes de transmisión masiva de facturas a DIAN';
COMMENT ON COLUMN lotes_transmision.usuario_id IS 'ID del usuario que ejecutó el lote';
COMMENT ON COLUMN lotes_transmision.cantidad_total IS 'Cantidad total de facturas en el lote';
COMMENT ON COLUMN lotes_transmision.cantidad_exitosa IS 'Cantidad de facturas transmitidas exitosamente';
COMMENT ON COLUMN lotes_transmision.cantidad_fallida IS 'Cantidad de facturas que fallaron en la transmisión';
COMMENT ON COLUMN lotes_transmision.facturas_ids IS 'Array de IDs de facturas_electronicas incluidas en el lote';
COMMENT ON COLUMN lotes_transmision.fecha_inicio IS 'Timestamp de inicio del proceso de transmisión';
COMMENT ON COLUMN lotes_transmision.fecha_fin IS 'Timestamp de finalización del proceso de transmisión';
COMMENT ON COLUMN lotes_transmision.duracion_segundos IS 'Duración total del lote en segundos';
COMMENT ON COLUMN lotes_transmision.metadata IS 'Metadatos adicionales del lote (errores, ambiente, etc)';

-- Índices para consultas optimizadas
CREATE INDEX idx_lotes_transmision_usuario ON lotes_transmision(usuario_id);
CREATE INDEX idx_lotes_transmision_fecha ON lotes_transmision(fecha_inicio DESC);
CREATE INDEX idx_lotes_transmision_created ON lotes_transmision(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_lotes_transmision_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lotes_transmision_updated_at
  BEFORE UPDATE ON lotes_transmision
  FOR EACH ROW
  EXECUTE FUNCTION update_lotes_transmision_updated_at();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 011 completada: Tabla lotes_transmision creada exitosamente';
END $$;
