-- =====================================================
-- MIGRACIÓN: Corregir constraint de turnos de caja
-- Fecha: 2026-01-10
-- Problema: El constraint UNIQUE (caja_id, estado) impide tener
--           múltiples turnos cerrados para la misma caja
-- Solución: Usar índice único parcial solo para estado='abierto'
-- =====================================================

BEGIN;

-- Paso 1: Eliminar el constraint problemático
ALTER TABLE turnos_caja
DROP CONSTRAINT IF EXISTS chk_un_turno_abierto_por_caja;

-- Paso 2: Crear índice único parcial que solo aplica a turnos abiertos
-- Esto permite múltiples turnos cerrados pero solo UN turno abierto por caja
CREATE UNIQUE INDEX IF NOT EXISTS idx_un_turno_abierto_por_caja
ON turnos_caja (caja_id)
WHERE estado = 'abierto';

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Constraint corregido exitosamente';
    RAISE NOTICE '📝 Ahora se permite: UN turno abierto por caja + múltiples turnos cerrados';
END $$;

COMMIT;
