-- ============================================================================
-- Migración 007: Triggers para Completar Historial de Movimientos
-- Descripción: Registrar automáticamente devoluciones y ajustes de inventario
-- Fecha: 2025-01-02
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: Revertir Stock al Eliminar Consumo (Devolución)
-- ============================================================================

-- Función: Restaurar stock y registrar devolución cuando se elimina un consumo
CREATE OR REPLACE FUNCTION revertir_stock_consumo()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
BEGIN
  -- Solo procesar si el consumo tiene producto asociado
  IF OLD.item_inventario_id IS NOT NULL THEN

    -- Obtener datos del item con lock exclusivo (evitar race conditions)
    SELECT tipo, stock_actual, nombre
    INTO item_record
    FROM items_inventario
    WHERE id = OLD.item_inventario_id
    FOR UPDATE;

    -- Solo procesar si es producto (no servicios)
    IF item_record.tipo = 'producto' THEN

      -- Restaurar stock
      UPDATE items_inventario
      SET stock_actual = stock_actual + OLD.cantidad,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.item_inventario_id;

      -- Registrar movimiento de devolución
      INSERT INTO movimientos_inventario (
        item_inventario_id,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        consumo_id,
        motivo
      ) VALUES (
        OLD.item_inventario_id,
        'devolucion',
        OLD.cantidad,
        item_record.stock_actual,
        item_record.stock_actual + OLD.cantidad,
        OLD.id,
        'Eliminación de consumo ID: ' || OLD.id
      );

    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (idempotencia)
DROP TRIGGER IF EXISTS trg_consumo_delete_revertir_stock ON consumos_habitacion;

-- Crear trigger BEFORE DELETE
CREATE TRIGGER trg_consumo_delete_revertir_stock
BEFORE DELETE ON consumos_habitacion
FOR EACH ROW EXECUTE FUNCTION revertir_stock_consumo();

-- Comentarios
COMMENT ON FUNCTION revertir_stock_consumo() IS 'Restaura stock y registra devolución al eliminar consumo';

-- ============================================================================
-- TRIGGER 2: Ajustar Stock al Modificar Cantidad de Consumo (Ajuste)
-- ============================================================================

-- Función: Ajustar stock cuando cambia la cantidad de un consumo
CREATE OR REPLACE FUNCTION ajustar_stock_consumo()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  delta_cantidad INT;
BEGIN
  -- Solo procesar si cambió la cantidad Y tiene producto asociado
  IF NEW.cantidad <> OLD.cantidad AND NEW.item_inventario_id IS NOT NULL THEN

    -- Obtener datos del item con lock exclusivo
    SELECT tipo, stock_actual, nombre
    INTO item_record
    FROM items_inventario
    WHERE id = NEW.item_inventario_id
    FOR UPDATE;

    -- Solo procesar si es producto (no servicios)
    IF item_record.tipo = 'producto' THEN

      -- Calcular diferencia (positivo = más consumo, negativo = menos consumo)
      delta_cantidad := NEW.cantidad - OLD.cantidad;

      -- Validar stock disponible si es incremento de consumo
      IF delta_cantidad > 0 AND item_record.stock_actual < delta_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para incrementar consumo. Disponible: %, Requerido adicional: %',
          item_record.stock_actual, delta_cantidad;
      END IF;

      -- Ajustar stock (delta positivo reduce stock, delta negativo incrementa stock)
      UPDATE items_inventario
      SET stock_actual = stock_actual - delta_cantidad,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.item_inventario_id;

      -- Registrar movimiento de ajuste
      INSERT INTO movimientos_inventario (
        item_inventario_id,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        consumo_id,
        motivo
      ) VALUES (
        NEW.item_inventario_id,
        'ajuste',
        ABS(delta_cantidad),
        item_record.stock_actual,
        item_record.stock_actual - delta_cantidad,
        NEW.id,
        'Ajuste de consumo ID: ' || NEW.id || ' (antes: ' || OLD.cantidad || ', ahora: ' || NEW.cantidad || ')'
      );

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (idempotencia)
DROP TRIGGER IF EXISTS trg_consumo_update_ajustar_stock ON consumos_habitacion;

-- Crear trigger AFTER UPDATE
CREATE TRIGGER trg_consumo_update_ajustar_stock
AFTER UPDATE ON consumos_habitacion
FOR EACH ROW EXECUTE FUNCTION ajustar_stock_consumo();

-- Comentarios
COMMENT ON FUNCTION ajustar_stock_consumo() IS 'Ajusta stock y registra ajuste al modificar cantidad de consumo';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Mostrar triggers creados
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name,
  CASE
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
  END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('trg_consumo_delete_revertir_stock', 'trg_consumo_update_ajustar_stock')
ORDER BY tgname;

-- ============================================================================
-- RESULTADOS ESPERADOS
-- ============================================================================

/*
 DESPUÉS DE APLICAR ESTA MIGRACIÓN:

 1. DELETE consumo → Automáticamente:
    - Restaura stock: stock_actual += cantidad
    - Registra movimiento tipo 'devolucion'

 2. UPDATE consumo.cantidad → Automáticamente:
    - Ajusta stock según diferencia
    - Registra movimiento tipo 'ajuste'

 3. INSERT consumo → Ya implementado en 006_triggers_inventario.sql:
    - Reduce stock: stock_actual -= cantidad
    - Registra movimiento tipo 'salida'

 4. Manual ajustarStock → Ya implementado en resolvers/items.js:
    - Ajusta stock según tipo (entrada/salida)
    - Registra movimiento según tipo

 RESULTADO: Trazabilidad completa de TODOS los movimientos de inventario
*/
