-- ============================================================================
-- MIGRATION: 013_modulo_consecutivos.sql
-- DESCRIPCIÓN: Crear tabla resoluciones_dian para centralizar consecutivos
-- FECHA: 2025-12-27
-- ============================================================================

-- 1. Crear tabla resoluciones_dian
CREATE TABLE IF NOT EXISTS resoluciones_dian (
  id SERIAL PRIMARY KEY,
  tipo_documento VARCHAR(20) NOT NULL,      -- 'factura', 'nota_credito', 'doc_soporte'
  nombre VARCHAR(100) NOT NULL,              -- Nombre descriptivo
  resolucion VARCHAR(100),                   -- Número de resolución DIAN
  prefijo VARCHAR(10) NOT NULL,              -- Ej: "SETP", "NC", "DS"
  numero_inicial BIGINT NOT NULL,            -- Rango inicio
  numero_final BIGINT NOT NULL,              -- Rango fin
  numero_actual BIGINT NOT NULL,             -- Contador actual (próximo a usar)
  fecha_inicio DATE,                         -- Vigencia desde
  fecha_fin DATE,                            -- Vigencia hasta
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Validaciones
  CONSTRAINT check_tipo_documento CHECK (tipo_documento IN ('factura', 'nota_credito', 'doc_soporte')),
  CONSTRAINT check_rango_valido CHECK (numero_inicial <= numero_final),
  CONSTRAINT check_actual_en_rango CHECK (numero_actual >= numero_inicial AND numero_actual <= numero_final)
);

-- 2. Índice para buscar resolución activa por tipo
CREATE INDEX IF NOT EXISTS idx_resoluciones_tipo_activo
ON resoluciones_dian(tipo_documento, activo)
WHERE activo = true;

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_resoluciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_resoluciones_updated_at ON resoluciones_dian;
CREATE TRIGGER trigger_resoluciones_updated_at
  BEFORE UPDATE ON resoluciones_dian
  FOR EACH ROW
  EXECUTE FUNCTION update_resoluciones_updated_at();

-- 4. Función para obtener el siguiente número de forma atómica
CREATE OR REPLACE FUNCTION obtener_siguiente_numero_dian(p_tipo_documento VARCHAR)
RETURNS TABLE(prefijo VARCHAR, numero BIGINT, numero_formateado VARCHAR) AS $$
DECLARE
  v_resolucion RECORD;
BEGIN
  -- Obtener resolución activa con bloqueo para evitar condiciones de carrera
  SELECT r.* INTO v_resolucion
  FROM resoluciones_dian r
  WHERE r.tipo_documento = p_tipo_documento
    AND r.activo = true
  FOR UPDATE;

  -- Validar que existe resolución activa
  IF v_resolucion IS NULL THEN
    RAISE EXCEPTION 'No hay resolución activa para tipo: %', p_tipo_documento;
  END IF;

  -- Validar vigencia
  IF v_resolucion.fecha_fin IS NOT NULL AND v_resolucion.fecha_fin < CURRENT_DATE THEN
    RAISE EXCEPTION 'La resolución % ha vencido el %', v_resolucion.resolucion, v_resolucion.fecha_fin;
  END IF;

  -- Validar que no se ha agotado el rango
  IF v_resolucion.numero_actual > v_resolucion.numero_final THEN
    RAISE EXCEPTION 'Rango agotado para resolución %. Máximo: %', v_resolucion.resolucion, v_resolucion.numero_final;
  END IF;

  -- Guardar valores a retornar
  prefijo := v_resolucion.prefijo;
  numero := v_resolucion.numero_actual;
  numero_formateado := v_resolucion.prefijo || v_resolucion.numero_actual::TEXT;

  -- Incrementar contador
  UPDATE resoluciones_dian
  SET numero_actual = numero_actual + 1,
      updated_at = NOW()
  WHERE id = v_resolucion.id;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Migrar datos existentes de configuracion_factus (si existen)
DO $$
DECLARE
  v_config RECORD;
BEGIN
  -- Buscar configuración activa de Factus
  SELECT * INTO v_config
  FROM configuracion_factus
  WHERE activo = true
  LIMIT 1;

  -- Si existe configuración, migrar a resoluciones_dian
  IF v_config IS NOT NULL AND v_config.prefijo_factura IS NOT NULL THEN
    -- Verificar si ya existe resolución de facturas
    IF NOT EXISTS (SELECT 1 FROM resoluciones_dian WHERE tipo_documento = 'factura') THEN
      INSERT INTO resoluciones_dian (
        tipo_documento,
        nombre,
        resolucion,
        prefijo,
        numero_inicial,
        numero_final,
        numero_actual,
        fecha_inicio,
        fecha_fin,
        activo
      ) VALUES (
        'factura',
        'Facturas Electrónicas',
        COALESCE(v_config.resolucion_dian, '18760000001'),
        COALESCE(v_config.prefijo_factura, 'SETP'),
        COALESCE(v_config.numero_inicial_factura, 990000001),
        COALESCE(v_config.numero_final_factura, 999999999),
        COALESCE(v_config.numero_actual_factura, 990000001),
        v_config.fecha_inicio_resolucion,
        v_config.fecha_fin_resolucion,
        true
      );
      RAISE NOTICE 'Migrada resolución de facturas desde configuracion_factus';
    END IF;
  END IF;

  -- Crear resolución de notas crédito si no existe
  IF NOT EXISTS (SELECT 1 FROM resoluciones_dian WHERE tipo_documento = 'nota_credito') THEN
    INSERT INTO resoluciones_dian (
      tipo_documento,
      nombre,
      resolucion,
      prefijo,
      numero_inicial,
      numero_final,
      numero_actual,
      activo
    ) VALUES (
      'nota_credito',
      'Notas de Crédito',
      NULL,
      'NC',
      1,
      999999,
      1,
      false  -- Inactiva por defecto hasta que se configure
    );
    RAISE NOTICE 'Creada resolución de notas crédito (inactiva)';
  END IF;

  -- Crear resolución de documentos soporte si no existe
  IF NOT EXISTS (SELECT 1 FROM resoluciones_dian WHERE tipo_documento = 'doc_soporte') THEN
    INSERT INTO resoluciones_dian (
      tipo_documento,
      nombre,
      resolucion,
      prefijo,
      numero_inicial,
      numero_final,
      numero_actual,
      activo
    ) VALUES (
      'doc_soporte',
      'Documentos Soporte',
      NULL,
      'DS',
      1,
      999999,
      1,
      false  -- Inactiva por defecto hasta que se configure
    );
    RAISE NOTICE 'Creada resolución de documentos soporte (inactiva)';
  END IF;
END;
$$;

-- 6. Vista para mostrar información de resoluciones con cálculos
CREATE OR REPLACE VIEW v_resoluciones_dian AS
SELECT
  r.*,
  (r.numero_actual - r.numero_inicial) as numeros_usados,
  (r.numero_final - r.numero_actual + 1) as numeros_disponibles,
  ROUND(
    ((r.numero_actual - r.numero_inicial)::NUMERIC /
     NULLIF((r.numero_final - r.numero_inicial + 1)::NUMERIC, 0)) * 100,
    2
  ) as porcentaje_uso,
  CASE
    WHEN r.fecha_fin IS NULL THEN 'Sin límite'
    WHEN r.fecha_fin < CURRENT_DATE THEN 'Vencida'
    WHEN r.fecha_fin < CURRENT_DATE + INTERVAL '30 days' THEN 'Por vencer'
    ELSE 'Vigente'
  END as estado_vigencia
FROM resoluciones_dian r;

-- 7. Comentarios
COMMENT ON TABLE resoluciones_dian IS 'Configuración de resoluciones DIAN para numeración de documentos electrónicos';
COMMENT ON FUNCTION obtener_siguiente_numero_dian(VARCHAR) IS 'Obtiene el siguiente número de forma atómica e incrementa el contador';
COMMENT ON VIEW v_resoluciones_dian IS 'Vista con información calculada de resoluciones';

-- 8. Verificar migración
DO $$
BEGIN
  RAISE NOTICE '=== Migración 013 completada ===';
  RAISE NOTICE 'Resoluciones creadas:';
  PERFORM * FROM (
    SELECT tipo_documento, prefijo, numero_actual, activo
    FROM resoluciones_dian
    ORDER BY tipo_documento
  ) t;
END;
$$;
