-- ============================================================================
-- MIGRACIÓN: Tabla de Movimientos de Inventario
-- Fecha: 2025-01-28
-- Descripción: Historial de todos los movimientos de stock
-- ============================================================================

BEGIN;

CREATE TABLE movimientos_inventario (
  id SERIAL PRIMARY KEY,
  item_inventario_id INT NOT NULL REFERENCES items_inventario(id),
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad INT NOT NULL CHECK (cantidad != 0),
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,

  -- Referencias
  consumo_id INT REFERENCES consumos_habitacion(id),

  -- Auditoría
  motivo TEXT NOT NULL,
  usuario_id INT REFERENCES usuarios(id),
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimiento_item ON movimientos_inventario(item_inventario_id, fecha_movimiento DESC);
CREATE INDEX idx_movimiento_tipo ON movimientos_inventario(tipo_movimiento);
CREATE INDEX idx_movimiento_usuario ON movimientos_inventario(usuario_id);

COMMENT ON TABLE movimientos_inventario IS 'Historial de todos los movimientos de stock';

COMMIT;
