-- ============================================================================
-- MIGRACIÓN: Triggers para Control de Stock e Inventario
-- Fecha: 2025-01-28
-- Descripción: Triggers para updated_at, precio IVA y descuento de stock
-- ============================================================================

-- Trigger para updated_at en items_inventario
CREATE TRIGGER trigger_update_items_inventario
  BEFORE UPDATE ON items_inventario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en categorias_inventario
CREATE TRIGGER trigger_update_categorias
  BEFORE UPDATE ON categorias_inventario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular precio con IVA
CREATE OR REPLACE FUNCTION calcular_precio_con_iva_item()
RETURNS TRIGGER AS $$
BEGIN
  NEW.precio_con_iva := ROUND(NEW.precio_base * (1 + COALESCE(NEW.iva_porcentaje, 0) / 100), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_precio_iva_item
  BEFORE INSERT OR UPDATE ON items_inventario
  FOR EACH ROW EXECUTE FUNCTION calcular_precio_con_iva_item();

-- Trigger para descontar stock al agregar consumo
CREATE OR REPLACE FUNCTION registrar_movimiento_item()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  stock_disponible INT;
BEGIN
  IF NEW.item_inventario_id IS NOT NULL THEN
    -- Obtener info del item con row lock para prevenir race conditions
    SELECT tipo, stock_actual, nombre
    INTO item_record
    FROM items_inventario
    WHERE id = NEW.item_inventario_id
    FOR UPDATE;

    -- Solo descontar si es producto
    IF item_record.tipo = 'producto' THEN
      stock_disponible := item_record.stock_actual;

      -- Validar stock
      IF stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, Solicitado: %',
          item_record.nombre, stock_disponible, NEW.cantidad;
      END IF;

      -- Reducir stock
      UPDATE items_inventario
      SET stock_actual = stock_actual - NEW.cantidad,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.item_inventario_id;

      -- Registrar movimiento
      INSERT INTO movimientos_inventario (
        item_inventario_id, tipo_movimiento, cantidad,
        stock_anterior, stock_nuevo, consumo_id, usuario_id, motivo
      ) VALUES (
        NEW.item_inventario_id, 'salida', NEW.cantidad,
        stock_disponible, stock_disponible - NEW.cantidad,
        NEW.id, NEW.created_by, 'Consumo habitación'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consumo_item_stock
AFTER INSERT ON consumos_habitacion
FOR EACH ROW EXECUTE FUNCTION registrar_movimiento_item();
