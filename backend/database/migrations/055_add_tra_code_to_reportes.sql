-- ============================================================================
-- Migración 055: Agregar code_principal a reportes_tra
--
-- La API /one/ retorna { "code": N } al registrar huésped principal.
-- Ese "code" se usa como campo "padre" al enviar acompañantes a /two/.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 055: Agregar code_principal a reportes_tra ===';
END $$;

ALTER TABLE reportes_tra ADD COLUMN IF NOT EXISTS code_principal INT;

COMMENT ON COLUMN reportes_tra.code_principal IS 'ID retornado por API /one/ del MinCIT. Se usa como "padre" en /two/ para vincular acompañantes.';

DO $$
BEGIN
    RAISE NOTICE '✓ reportes_tra: +code_principal';
END $$;
