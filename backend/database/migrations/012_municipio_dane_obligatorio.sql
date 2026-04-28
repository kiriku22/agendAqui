-- ============================================================================
-- MIGRACIÓN 012: HACER OBLIGATORIO EL CAMPO MUNICIPIO DANE EN CLIENTES
-- ============================================================================
-- Descripción: Hacer que el campo codigo_municipio sea obligatorio (NOT NULL)
--              en la tabla clientes para cumplir con requisitos de facturación
--              electrónica de la DIAN. Actualiza registros existentes sin
--              municipio al valor por defecto "05001" (Medellín).
-- Fecha: 2025-12-23
-- Autor: Claude Code
-- ============================================================================

-- Paso 1: Actualizar registros existentes sin municipio DANE a valor por defecto
-- Usar "05001" (Medellín) como municipio por defecto según decisión del usuario
UPDATE clientes
SET codigo_municipio = '05001'
WHERE codigo_municipio IS NULL OR codigo_municipio = '' OR TRIM(codigo_municipio) = '';

-- Verificar cuántos registros fueron actualizados
DO $$
DECLARE
  registros_actualizados INT;
BEGIN
  SELECT COUNT(*) INTO registros_actualizados
  FROM clientes
  WHERE codigo_municipio = '05001';

  RAISE NOTICE '✅ Registros actualizados con municipio por defecto (05001 - Medellín): %', registros_actualizados;
END $$;

-- Paso 2: Agregar constraint NOT NULL a la columna codigo_municipio
ALTER TABLE clientes
ALTER COLUMN codigo_municipio SET NOT NULL;

RAISE NOTICE '✅ Constraint NOT NULL agregado a codigo_municipio';

-- Paso 3: Agregar CHECK constraint para validar formato (5 dígitos numéricos)
ALTER TABLE clientes
ADD CONSTRAINT chk_codigo_municipio_formato
CHECK (codigo_municipio ~ '^[0-9]{5}$');

RAISE NOTICE '✅ CHECK constraint agregado para validar formato de 5 dígitos';

-- Paso 4: Crear índice para optimizar búsquedas por código municipio
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_municipio
ON clientes(codigo_municipio);

RAISE NOTICE '✅ Índice creado en codigo_municipio';

-- Actualizar comentario de la columna para reflejar que ahora es obligatorio
COMMENT ON COLUMN clientes.codigo_municipio IS 'Código DIVIPOLA del municipio (5 dígitos) - OBLIGATORIO para facturación electrónica DIAN';

-- Mensaje de confirmación final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migración 012 completada exitosamente';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cambios aplicados:';
  RAISE NOTICE '1. Registros sin municipio actualizados a 05001 (Medellín)';
  RAISE NOTICE '2. Campo codigo_municipio ahora es NOT NULL';
  RAISE NOTICE '3. Validación de formato (5 dígitos) agregada';
  RAISE NOTICE '4. Índice creado para optimizar búsquedas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Revisar clientes con municipio 05001 y';
  RAISE NOTICE '   actualizar al municipio correcto si no corresponde a Medellín';
  RAISE NOTICE '========================================';
END $$;
