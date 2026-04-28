-- ============================================================================
-- MIGRACIÓN: Sistema Unificado de Inventario
-- Fecha: 2025-01-28
-- Descripción: Unifica servicios_hotel y productos en items_inventario
-- ============================================================================

BEGIN;

-- Tabla unificada de inventario
CREATE TABLE items_inventario (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Diferenciador clave
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('servicio', 'producto')),
  categoria_id INT, -- FK a categorias_inventario (will be set NOT NULL after migration 003)
  subcategoria VARCHAR(50),

  -- Precios
  precio_base DECIMAL(10,2) NOT NULL CHECK (precio_base >= 0),
  precio_compra DECIMAL(10,2) CHECK (precio_compra IS NULL OR precio_compra >= 0),
  iva_porcentaje DECIMAL(5,2) DEFAULT 0 CHECK (iva_porcentaje >= 0 AND iva_porcentaje <= 100),
  precio_con_iva DECIMAL(10,2),

  -- Control de inventario (solo productos)
  stock_actual INT DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INT DEFAULT 0,
  stock_maximo INT,

  -- Campos específicos de servicios
  duracion_minutos INT,

  -- Campos comunes
  unidad_medida VARCHAR(20) DEFAULT 'unidad',
  activo BOOLEAN DEFAULT true,
  imagen_url TEXT,
  permite_fracciones BOOLEAN DEFAULT false,

  -- Metadata
  proveedor VARCHAR(200),
  ubicacion_almacen VARCHAR(100),
  notas TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_stock_productos CHECK (
    tipo = 'producto' OR (stock_actual = 0)
  )
);

-- Índices
CREATE INDEX idx_items_tipo ON items_inventario(tipo, activo);
CREATE INDEX idx_items_categoria ON items_inventario(categoria_id, activo);
CREATE INDEX idx_items_codigo ON items_inventario(codigo);
CREATE INDEX idx_items_stock ON items_inventario(stock_actual, stock_minimo)
  WHERE tipo = 'producto' AND activo = true;

-- Comentarios
COMMENT ON TABLE items_inventario IS 'Tabla unificada de servicios y productos del hotel';
COMMENT ON COLUMN items_inventario.tipo IS 'servicio o producto';
COMMENT ON COLUMN items_inventario.categoria_id IS 'FK a categorias_inventario';

COMMIT;
