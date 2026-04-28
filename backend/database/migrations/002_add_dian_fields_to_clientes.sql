-- ============================================================================
-- Migración: Agregar campos DIAN a tabla clientes
-- Fecha: 2025-12-16
-- Propósito: Cumplir con requisitos de facturación electrónica DIAN
-- ============================================================================

-- Agregar campos DIAN a tabla clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_documento_dian SMALLINT REFERENCES tipos_documento_dian(codigo_dian),
  ADD COLUMN IF NOT EXISTS codigo_municipio VARCHAR(20),
  ADD COLUMN IF NOT EXISTS digito_verificacion VARCHAR(1),
  ADD COLUMN IF NOT EXISTS regimen_tributario VARCHAR(50) CHECK (regimen_tributario IN ('Común', 'Simplificado', 'Grande Contribuyente', NULL)),
  ADD COLUMN IF NOT EXISTS responsable_iva BOOLEAN DEFAULT false;

-- Comentarios para documentación
COMMENT ON COLUMN clientes.tipo_documento_dian IS 'Código numérico DIAN del tipo de documento (13=CC, 31=NIT, etc.)';
COMMENT ON COLUMN clientes.codigo_municipio IS 'Código DIVIPOLA del municipio (5 dígitos) para facturación electrónica';
COMMENT ON COLUMN clientes.digito_verificacion IS 'Dígito de verificación para NIT (calculado según algoritmo DIAN)';
COMMENT ON COLUMN clientes.regimen_tributario IS 'Régimen tributario para empresas: Común, Simplificado, Grande Contribuyente';
COMMENT ON COLUMN clientes.responsable_iva IS 'Indica si el cliente es responsable de IVA';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_doc_dian ON clientes(tipo_documento_dian);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_municipio ON clientes(codigo_municipio);

-- Migrar datos existentes: convertir tipo_documento legacy a tipo_documento_dian
-- Mapeo basado en los códigos DIAN reales en la base de datos
UPDATE clientes
SET tipo_documento_dian = CASE tipo_documento
  WHEN 'CC' THEN 3    -- Cédula de Ciudadanía
  WHEN 'CE' THEN 4    -- Cédula de Extranjería
  WHEN 'TI' THEN 2    -- Tarjeta de Identidad
  WHEN 'NIT' THEN 6   -- Número de Identificación Tributaria
  WHEN 'Pasaporte' THEN 7  -- Pasaporte
  WHEN 'RC' THEN 5    -- Registro Civil
  ELSE NULL           -- Otros casos se manejan manualmente
END
WHERE tipo_documento_dian IS NULL;

-- Verificar resultados
SELECT
  tipo_documento,
  tipo_documento_dian,
  COUNT(*) as cantidad
FROM clientes
GROUP BY tipo_documento, tipo_documento_dian
ORDER BY tipo_documento;

-- Mostrar muestra de registros actualizados
SELECT
  id,
  nombre,
  tipo_documento,
  tipo_documento_dian,
  codigo_municipio,
  digito_verificacion,
  regimen_tributario,
  responsable_iva
FROM clientes
LIMIT 10;
