-- ============================================================================
-- MIGRACIÓN: Actualizar Consumos Habitación con Item Inventario
-- Fecha: 2025-01-28
-- Descripción: Agregar item_inventario_id y migrar consumos existentes
-- ============================================================================

BEGIN;

-- Agregar nueva columna
ALTER TABLE consumos_habitacion ADD COLUMN item_inventario_id INT;

-- FK
ALTER TABLE consumos_habitacion
  ADD CONSTRAINT fk_consumo_item
  FOREIGN KEY (item_inventario_id) REFERENCES items_inventario(id);

-- Validate migration readiness
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM consumos_habitacion WHERE producto_id IS NOT NULL) THEN
    RAISE WARNING 'Found consumos with producto_id - these will not be migrated to unified inventory';
  END IF;
END $$;

-- Migrar consumos existentes
UPDATE consumos_habitacion c
SET item_inventario_id = (
  SELECT i.id
  FROM items_inventario i
  INNER JOIN servicios_hotel s ON s.codigo = i.codigo
  WHERE s.id = c.servicio_id
)
WHERE c.servicio_id IS NOT NULL;

-- Actualizar constraint CHECK
ALTER TABLE consumos_habitacion DROP CONSTRAINT IF EXISTS chk_producto_o_servicio;
ALTER TABLE consumos_habitacion ADD CONSTRAINT chk_item_consumo
  CHECK (
    item_inventario_id IS NOT NULL OR
    producto_id IS NOT NULL OR
    servicio_id IS NOT NULL
  );

-- Add index for performance
CREATE INDEX idx_consumo_item_inventario ON consumos_habitacion(item_inventario_id);

COMMIT;
