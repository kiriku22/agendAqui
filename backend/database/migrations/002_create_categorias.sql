-- ============================================================================
-- MIGRACIÓN: Tabla de Categorías Dinámicas de Inventario
-- Fecha: 2025-01-28
-- Descripción: Categorías configurables para servicios y productos
-- ============================================================================

BEGIN;

CREATE TABLE categorias_inventario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('servicio', 'producto', 'ambos')),
  color VARCHAR(7), -- Hex color para UI: #8b5cf6
  icono VARCHAR(50), -- Nombre del icono: FaUtensils, FaWineGlass
  orden INT DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FK en items_inventario
ALTER TABLE items_inventario
  ADD CONSTRAINT fk_item_categoria
  FOREIGN KEY (categoria_id) REFERENCES categorias_inventario(id);

-- Índices
CREATE INDEX idx_categoria_tipo ON categorias_inventario(tipo, activa);
CREATE INDEX idx_categoria_orden ON categorias_inventario(orden);

COMMENT ON TABLE categorias_inventario IS 'Categorías configurables para servicios y productos';

COMMIT;
