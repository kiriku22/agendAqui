-- ============================================================================
-- MIGRACIÓN: Agregar Tipos de Documento DIAN
-- Fecha: 2025-11-29
-- Propósito: Implementar códigos oficiales DIAN para facturación electrónica
-- Resolución: DIAN 000042 de 2020
-- ============================================================================

-- Paso 1: Crear tabla de referencia de tipos de documento DIAN
CREATE TABLE IF NOT EXISTS tipos_documento_dian (
    codigo_dian SMALLINT PRIMARY KEY,
    codigo_interno VARCHAR(20) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    requiere_digito_verificacion BOOLEAN DEFAULT false,
    patron_validacion VARCHAR(100),
    longitud_minima SMALLINT,
    longitud_maxima SMALLINT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar comentario a la tabla
COMMENT ON TABLE tipos_documento_dian IS 'Catálogo oficial de tipos de documento según DIAN - Resolución 000042 de 2020';

-- Paso 2: Insertar los 12 tipos de documento oficiales DIAN
INSERT INTO tipos_documento_dian (codigo_dian, codigo_interno, descripcion, requiere_digito_verificacion, patron_validacion, longitud_minima, longitud_maxima) VALUES
(11, 'RC', 'Registro civil', false, '^\d{6,15}$', 6, 15),
(12, 'TI', 'Tarjeta de identidad', false, '^\d{8,11}$', 8, 11),
(13, 'CC', 'Cédula de ciudadanía', false, '^\d{6,10}$', 6, 10),
(21, 'TE', 'Tarjeta de extranjería', false, '^\d{5,7}$', 5, 7),
(22, 'CE', 'Cédula de extranjería', false, '^\d{5,7}$', 5, 7),
(31, 'NIT', 'Número de Identificación Tributaria', true, '^\d{9,10}$', 9, 10),
(41, 'PA', 'Pasaporte', false, '^[A-Z0-9]{6,9}$', 6, 9),
(42, 'DIE', 'Documento de identificación extranjero', false, '^.{5,20}$', 5, 20),
(43, 'SIDA', 'Sin identificación del exterior o para uso definido por la DIAN', false, '^.{1,20}$', 1, 20),
(44, 'DIEP', 'Documento de identificación extranjero persona jurídica', false, '^.{5,20}$', 5, 20),
(50, 'NPA', 'NIT de otro país', false, '^.{5,20}$', 5, 20),
(91, 'NUIP', 'Número Único de Identificación Personal', false, '^\d{6,15}$', 6, 15)
ON CONFLICT (codigo_dian) DO NOTHING;

-- Paso 3: Agregar columna tipo_documento_dian a tabla clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS tipo_documento_dian SMALLINT;

-- Agregar foreign key constraint
ALTER TABLE clientes
ADD CONSTRAINT fk_clientes_tipo_doc_dian
FOREIGN KEY (tipo_documento_dian)
REFERENCES tipos_documento_dian(codigo_dian)
ON DELETE RESTRICT;

-- Agregar índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_doc_dian ON clientes(tipo_documento_dian);

-- Paso 4: Agregar columna tipo_documento_dian a tabla huespedes
ALTER TABLE huespedes
ADD COLUMN IF NOT EXISTS tipo_documento_dian SMALLINT;

-- Agregar foreign key constraint
ALTER TABLE huespedes
ADD CONSTRAINT fk_huespedes_tipo_doc_dian
FOREIGN KEY (tipo_documento_dian)
REFERENCES tipos_documento_dian(codigo_dian)
ON DELETE RESTRICT;

-- Agregar índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_huespedes_tipo_doc_dian ON huespedes(tipo_documento_dian);

-- Paso 5: Migrar datos existentes de clientes
-- Mapear códigos antiguos (texto) a códigos DIAN (numéricos)
UPDATE clientes
SET tipo_documento_dian = CASE
    WHEN tipo_documento = 'CC' THEN 13
    WHEN tipo_documento = 'CE' THEN 22
    WHEN tipo_documento = 'TI' THEN 12
    WHEN tipo_documento = 'NIT' THEN 31
    WHEN tipo_documento = 'Pasaporte' THEN 41
    WHEN tipo_documento = 'Otro' THEN 43
    ELSE 43  -- Sin identificación por defecto
END
WHERE tipo_documento_dian IS NULL;

-- Paso 6: Migrar datos existentes de huespedes
UPDATE huespedes
SET tipo_documento_dian = CASE
    WHEN tipo_documento = 'CC' THEN 13
    WHEN tipo_documento = 'CE' THEN 22
    WHEN tipo_documento = 'TI' THEN 12
    WHEN tipo_documento = 'Pasaporte' THEN 41
    WHEN tipo_documento = 'Otro' THEN 43
    ELSE 43  -- Sin identificación por defecto
END
WHERE tipo_documento_dian IS NULL;

-- Paso 7: Hacer NOT NULL las columnas tipo_documento_dian (después de la migración)
ALTER TABLE clientes
ALTER COLUMN tipo_documento_dian SET NOT NULL;

ALTER TABLE huespedes
ALTER COLUMN tipo_documento_dian SET NOT NULL;

-- Paso 8: Crear función helper para obtener descripción DIAN
CREATE OR REPLACE FUNCTION get_tipo_documento_dian_descripcion(p_codigo_dian SMALLINT)
RETURNS VARCHAR AS $$
DECLARE
    v_descripcion VARCHAR(200);
BEGIN
    SELECT descripcion INTO v_descripcion
    FROM tipos_documento_dian
    WHERE codigo_dian = p_codigo_dian;

    RETURN COALESCE(v_descripcion, 'Desconocido');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Paso 9: Crear vista para facilitar consultas
CREATE OR REPLACE VIEW v_clientes_con_tipo_doc_dian AS
SELECT
    c.*,
    td.codigo_dian,
    td.codigo_interno as tipo_doc_codigo,
    td.descripcion as tipo_doc_descripcion,
    td.requiere_digito_verificacion
FROM clientes c
LEFT JOIN tipos_documento_dian td ON c.tipo_documento_dian = td.codigo_dian;

CREATE OR REPLACE VIEW v_huespedes_con_tipo_doc_dian AS
SELECT
    h.*,
    td.codigo_dian,
    td.codigo_interno as tipo_doc_codigo,
    td.descripcion as tipo_doc_descripcion,
    td.requiere_digito_verificacion
FROM huespedes h
LEFT JOIN tipos_documento_dian td ON h.tipo_documento_dian = td.codigo_dian;

-- Paso 10: Agregar trigger para actualizar updated_at en tipos_documento_dian
CREATE TRIGGER update_tipos_documento_dian_updated_at
BEFORE UPDATE ON tipos_documento_dian
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Las columnas antiguas tipo_documento (VARCHAR) se mantienen por compatibilidad
-- 2. Se recomienda usar tipo_documento_dian (SMALLINT) para nuevos desarrollos
-- 3. En facturas electrónicas, SIEMPRE usar tipo_documento_dian
-- 4. El código interno es para mostrar en UI (CC, TI, NIT, etc.)
-- 5. El código DIAN es el que va en el XML de facturación electrónica
-- ============================================================================

-- Verificar la migración
SELECT
    'Tipos documento DIAN' as tabla,
    COUNT(*) as registros
FROM tipos_documento_dian

UNION ALL

SELECT
    'Clientes con código DIAN' as tabla,
    COUNT(*) as registros
FROM clientes
WHERE tipo_documento_dian IS NOT NULL

UNION ALL

SELECT
    'Huéspedes con código DIAN' as tabla,
    COUNT(*) as registros
FROM huespedes
WHERE tipo_documento_dian IS NOT NULL;
