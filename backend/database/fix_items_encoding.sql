-- ============================================================================
-- FIX: Limpiar encoding UTF-8 en categorias_inventario e items_inventario
-- ============================================================================
-- Este script corrige problemas de encoding UTF-8
-- ============================================================================

-- Ver categorías con problemas de encoding
SELECT id, nombre, descripcion
FROM categorias_inventario
ORDER BY id;

-- Limpiar nombres de categorías removiendo solo caracteres problemáticos
-- NO intentar renombrar, solo quitar bytes inválidos UTF-8
UPDATE categorias_inventario
SET nombre = REGEXP_REPLACE(nombre, '[^\x00-\x7F]+', '', 'g')
WHERE nombre IS NOT NULL
  AND nombre ~ '[^\x00-\x7F]';

-- Limpiar descripciones de categorías
UPDATE categorias_inventario
SET descripcion = REGEXP_REPLACE(descripcion, '[^\x00-\x7F]+', '', 'g')
WHERE descripcion IS NOT NULL
  AND descripcion ~ '[^\x00-\x7F]';

-- Ver items con problemas
SELECT id, codigo, nombre, descripcion, subcategoria
FROM items_inventario
ORDER BY id;

-- Limpiar subcategorías con problemas de encoding
UPDATE items_inventario
SET subcategoria = REGEXP_REPLACE(subcategoria, '[^\x00-\x7F]+', '', 'g')
WHERE subcategoria IS NOT NULL
  AND subcategoria ~ '[^\x00-\x7F]';

-- Limpiar nombres de items con problemas de encoding
UPDATE items_inventario
SET nombre = REGEXP_REPLACE(nombre, '[^\x00-\x7F]+', '', 'g')
WHERE nombre IS NOT NULL
  AND nombre ~ '[^\x00-\x7F]';

-- Limpiar descripciones de items
UPDATE items_inventario
SET descripcion = REGEXP_REPLACE(descripcion, '[^\x00-\x7F]+', '', 'g')
WHERE descripcion IS NOT NULL
  AND descripcion ~ '[^\x00-\x7F]';

-- Verificar que se corrigieron
SELECT id, nombre, descripcion
FROM categorias_inventario
ORDER BY id;

SELECT id, codigo, nombre, subcategoria
FROM items_inventario
ORDER BY id
LIMIT 20;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Categorias e items de inventario actualizados con encoding UTF-8 correcto';
END $$;
