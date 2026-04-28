-- ============================================================================
-- Migración 008: Tabla parametros_generales
-- Descripción: Parámetros operativos del hotel (horarios, políticas, IVA)
-- Fecha: 2025-01
-- ============================================================================

-- Tabla singleton para parámetros generales
CREATE TABLE parametros_generales (
  id SERIAL PRIMARY KEY,

  -- Horarios operativos
  hora_checkin TIME DEFAULT '15:00:00',
  hora_checkout TIME DEFAULT '12:00:00',
  hora_apertura TIME DEFAULT '00:00:00',
  hora_cierre TIME DEFAULT '23:59:59',

  -- Políticas de reserva
  anticipo_minimo_pct DECIMAL(5,2) DEFAULT 30.00 CHECK (anticipo_minimo_pct >= 0 AND anticipo_minimo_pct <= 100),
  dias_cancelacion_gratuita INT DEFAULT 2,
  penalizacion_cancelacion_pct DECIMAL(5,2) DEFAULT 50.00,
  max_dias_reserva_anticipada INT DEFAULT 365,
  max_noches_por_reserva INT DEFAULT 30,

  -- Políticas de hospedaje
  tolerancia_late_checkout_min INT DEFAULT 60,
  cargo_late_checkout_pct DECIMAL(5,2) DEFAULT 50.00,
  tolerancia_early_checkin_min INT DEFAULT 60,
  cargo_early_checkin_pct DECIMAL(5,2) DEFAULT 30.00,
  permite_mascotas BOOLEAN DEFAULT false,
  cargo_mascota DECIMAL(10,2) DEFAULT 0,

  -- Configuración fiscal
  iva_hospedaje DECIMAL(5,2) DEFAULT 0.00 CHECK (iva_hospedaje >= 0 AND iva_hospedaje <= 100),
  iva_consumos DECIMAL(5,2) DEFAULT 19.00 CHECK (iva_consumos >= 0 AND iva_consumos <= 100),
  iva_servicios DECIMAL(5,2) DEFAULT 19.00 CHECK (iva_servicios >= 0 AND iva_servicios <= 100),
  aplica_retefuente BOOLEAN DEFAULT false,
  porcentaje_retefuente DECIMAL(5,2) DEFAULT 0,
  aplica_ica BOOLEAN DEFAULT false,
  porcentaje_ica DECIMAL(5,2) DEFAULT 0,

  -- Notificaciones automáticas
  enviar_confirmacion_reserva BOOLEAN DEFAULT true,
  enviar_recordatorio_checkin BOOLEAN DEFAULT true,
  dias_recordatorio_checkin INT DEFAULT 1,
  enviar_agradecimiento_checkout BOOLEAN DEFAULT true,
  enviar_factura_email BOOLEAN DEFAULT true,

  -- Alertas y límites
  alerta_stock_bajo BOOLEAN DEFAULT true,
  alerta_habitaciones_sucias INT DEFAULT 3,
  alerta_vencimiento_resolucion_dias INT DEFAULT 30,
  backup_automatico BOOLEAN DEFAULT true,
  frecuencia_backup_horas INT DEFAULT 24,

  -- Configuración de facturación
  redondeo_facturas BOOLEAN DEFAULT true,
  decimales_moneda INT DEFAULT 0 CHECK (decimales_moneda >= 0 AND decimales_moneda <= 2),
  mostrar_saldo_cuenta BOOLEAN DEFAULT true,
  dias_validez_cotizacion INT DEFAULT 15,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT true
);

-- Índice único para garantizar singleton (solo un registro)
CREATE UNIQUE INDEX idx_parametros_generales_singleton ON parametros_generales ((1));

-- Trigger para updated_at
CREATE TRIGGER update_parametros_generales_updated_at
  BEFORE UPDATE ON parametros_generales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE parametros_generales IS 'Parámetros operativos del hotel (singleton)';
COMMENT ON COLUMN parametros_generales.iva_hospedaje IS 'IVA para hospedajes - Colombia: 0% (exento)';
COMMENT ON COLUMN parametros_generales.iva_consumos IS 'IVA para consumos - Colombia: 19% (general)';
COMMENT ON COLUMN parametros_generales.anticipo_minimo_pct IS 'Porcentaje mínimo de anticipo requerido para reservas';

-- Insertar registro inicial (singleton)
INSERT INTO parametros_generales (
  hora_checkin,
  hora_checkout,
  anticipo_minimo_pct,
  dias_cancelacion_gratuita,
  iva_hospedaje,
  iva_consumos,
  iva_servicios
) VALUES (
  '15:00:00',
  '12:00:00',
  30.00,
  2,
  0.00,
  19.00,
  19.00
);
