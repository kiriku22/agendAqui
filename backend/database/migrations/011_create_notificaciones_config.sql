-- ============================================================================
-- Migración 011: Tabla notificaciones_config
-- Descripción: Configuración de notificaciones (Email, SMS, WhatsApp)
-- Fecha: 2025-01
-- ============================================================================

-- Tabla singleton para configuración de notificaciones
CREATE TABLE notificaciones_config (
  id SERIAL PRIMARY KEY,

  -- Email Configuration
  email_habilitado BOOLEAN DEFAULT true,
  email_servidor VARCHAR(255) DEFAULT 'smtp.gmail.com',
  email_puerto INT DEFAULT 587,
  email_usuario VARCHAR(255),
  email_password VARCHAR(255),
  email_remitente VARCHAR(255),
  email_nombre_remitente VARCHAR(255) DEFAULT 'Hotel Factufy',
  email_usa_tls BOOLEAN DEFAULT true,

  -- SMS Configuration
  sms_habilitado BOOLEAN DEFAULT false,
  sms_proveedor VARCHAR(50) CHECK (sms_proveedor IN ('twilio', 'messagebird', 'nexmo', 'local')),
  sms_api_key VARCHAR(255),
  sms_api_secret VARCHAR(255),
  sms_remitente VARCHAR(20),
  sms_credenciales JSONB,

  -- WhatsApp Configuration
  whatsapp_habilitado BOOLEAN DEFAULT false,
  whatsapp_proveedor VARCHAR(50) CHECK (whatsapp_proveedor IN ('twilio', 'messagebird', 'gupshup', 'api_oficial')),
  whatsapp_api_key VARCHAR(255),
  whatsapp_api_secret VARCHAR(255),
  whatsapp_numero VARCHAR(20),
  whatsapp_credenciales JSONB,

  -- Notificaciones de Reservas
  notif_nueva_reserva_email BOOLEAN DEFAULT true,
  notif_nueva_reserva_sms BOOLEAN DEFAULT false,
  notif_nueva_reserva_whatsapp BOOLEAN DEFAULT false,

  notif_confirmacion_reserva_email BOOLEAN DEFAULT true,
  notif_confirmacion_reserva_sms BOOLEAN DEFAULT true,
  notif_confirmacion_reserva_whatsapp BOOLEAN DEFAULT false,

  notif_cancelacion_reserva_email BOOLEAN DEFAULT true,
  notif_cancelacion_reserva_sms BOOLEAN DEFAULT true,
  notif_cancelacion_reserva_whatsapp BOOLEAN DEFAULT false,

  notif_recordatorio_checkin_email BOOLEAN DEFAULT true,
  notif_recordatorio_checkin_sms BOOLEAN DEFAULT false,
  notif_recordatorio_checkin_whatsapp BOOLEAN DEFAULT false,
  notif_dias_antes_recordatorio INT DEFAULT 1,

  -- Notificaciones de Hospedaje
  notif_checkin_email BOOLEAN DEFAULT true,
  notif_checkin_sms BOOLEAN DEFAULT false,
  notif_checkin_whatsapp BOOLEAN DEFAULT false,

  notif_checkout_email BOOLEAN DEFAULT true,
  notif_checkout_sms BOOLEAN DEFAULT false,
  notif_checkout_whatsapp BOOLEAN DEFAULT false,

  -- Notificaciones de Facturación
  notif_factura_email BOOLEAN DEFAULT true,
  notif_factura_sms BOOLEAN DEFAULT false,
  notif_factura_whatsapp BOOLEAN DEFAULT false,

  -- Notificaciones Administrativas
  notif_stock_bajo_email BOOLEAN DEFAULT true,
  notif_vencimiento_resolucion_email BOOLEAN DEFAULT true,
  notif_habitaciones_sucias_email BOOLEAN DEFAULT true,

  emails_admin TEXT, -- Emails separados por comas para notificaciones admin

  -- Plantillas personalizables (IDs de plantillas o contenido)
  plantilla_confirmacion_reserva TEXT,
  plantilla_recordatorio_checkin TEXT,
  plantilla_factura TEXT,
  plantilla_agradecimiento TEXT,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT true
);

-- Índice único para garantizar singleton (solo un registro)
CREATE UNIQUE INDEX idx_notificaciones_config_singleton ON notificaciones_config ((1));

-- Trigger para updated_at
CREATE TRIGGER update_notificaciones_config_updated_at
  BEFORE UPDATE ON notificaciones_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE notificaciones_config IS 'Configuración de notificaciones del hotel (singleton)';
COMMENT ON COLUMN notificaciones_config.email_password IS 'Contraseña cifrada para servidor SMTP';
COMMENT ON COLUMN notificaciones_config.sms_credenciales IS 'Credenciales adicionales del proveedor SMS en formato JSON';
COMMENT ON COLUMN notificaciones_config.whatsapp_credenciales IS 'Credenciales adicionales del proveedor WhatsApp en formato JSON';
COMMENT ON COLUMN notificaciones_config.emails_admin IS 'Lista de emails administrativos separados por comas';

-- Insertar registro inicial (singleton) con configuración por defecto
INSERT INTO notificaciones_config (
  email_habilitado,
  email_servidor,
  email_puerto,
  email_nombre_remitente,
  email_usa_tls,
  sms_habilitado,
  whatsapp_habilitado,
  notif_confirmacion_reserva_email,
  notif_factura_email,
  notif_stock_bajo_email
) VALUES (
  true,
  'smtp.gmail.com',
  587,
  'Hotel Factufy',
  true,
  false,
  false,
  true,
  true,
  true
);
