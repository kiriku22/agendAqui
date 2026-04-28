-- ============================================================================
-- Migración 051: Crear tabla reportes_tra
-- Tracking de envíos de TRA por cada hospedaje/huésped
-- Similar al patrón de facturas_electronicas para tracking de envíos a Factus
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migración 051: Crear tabla reportes_tra ===';
END $$;

-- 1. Crear tabla de reportes TRA
CREATE TABLE IF NOT EXISTS reportes_tra (
    id SERIAL PRIMARY KEY,

    -- Relaciones
    hospedaje_id INT NOT NULL,
    huesped_id INT NOT NULL,

    -- Estado del reporte
    estado VARCHAR(20) DEFAULT 'pendiente',         -- pendiente, enviado, error, no_configurado

    -- Datos de envío
    fecha_envio TIMESTAMP,
    codigo_confirmacion VARCHAR(100),                -- Código de confirmación de MinCIT
    errores TEXT,                                    -- Mensaje de error si falló
    intentos INT DEFAULT 0,                          -- Número de intentos de envío

    -- Auditoría de datos
    datos_enviados JSONB,                            -- Snapshot exacto del payload enviado
    respuesta_api JSONB,                             -- Respuesta completa de la API

    -- Usuario que disparó el envío
    enviado_por INT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_reporte_tra_hospedaje FOREIGN KEY (hospedaje_id) REFERENCES hospedajes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reporte_tra_huesped FOREIGN KEY (huesped_id) REFERENCES huespedes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reporte_tra_usuario FOREIGN KEY (enviado_por) REFERENCES usuarios(id),

    -- Un solo reporte TRA por hospedaje/huésped
    CONSTRAINT idx_reporte_tra_unico UNIQUE (hospedaje_id, huesped_id),

    -- Validación de estados
    CONSTRAINT chk_estado_reporte_tra CHECK (estado IN ('pendiente', 'enviado', 'error', 'no_configurado'))
);

-- 2. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_reporte_tra_hospedaje ON reportes_tra(hospedaje_id);
CREATE INDEX IF NOT EXISTS idx_reporte_tra_estado ON reportes_tra(estado);
CREATE INDEX IF NOT EXISTS idx_reporte_tra_fecha ON reportes_tra(fecha_envio);

-- 3. Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_reportes_tra
    BEFORE UPDATE ON reportes_tra
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '✓ Tabla reportes_tra creada con índices y constraints';
END $$;
