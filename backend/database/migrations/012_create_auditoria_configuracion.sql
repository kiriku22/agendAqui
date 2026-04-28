-- ============================================================================
-- Migración 012: Tabla auditoria_configuracion
-- Descripción: Auditoría de cambios en configuración del sistema
-- Fecha: 2025-01
-- ============================================================================

-- Tabla de auditoría para cambios de configuración
CREATE TABLE auditoria_configuracion (
  id SERIAL PRIMARY KEY,

  -- Identificación de la tabla y registro modificado
  tabla VARCHAR(100) NOT NULL,
  registro_id INT,

  -- Tipo de operación
  operacion VARCHAR(20) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),

  -- Valores antes y después del cambio (JSONB)
  valores_anteriores JSONB,
  valores_nuevos JSONB,

  -- Campos específicos modificados
  campos_modificados TEXT[], -- Array de nombres de campos que cambiaron

  -- Usuario que realizó el cambio
  usuario_id INT,
  usuario_nombre VARCHAR(100),
  usuario_rol VARCHAR(50),

  -- Información adicional
  ip_address VARCHAR(45),
  user_agent TEXT,
  descripcion TEXT,

  -- Timestamp
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas frecuentes
CREATE INDEX idx_auditoria_tabla ON auditoria_configuracion(tabla);
CREATE INDEX idx_auditoria_fecha ON auditoria_configuracion(fecha_hora DESC);
CREATE INDEX idx_auditoria_usuario ON auditoria_configuracion(usuario_id);
CREATE INDEX idx_auditoria_operacion ON auditoria_configuracion(operacion);
CREATE INDEX idx_auditoria_tabla_registro ON auditoria_configuracion(tabla, registro_id);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX idx_auditoria_valores_anteriores ON auditoria_configuracion USING gin(valores_anteriores);
CREATE INDEX idx_auditoria_valores_nuevos ON auditoria_configuracion USING gin(valores_nuevos);

-- Comentarios
COMMENT ON TABLE auditoria_configuracion IS 'Registro de auditoría de cambios en configuración del sistema';
COMMENT ON COLUMN auditoria_configuracion.tabla IS 'Nombre de la tabla donde ocurrió el cambio';
COMMENT ON COLUMN auditoria_configuracion.registro_id IS 'ID del registro modificado (NULL para singletons)';
COMMENT ON COLUMN auditoria_configuracion.valores_anteriores IS 'Estado anterior del registro en formato JSON';
COMMENT ON COLUMN auditoria_configuracion.valores_nuevos IS 'Estado nuevo del registro en formato JSON';
COMMENT ON COLUMN auditoria_configuracion.campos_modificados IS 'Array con nombres de los campos que cambiaron';

-- Función trigger genérica para auditar cambios en tablas de configuración
CREATE OR REPLACE FUNCTION registrar_auditoria_configuracion()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para UPDATE
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO auditoria_configuracion (
      tabla,
      registro_id,
      operacion,
      valores_anteriores,
      valores_nuevos,
      descripcion
    ) VALUES (
      TG_TABLE_NAME,
      CASE
        WHEN TG_TABLE_NAME IN ('datos_hotel', 'parametros_generales', 'notificaciones_config')
        THEN NULL  -- Singletons no tienen ID relevante
        ELSE COALESCE(NEW.id, OLD.id)
      END,
      TG_OP,
      row_to_json(OLD),
      row_to_json(NEW),
      'Actualización automática de ' || TG_TABLE_NAME
    );
    RETURN NEW;

  -- Para INSERT
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO auditoria_configuracion (
      tabla,
      registro_id,
      operacion,
      valores_nuevos,
      descripcion
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      row_to_json(NEW),
      'Creación de registro en ' || TG_TABLE_NAME
    );
    RETURN NEW;

  -- Para DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO auditoria_configuracion (
      tabla,
      registro_id,
      operacion,
      valores_anteriores,
      descripcion
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      TG_OP,
      row_to_json(OLD),
      'Eliminación de registro en ' || TG_TABLE_NAME
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a las tablas de configuración
CREATE TRIGGER trigger_audit_datos_hotel
  AFTER INSERT OR UPDATE OR DELETE ON datos_hotel
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_configuracion();

CREATE TRIGGER trigger_audit_parametros_generales
  AFTER INSERT OR UPDATE OR DELETE ON parametros_generales
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_configuracion();

CREATE TRIGGER trigger_audit_tipos_habitacion
  AFTER INSERT OR UPDATE OR DELETE ON tipos_habitacion
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_configuracion();

CREATE TRIGGER trigger_audit_canales_reserva
  AFTER INSERT OR UPDATE OR DELETE ON canales_reserva
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_configuracion();

CREATE TRIGGER trigger_audit_notificaciones_config
  AFTER INSERT OR UPDATE OR DELETE ON notificaciones_config
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_configuracion();

-- Vista para auditoría reciente (últimos 100 cambios)
CREATE OR REPLACE VIEW v_auditoria_reciente AS
SELECT
  a.id,
  a.tabla,
  a.operacion,
  a.usuario_nombre,
  a.descripcion,
  a.fecha_hora,
  CASE
    WHEN a.operacion = 'UPDATE' THEN
      (SELECT count(*)
       FROM jsonb_each(a.valores_nuevos) new_val
       JOIN jsonb_each(a.valores_anteriores) old_val
         ON new_val.key = old_val.key
       WHERE new_val.value != old_val.value)
    ELSE NULL
  END as num_campos_modificados
FROM auditoria_configuracion a
ORDER BY a.fecha_hora DESC
LIMIT 100;

COMMENT ON VIEW v_auditoria_reciente IS 'Vista de los 100 cambios más recientes en configuración';
