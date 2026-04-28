-- ============================================================================
-- Migración: Agregar campo codigo_dian a metodos_pago (VERSIÓN CORREGIDA)
-- Fecha: 2025-12-09
-- Descripción: Agrega código DIAN para facturación electrónica
-- Resolución 000042 de 2020 - DIAN Colombia
-- Esta versión verifica qué ya existe antes de intentar agregarlo
-- ============================================================================

-- Paso 1: Agregar columna codigo_dian solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'metodos_pago' AND column_name = 'codigo_dian'
    ) THEN
        ALTER TABLE metodos_pago ADD COLUMN codigo_dian VARCHAR(2);
        RAISE NOTICE 'Columna codigo_dian agregada';
    ELSE
        RAISE NOTICE 'Columna codigo_dian ya existe, saltando...';
    END IF;
END $$;

-- Paso 2: Agregar constraint unique solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_codigo_dian'
    ) THEN
        ALTER TABLE metodos_pago ADD CONSTRAINT uq_codigo_dian UNIQUE (codigo_dian);
        RAISE NOTICE 'Constraint uq_codigo_dian agregado';
    ELSE
        RAISE NOTICE 'Constraint uq_codigo_dian ya existe, saltando...';
    END IF;
END $$;

-- Paso 3: Agregar comentario
COMMENT ON COLUMN metodos_pago.codigo_dian IS 'Código oficial DIAN según Resolución 000042 de 2020';

-- Paso 4: Actualizar métodos existentes con códigos DIAN (solo los que no tienen código)
UPDATE metodos_pago SET codigo_dian = '10' WHERE nombre = 'Efectivo' AND (codigo_dian IS NULL OR codigo_dian = '');
UPDATE metodos_pago SET codigo_dian = '43' WHERE nombre = 'Tarjeta Débito' AND (codigo_dian IS NULL OR codigo_dian = '');
UPDATE metodos_pago SET codigo_dian = '42' WHERE nombre = 'Tarjeta Crédito' AND (codigo_dian IS NULL OR codigo_dian = '');
UPDATE metodos_pago SET codigo_dian = '47' WHERE nombre = 'Transferencia' AND (codigo_dian IS NULL OR codigo_dian = '');
UPDATE metodos_pago SET codigo_dian = '49' WHERE nombre = 'Nequi' AND (codigo_dian IS NULL OR codigo_dian = '');
UPDATE metodos_pago SET codigo_dian = '49' WHERE nombre = 'Daviplata' AND (codigo_dian IS NULL OR codigo_dian = '');

-- Paso 5: Hacer el campo NOT NULL solo si todos los registros tienen valor
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM metodos_pago WHERE codigo_dian IS NULL;

    IF null_count = 0 THEN
        -- Solo hacer NOT NULL si no hay valores nulos
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'metodos_pago'
            AND column_name = 'codigo_dian'
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE metodos_pago ALTER COLUMN codigo_dian SET NOT NULL;
            RAISE NOTICE 'Columna codigo_dian configurada como NOT NULL';
        ELSE
            RAISE NOTICE 'Columna codigo_dian ya es NOT NULL';
        END IF;
    ELSE
        RAISE WARNING 'Hay % registros con codigo_dian NULL. Corrígelos antes de hacer NOT NULL', null_count;
    END IF;
END $$;

-- Paso 6: Verificar actualización
SELECT id, nombre, codigo_dian, tipo, activo, requiere_referencia, orden
FROM metodos_pago
ORDER BY orden;
