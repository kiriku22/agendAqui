-- ============================================================================
-- Migración 010: Tabla canales_reserva
-- Descripción: Catálogo de canales de reserva (migración desde ENUM)
-- Fecha: 2025-01
-- ============================================================================

-- Tabla de canales de reserva
CREATE TABLE canales_reserva (
  codigo VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  comision_pct DECIMAL(5,2) DEFAULT 0.00 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  requiere_pago_anticipado BOOLEAN DEFAULT false,
  url_integracion VARCHAR(500),
  credenciales_api JSONB,
  configuracion JSONB,
  color_identificacion VARCHAR(7),
  icono VARCHAR(50),
  orden INT NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_canales_reserva_activo ON canales_reserva(activo);
CREATE INDEX idx_canales_reserva_orden ON canales_reserva(orden);

-- Trigger para updated_at
CREATE TRIGGER update_canales_reserva_updated_at
  BEFORE UPDATE ON canales_reserva
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE canales_reserva IS 'Catálogo de canales de reserva configurables';
COMMENT ON COLUMN canales_reserva.codigo IS 'Código único del canal (ej: directo, booking, airbnb)';
COMMENT ON COLUMN canales_reserva.comision_pct IS 'Porcentaje de comisión cobrado por el canal';
COMMENT ON COLUMN canales_reserva.credenciales_api IS 'Credenciales para integración API (JSON encriptado)';
COMMENT ON COLUMN canales_reserva.configuracion IS 'Configuración adicional específica del canal';

-- Migrar datos desde el ENUM actual (CanalReserva)
INSERT INTO canales_reserva (codigo, nombre, descripcion, comision_pct, requiere_pago_anticipado, color_identificacion, icono, orden) VALUES
(
  'directo',
  'Reserva Directa',
  'Reserva realizada directamente en el hotel (mostrador)',
  0.00,
  false,
  '#8b5cf6',
  'building',
  1
),
(
  'telefono',
  'Reserva por Teléfono',
  'Reserva realizada por llamada telefónica',
  0.00,
  false,
  '#10b981',
  'phone',
  2
),
(
  'email',
  'Reserva por Email',
  'Reserva solicitada por correo electrónico',
  0.00,
  false,
  '#3b82f6',
  'mail',
  3
),
(
  'sitio_web',
  'Sitio Web Oficial',
  'Reserva a través del sitio web del hotel',
  0.00,
  true,
  '#06b6d4',
  'globe',
  4
),
(
  'booking',
  'Booking.com',
  'Plataforma de reservas Booking.com',
  15.00,
  true,
  '#003580',
  'bookmark',
  5
),
(
  'airbnb',
  'Airbnb',
  'Plataforma de alojamiento Airbnb',
  18.00,
  true,
  '#FF5A5F',
  'home',
  6
),
(
  'expedia',
  'Expedia',
  'Plataforma de viajes Expedia',
  18.00,
  true,
  '#FFCB00',
  'plane',
  7
),
(
  'agencia_viajes',
  'Agencia de Viajes',
  'Reserva a través de agencia de viajes asociada',
  10.00,
  false,
  '#f59e0b',
  'briefcase',
  8
),
(
  'corporativo',
  'Cliente Corporativo',
  'Reserva de cliente corporativo con convenio',
  5.00,
  false,
  '#6b7280',
  'users',
  9
);

-- NOTA IMPORTANTE: Después de ejecutar esta migración, se debe:
-- 1. Agregar columna canal_reserva a la tabla reservas si no existe
-- 2. Migrar los valores del ENUM al nuevo campo VARCHAR
-- 3. Crear FK: ALTER TABLE reservas ADD CONSTRAINT fk_reserva_canal
--    FOREIGN KEY (canal_reserva) REFERENCES canales_reserva(codigo);
-- 4. Eliminar el ENUM CanalReserva del schema una vez migrados todos los datos
