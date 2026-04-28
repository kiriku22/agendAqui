-- ============================================================================
-- Migracion 035: Tabla configuracion_licencia
-- Descripcion: Almacena datos de licencia del sistema (singleton)
-- Fecha: 2026-02-23
-- Basado en: docs/GUIA_IMPLEMENTACION_LICENCIAS.md
-- ============================================================================

SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================================
-- TABLA: configuracion_licencia (singleton)
-- Almacena el estado de licencia del sistema
-- Los datos del comercio (NIT, nombre, razon_social) se obtienen de datos_hotel
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_licencia (
  id SERIAL PRIMARY KEY,

  -- ==========================================
  -- SECCION: LICENCIA
  -- ==========================================
  codigo_licencia VARCHAR(64),              -- Codigo de 32 caracteres hex
  huella_licencia VARCHAR(64),              -- HMAC-SHA256 generado por el gestor
  tipo_licencia VARCHAR(50),                -- compra, renta_mensual, renta_trimestral, renta_anual, prueba
  fecha_activacion DATE,                    -- Cuando se activo la licencia
  fecha_vencimiento_licencia DATE,          -- Cuando expira (NULL para compra/permanente)
  estado_licencia VARCHAR(50) DEFAULT 'sin_activar',  -- sin_activar, activa, gracia, vencida, suspendida
  solicitud_licencia_id INTEGER,            -- ID de la solicitud en gestor (opcional, para referencia)
  dias_gracia INTEGER DEFAULT 15,           -- Dias de gracia despues de vencer

  -- ==========================================
  -- SECCION: MODULOS (JSON de modulos activos)
  -- ==========================================
  modulos JSONB DEFAULT '[]'::jsonb,        -- Array de modulos habilitados
  modulos_version VARCHAR(50),              -- Version para sincronizacion con gestor

  -- ==========================================
  -- TIMESTAMPS
  -- ==========================================
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indice unico para garantizar singleton (solo un registro)
-- El truco ((1)) crea un valor constante, permitiendo solo una fila
CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracion_licencia_singleton
  ON configuracion_licencia ((1));

-- Trigger para actualizar updated_at automaticamente
-- Usa la funcion existente update_updated_at_column()
CREATE TRIGGER update_configuracion_licencia_updated_at
  BEFORE UPDATE ON configuracion_licencia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACION
-- ============================================================================

COMMENT ON TABLE configuracion_licencia IS 'Configuracion de licencia del sistema (tabla singleton - solo un registro)';
COMMENT ON COLUMN configuracion_licencia.codigo_licencia IS 'Codigo de licencia de 32 caracteres hexadecimales proporcionado por el gestor';
COMMENT ON COLUMN configuracion_licencia.huella_licencia IS 'Huella criptografica HMAC-SHA256 generada por el gestor para validacion offline';
COMMENT ON COLUMN configuracion_licencia.tipo_licencia IS 'Tipo: compra (permanente), renta_mensual, renta_trimestral, renta_anual, prueba';
COMMENT ON COLUMN configuracion_licencia.estado_licencia IS 'Estados posibles: sin_activar, activa, gracia, vencida, suspendida';
COMMENT ON COLUMN configuracion_licencia.dias_gracia IS 'Numero de dias de gracia despues del vencimiento (default: 15)';
COMMENT ON COLUMN configuracion_licencia.modulos IS 'Array JSON de modulos habilitados para esta licencia';
COMMENT ON COLUMN configuracion_licencia.modulos_version IS 'Version de modulos para detectar cambios en sincronizacion';

-- ============================================================================
-- INSERTAR REGISTRO INICIAL (singleton)
-- ============================================================================

INSERT INTO configuracion_licencia (
  id,
  estado_licencia,
  dias_gracia,
  modulos
) VALUES (
  1,
  'sin_activar',
  15,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICACION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM configuracion_licencia;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migracion 035 completada exitosamente';
  RAISE NOTICE 'Tabla configuracion_licencia creada';
  RAISE NOTICE 'Registros: %', v_count;
  RAISE NOTICE '========================================';
END $$;
