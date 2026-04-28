-- ============================================================================
-- SEEDS: Datos Iniciales de Inventario
-- Fecha: 2025-01-28
-- Descripción: Categorías de productos y productos de ejemplo
-- ============================================================================

BEGIN;

-- Categorías de productos
INSERT INTO categorias_inventario (nombre, descripcion, tipo, color, icono, orden) VALUES
('bebidas_alcoholicas', 'Bebidas con alcohol', 'producto', '#ef4444', 'FaWineGlass', 10),
('bebidas_no_alcoholicas', 'Agua, jugos, gaseosas', 'producto', '#06b6d4', 'FaGlassCheers', 11),
('snacks', 'Snacks y aperitivos', 'producto', '#f59e0b', 'FaCookie', 12),
('alimentos', 'Alimentos empacados', 'producto', '#10b981', 'FaBreadSlice', 13),
('higiene_personal', 'Productos de higiene', 'producto', '#8b5cf6', 'FaSoap', 14),
('amenities', 'Amenidades del hotel', 'producto', '#ec4899', 'FaBath', 15),
('souvenirs', 'Recuerdos y artículos del hotel', 'producto', '#f59e0b', 'FaGift', 16),
('farmacia', 'Medicamentos básicos', 'producto', '#ef4444', 'FaPills', 17),
('otro_producto', 'Otros productos', 'producto', '#6b7280', 'FaBox', 99)
ON CONFLICT (nombre) DO NOTHING;

-- Productos iniciales de ejemplo
INSERT INTO items_inventario (codigo, nombre, descripcion, tipo, categoria_id, precio_base, iva_porcentaje, stock_actual, stock_minimo, unidad_medida, ubicacion_almacen, precio_compra, activo) VALUES
-- Bebidas no alcohólicas (categoria_id se obtiene del INSERT anterior)
('PROD-001', 'Agua Mineral 500ml', 'Agua embotellada', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'bebidas_no_alcoholicas'), 3000, 0, 50, 10, 'unidad', 'Bodega Principal', 1500, true),
('PROD-002', 'Gaseosa Cola 350ml', 'Bebida gaseosa', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'bebidas_no_alcoholicas'), 3500, 19, 40, 10, 'unidad', 'Bodega Principal', 2000, true),
('PROD-003', 'Jugo Natural 300ml', 'Jugo de frutas', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'bebidas_no_alcoholicas'), 5000, 19, 25, 8, 'unidad', 'Bodega Principal', 2500, true),

-- Bebidas alcohólicas
('PROD-004', 'Cerveza Nacional 330ml', 'Cerveza local', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'bebidas_alcoholicas'), 5000, 19, 30, 12, 'unidad', 'Bodega Principal', 3000, true),
('PROD-005', 'Vino Tinto Copa 150ml', 'Vino tinto', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'bebidas_alcoholicas'), 12000, 19, 20, 6, 'unidad', 'Bodega Principal', 6000, true),

-- Snacks
('PROD-006', 'Papas Fritas 45g', 'Snack salado', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'snacks'), 4000, 19, 25, 8, 'unidad', 'Bodega Principal', 2000, true),
('PROD-007', 'Chocolatina 50g', 'Chocolate', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'snacks'), 3000, 19, 30, 10, 'unidad', 'Bodega Principal', 1500, true),
('PROD-008', 'Galletas Pack 100g', 'Galletas surtidas', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'snacks'), 3500, 19, 20, 8, 'unidad', 'Bodega Principal', 1800, true),

-- Higiene personal
('PROD-009', 'Kit Dental Completo', 'Cepillo + pasta', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'higiene_personal'), 8000, 0, 20, 5, 'unidad', 'Bodega Principal', 4000, true),
('PROD-010', 'Shampoo Mini 50ml', 'Shampoo individual', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'higiene_personal'), 6000, 0, 15, 5, 'unidad', 'Bodega Principal', 3000, true),

-- Amenities
('PROD-011', 'Pantuflas Desechables', 'Par de pantuflas', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'amenities'), 10000, 0, 15, 5, 'par', 'Bodega Principal', 5000, true),
('PROD-012', 'Bata de Baño', 'Bata de baño', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'amenities'), 35000, 0, 8, 3, 'unidad', 'Lavandería', 18000, true),

-- Souvenirs
('PROD-013', 'Camiseta Logo Hotel', 'Camiseta con logo', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'souvenirs'), 35000, 19, 30, 10, 'unidad', 'Recepción', 15000, true),
('PROD-014', 'Llavero Hotel', 'Llavero metálico', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'souvenirs'), 8000, 19, 50, 15, 'unidad', 'Recepción', 3000, true),
('PROD-015', 'Taza Cerámica Logo', 'Taza con diseño', 'producto', (SELECT id FROM categorias_inventario WHERE nombre = 'souvenirs'), 18000, 19, 25, 8, 'unidad', 'Recepción', 8000, true)
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
