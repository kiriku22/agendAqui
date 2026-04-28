-- ============================================================================
-- Migración: Eliminar constraint UNIQUE de codigo_dian
-- Fecha: 2025-12-09
-- Descripción: Permitir múltiples métodos de pago con el mismo código DIAN
-- Ejemplo: Varias tarjetas de crédito pueden compartir el código 42
-- ============================================================================

-- Eliminar constraint unique si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_codigo_dian'
    ) THEN
        ALTER TABLE metodos_pago DROP CONSTRAINT uq_codigo_dian;
        RAISE NOTICE 'Constraint uq_codigo_dian eliminado - ahora se permiten códigos DIAN duplicados';
    ELSE
        RAISE NOTICE 'Constraint uq_codigo_dian no existe, no es necesario eliminarlo';
    END IF;
END $$;

-- Verificar que se puede tener métodos con el mismo código DIAN
SELECT
    codigo_dian,
    COUNT(*) as cantidad_metodos,
    STRING_AGG(nombre, ', ') as metodos
FROM metodos_pago
GROUP BY codigo_dian
ORDER BY codigo_dian;
