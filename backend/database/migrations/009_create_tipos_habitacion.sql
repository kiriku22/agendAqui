-- ============================================================================
-- Migración 009: Tabla tipos_habitacion
-- Descripción: Catálogo de tipos de habitación (migración desde ENUM)
-- Fecha: 2025-01
-- ============================================================================

-- Tabla de tipos de habitación
CREATE TABLE tipos_habitacion (
  codigo VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  capacidad_adultos INT NOT NULL DEFAULT 2 CHECK (capacidad_adultos > 0),
  capacidad_ninos INT NOT NULL DEFAULT 0 CHECK (capacidad_ninos >= 0),
  precio_base DECIMAL(10,2) NOT NULL CHECK (precio_base >= 0),
  metros_cuadrados DECIMAL(6,2),
  comodidades JSONB DEFAULT '[]'::jsonb,
  orden INT NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_tipos_habitacion_activo ON tipos_habitacion(activo);
CREATE INDEX idx_tipos_habitacion_orden ON tipos_habitacion(orden);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_habitacion_updated_at
  BEFORE UPDATE ON tipos_habitacion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE tipos_habitacion IS 'Catálogo de tipos de habitación configurables';
COMMENT ON COLUMN tipos_habitacion.codigo IS 'Código único del tipo (ej: simple, doble, suite)';
COMMENT ON COLUMN tipos_habitacion.comodidades IS 'Array JSON de comodidades (ej: ["WiFi", "TV", "Minibar"])';
COMMENT ON COLUMN tipos_habitacion.precio_base IS 'Precio base por noche (puede ser sobrescrito por habitación específica)';

-- Migrar datos desde el ENUM actual (TipoHabitacion)
INSERT INTO tipos_habitacion (codigo, nombre, capacidad_adultos, capacidad_ninos, precio_base, metros_cuadrados, comodidades, orden, descripcion) VALUES
(
  'simple',
  'Habitación Simple',
  1,
  1,
  80000,
  15.00,
  '["WiFi", "TV", "Escritorio", "Baño privado"]'::jsonb,
  1,
  'Habitación individual con cama sencilla, ideal para viajeros solos'
),
(
  'doble',
  'Habitación Doble',
  2,
  2,
  120000,
  20.00,
  '["WiFi", "TV", "Escritorio", "Baño privado", "Aire acondicionado"]'::jsonb,
  2,
  'Habitación con cama doble o dos camas sencillas'
),
(
  'suite',
  'Suite',
  2,
  2,
  200000,
  35.00,
  '["WiFi", "TV", "Escritorio", "Baño privado", "Aire acondicionado", "Minibar", "Sofá", "Vista panorámica"]'::jsonb,
  3,
  'Suite espaciosa con sala de estar separada'
),
(
  'familiar',
  'Habitación Familiar',
  4,
  3,
  250000,
  40.00,
  '["WiFi", "TV", "Aire acondicionado", "Baño privado", "Minibar", "Camas múltiples"]'::jsonb,
  4,
  'Habitación amplia ideal para familias con niños'
),
(
  'presidencial',
  'Suite Presidencial',
  2,
  2,
  500000,
  60.00,
  '["WiFi", "TV", "Escritorio", "Baño privado con jacuzzi", "Aire acondicionado", "Minibar", "Sofá", "Vista panorámica", "Cocina", "Comedor", "Sala de estar"]'::jsonb,
  5,
  'Suite de lujo con todas las comodidades premium'
);

-- NOTA IMPORTANTE: Después de ejecutar esta migración, se debe:
-- 1. Agregar columna tipo_habitacion a la tabla habitaciones si no existe
-- 2. Migrar los valores del ENUM al nuevo campo VARCHAR
-- 3. Crear FK: ALTER TABLE habitaciones ADD CONSTRAINT fk_habitacion_tipo
--    FOREIGN KEY (tipo_habitacion) REFERENCES tipos_habitacion(codigo);
-- 4. Eliminar el ENUM TipoHabitacion del schema una vez migrados todos los datos
