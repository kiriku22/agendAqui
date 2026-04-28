-- ============================================================================
-- Migracion 036: Tabla impresoras
-- Descripcion: Almacena configuracion de impresoras del sistema
-- Fecha: 2026-02-23
-- Basado en: docs/GUIA_IMPLEMENTACION_IMPRESION.md
-- ============================================================================

SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================================
-- TABLA: impresoras
-- Configuracion de impresoras del sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS impresoras (
  id SERIAL PRIMARY KEY,

  -- Identificacion
  nombre VARCHAR(255) NOT NULL,             -- Nombre amigable (ej: "Caja Principal")
  tipo VARCHAR(50) NOT NULL,                -- 'factura', 'cierre'

  -- Configuracion de impresora Windows/Linux
  nombre_sistema VARCHAR(255),              -- Nombre exacto en el sistema operativo

  -- Descripcion
  descripcion TEXT,                         -- Descripcion opcional

  -- Estado
  activa BOOLEAN DEFAULT true,              -- Si esta activa
  es_predeterminada BOOLEAN DEFAULT false,  -- Si es predeterminada para su tipo

  -- Configuracion de papel
  ancho_papel INTEGER DEFAULT 80,           -- Ancho en mm (58 o 80)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar updated_at automaticamente
-- Usa la funcion existente update_updated_at_column()
CREATE TRIGGER trigger_update_impresora_timestamp
  BEFORE UPDATE ON impresoras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indices para optimizacion
CREATE INDEX IF NOT EXISTS idx_impresoras_tipo ON impresoras(tipo);
CREATE INDEX IF NOT EXISTS idx_impresoras_activa ON impresoras(activa);
CREATE INDEX IF NOT EXISTS idx_impresoras_predeterminada ON impresoras(tipo, es_predeterminada) WHERE es_predeterminada = true;

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACION
-- ============================================================================

COMMENT ON TABLE impresoras IS 'Impresoras configuradas para el sistema de impresion';
COMMENT ON COLUMN impresoras.nombre IS 'Nombre amigable de la impresora (ej: Caja Principal, Cocina)';
COMMENT ON COLUMN impresoras.tipo IS 'Tipo de documentos que imprime: factura, cierre';
COMMENT ON COLUMN impresoras.nombre_sistema IS 'Nombre exacto de la impresora en Windows/Linux';
COMMENT ON COLUMN impresoras.es_predeterminada IS 'Si es la impresora predeterminada para su tipo';
COMMENT ON COLUMN impresoras.ancho_papel IS 'Ancho del papel en mm: 58 (compacto) o 80 (estandar)';

COMMIT;

-- ============================================================================
-- VERIFICACION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_name = 'impresoras';

  IF v_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migracion 036 completada exitosamente';
    RAISE NOTICE 'Tabla impresoras creada';
    RAISE NOTICE '========================================';
  ELSE
    RAISE EXCEPTION 'Error: Tabla impresoras no fue creada';
  END IF;
END $$;
