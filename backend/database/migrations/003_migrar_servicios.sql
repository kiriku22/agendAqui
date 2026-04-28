-- ============================================================================
-- MIGRACIÓN: Migrar Servicios Existentes a Items Inventario
-- Fecha: 2025-01-28
-- Descripción: Migra servicios_hotel a items_inventario con categorías
-- ============================================================================

BEGIN;

-- Primero crear categorías de servicios basadas en las existentes
INSERT INTO categorias_inventario (nombre, descripcion, tipo, color, icono, orden) VALUES
('lavanderia', 'Servicios de lavandería', 'servicio', '#06b6d4', 'FaTshirt', 1),
('transporte', 'Transporte y traslados', 'servicio', '#f59e0b', 'FaCar', 2),
('spa', 'Servicios de spa y masajes', 'servicio', '#ec4899', 'FaSpa', 3),
('room_service', 'Servicio a la habitación', 'servicio', '#10b981', 'FaConciergeBell', 4),
('bar', 'Consumos de bar', 'ambos', '#ef4444', 'FaGlassMartini', 5),
('restaurante', 'Servicios de restaurante', 'servicio', '#8b5cf6', 'FaUtensils', 6),
('tours', 'Tours y excursiones', 'servicio', '#3b82f6', 'FaMapMarkedAlt', 7),
('otro', 'Otros servicios', 'servicio', '#6b7280', 'FaEllipsisH', 99);

-- Migrar servicios existentes a items_inventario
INSERT INTO items_inventario (
  codigo, nombre, descripcion, tipo, categoria_id,
  precio_base, iva_porcentaje, precio_con_iva,
  unidad_medida, duracion_minutos, activo, imagen_url,
  created_at, updated_at
)
SELECT
  s.codigo,
  s.nombre,
  s.descripcion,
  'servicio' as tipo,
  c.id as categoria_id,
  s.precio,
  s.iva,
  s.precio_con_iva,
  COALESCE(s.unidad, 'servicio') as unidad_medida,
  s.duracion_minutos,
  s.activo,
  s.imagen_url,
  s.created_at,
  s.updated_at
FROM servicios_hotel s
INNER JOIN categorias_inventario c ON c.nombre = s.categoria;

-- Now that all items have categoria_id, make it NOT NULL
ALTER TABLE items_inventario ALTER COLUMN categoria_id SET NOT NULL;

COMMIT;
