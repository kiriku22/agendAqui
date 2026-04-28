-- =============================================================================
-- MIGRACIÓN: Extraer factus_id de factus_response para facturas existentes
-- Fecha: 2025-12-28
-- Descripción: Las facturas transmitidas tienen el factus_id guardado en
--              factus_response pero no en la columna factus_id
-- =============================================================================

-- Actualizar factus_id desde factus_response para facturas que lo tienen
UPDATE facturas_electronicas
SET factus_id = (factus_response::jsonb->>'factus_id')::integer
WHERE factus_response IS NOT NULL
  AND factus_response != ''
  AND factus_id IS NULL
  AND factus_response::jsonb->>'factus_id' IS NOT NULL;

-- Verificar cuántas se actualizaron
SELECT
  COUNT(*) as total_facturas,
  COUNT(CASE WHEN factus_id IS NOT NULL THEN 1 END) as con_factus_id,
  COUNT(CASE WHEN factus_id IS NULL AND cufe IS NOT NULL THEN 1 END) as sin_factus_id_con_cufe
FROM facturas_electronicas;
