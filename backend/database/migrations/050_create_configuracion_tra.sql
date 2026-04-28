-- ============================================================================
-- Migración 050: Crear tabla configuracion_tra
-- TRA = Tarjeta de Registro de Alojamiento (MinCIT Colombia)
-- Ley 2068 de 2020, Resolución 700 de 2021
--
-- Cada hotel-cliente configura su propio RNT + TOKEN.
-- El TOKEN se obtiene de https://pms.mincit.gov.co/token/ usando el RNT.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 050: Crear tabla configuracion_tra ===';
END $$;

-- 1. Crear tabla de configuración TRA
CREATE TABLE IF NOT EXISTS configuracion_tra (
    id SERIAL PRIMARY KEY,

    -- Credenciales TRA (MinCIT PMS API)
    token VARCHAR(500),                             -- TOKEN del establecimiento (obtenido vía pms.mincit.gov.co/token/)
    rnt VARCHAR(50),                                -- Número de Registro Nacional de Turismo
    codigo_establecimiento VARCHAR(50),              -- Código del establecimiento en MinCIT
    codigo_alojamiento VARCHAR(50),                  -- Código del tipo de alojamiento

    -- Endpoint de la API
    endpoint VARCHAR(255) DEFAULT 'https://pms.mincit.gov.co',

    -- Estado
    activo BOOLEAN DEFAULT false,

    -- Estadísticas de envío
    ultimo_envio_exitoso TIMESTAMP,
    total_envios_exitosos INT DEFAULT 0,
    total_envios_fallidos INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_configuracion_tra
    BEFORE UPDATE ON configuracion_tra
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Insertar fila por defecto (patrón singleton como configuracion_factus)
INSERT INTO configuracion_tra (id, activo)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ Tabla configuracion_tra creada con fila por defecto';
END $$;
