-- ============================================================================
-- MIGRACIÓN: FACTURACIÓN ELECTRÓNICA DIAN - FACTUS
-- Base de datos: factufy_hotel
-- Versión: 1.0
-- Fecha: Diciembre 2024
-- Descripción: Agrega soporte completo para facturación electrónica con Factus
-- ============================================================================

-- Configurar timezone
SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================================
-- TABLA 1: TIPOS DE DOCUMENTO DIAN
-- Catálogo oficial según Resolución DIAN 000042 de 2020
-- ============================================================================

CREATE TABLE IF NOT EXISTS tipos_documento_dian (
  id SERIAL PRIMARY KEY,

  -- Códigos
  codigo_dian INT UNIQUE NOT NULL,              -- Código oficial DIAN
  codigo_interno VARCHAR(20) UNIQUE NOT NULL,   -- CC, NIT, CE, TI, etc.

  -- Descripción
  descripcion VARCHAR(200) NOT NULL,            -- Nombre completo

  -- Validación
  requiere_digito_verificacion BOOLEAN DEFAULT false,
  patron_validacion VARCHAR(100),               -- Regex para validar formato
  longitud_minima INT,
  longitud_maxima INT,

  -- Estado
  activo BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tipo_doc_dian_codigo ON tipos_documento_dian(codigo_dian);
CREATE INDEX IF NOT EXISTS idx_tipo_doc_dian_interno ON tipos_documento_dian(codigo_interno);

COMMENT ON TABLE tipos_documento_dian IS 'Catálogo oficial de tipos de documento DIAN (Resolución 000042 de 2020)';

-- Datos iniciales (según Factus y DIAN)
-- Usar DELETE + INSERT para evitar conflictos en ejecuciones múltiples
DELETE FROM tipos_documento_dian WHERE codigo_dian IN (2, 3, 4, 5, 6, 7, 22);

INSERT INTO tipos_documento_dian (codigo_dian, codigo_interno, descripcion, requiere_digito_verificacion, longitud_minima, longitud_maxima) VALUES
(3, 'CC', 'Cédula de Ciudadanía', false, 6, 10),
(4, 'CE', 'Cédula de Extranjería', false, 6, 10),
(6, 'NIT', 'Número de Identificación Tributaria', true, 9, 10),
(7, 'Pasaporte', 'Pasaporte', false, 5, 20),
(2, 'TI', 'Tarjeta de Identidad', false, 6, 11),
(5, 'RC', 'Registro Civil', false, 6, 11),
(22, 'DIE', 'Documento de Identificación Extranjero', false, 5, 20);

-- ============================================================================
-- TABLA 2: CONFIGURACIÓN FACTUS
-- Configuración de credenciales y conexión con Factus
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_factus (
  id SERIAL PRIMARY KEY,

  -- Credenciales Factus (OAuth2)
  endpoint VARCHAR(255) NOT NULL DEFAULT 'https://api-sandbox.factus.com.co',
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,              -- TODO: Encriptar en producción
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL,         -- TODO: Encriptar en producción

  -- Tokens (gestionados automáticamente)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,

  -- Configuración general
  ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',  -- 'sandbox' o 'produccion'
  activo BOOLEAN DEFAULT false,

  -- Información del hotel para facturación
  nit VARCHAR(20),
  digito_verificacion VARCHAR(1),
  razon_social VARCHAR(255),
  nombre_comercial VARCHAR(255),
  direccion TEXT,
  telefono VARCHAR(50),
  email_facturacion VARCHAR(255),
  codigo_municipio_dane VARCHAR(10),            -- Código DANE del municipio

  -- Configuración tributaria
  regimen_tributario VARCHAR(50),               -- 'simplificado', 'comun', 'gran_contribuyente'
  tipo_persona VARCHAR(50),                     -- 'juridica', 'natural'
  responsabilidades_fiscales JSONB,             -- Array de códigos DIAN

  -- Resolución DIAN
  resolucion_dian VARCHAR(100),
  prefijo_factura VARCHAR(10),
  numero_inicial_factura BIGINT,
  numero_final_factura BIGINT,
  numero_actual_factura BIGINT,
  fecha_inicio_resolucion DATE,
  fecha_fin_resolucion DATE,

  -- Configuración de IVA
  iva_hospedaje DECIMAL(5,2) DEFAULT 0,         -- 0% o 19%
  iva_consumos DECIMAL(5,2) DEFAULT 19,         -- 19% para alimentos
  iva_servicios DECIMAL(5,2) DEFAULT 0,         -- 0% para servicios

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_ambiente CHECK (ambiente IN ('sandbox', 'produccion')),
  CONSTRAINT chk_regimen CHECK (regimen_tributario IN ('simplificado', 'comun', 'gran_contribuyente')),
  CONSTRAINT chk_tipo_persona CHECK (tipo_persona IN ('juridica', 'natural'))
);

-- Trigger para updated_at
CREATE TRIGGER trigger_update_configuracion_factus
  BEFORE UPDATE ON configuracion_factus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configuracion_factus IS 'Configuración de integración con Factus para facturación electrónica';
COMMENT ON COLUMN configuracion_factus.responsabilidades_fiscales IS 'Array de códigos: ["O-13", "O-15", "R-99-PN"] según DIAN';

-- Insertar configuración inicial con credenciales de sandbox
-- Usar INSERT con ON CONFLICT UPDATE para evitar duplicados
INSERT INTO configuracion_factus (
  id,
  endpoint,
  email,
  password,
  client_id,
  client_secret,
  ambiente,
  activo,
  email_facturacion
) VALUES (
  1,
  'https://api-sandbox.factus.com.co',
  'sandbox@factus.com.co',
  'sandbox2024%',
  'a02b4bd9-8b3a-4f24-9c93-70a950a89246',
  'k2J2ZfPbjTuyvEboLw0XatIdYKbBhPZT0neT6oIW',
  'sandbox',
  false,
  'sandbox@factus.com.co'
)
ON CONFLICT (id) DO UPDATE SET
  endpoint = EXCLUDED.endpoint,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  client_id = EXCLUDED.client_id,
  client_secret = EXCLUDED.client_secret,
  ambiente = EXCLUDED.ambiente,
  email_facturacion = EXCLUDED.email_facturacion,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- TABLA 3: FACTURAS ELECTRÓNICAS
-- Registro de facturas electrónicas generadas por Factus
-- ============================================================================

CREATE TABLE IF NOT EXISTS facturas_electronicas (
  id SERIAL PRIMARY KEY,

  -- Relación con factura local
  factura_id INT NOT NULL UNIQUE,
  hospedaje_id INT NOT NULL,

  -- Datos de la factura electrónica
  numero_factura_electronica VARCHAR(50) NOT NULL,  -- PREF-00001
  prefijo VARCHAR(10) NOT NULL,
  numero BIGINT NOT NULL,

  -- CUFE (Código Único de Facturación Electrónica)
  cufe VARCHAR(255) UNIQUE,

  -- Información de Factus
  factus_id VARCHAR(100),                       -- ID interno de Factus
  factus_status VARCHAR(50),                    -- 'pending', 'Created', 'approved', 'rejected', 'error'

  -- URLs de documentos generados
  pdf_url TEXT,
  xml_url TEXT,
  public_url TEXT,
  attached_document_url TEXT,

  -- Información del cliente (snapshot histórico)
  cliente_id INT,
  cliente_tipo_documento VARCHAR(10),
  cliente_tipo_documento_dian INT,
  cliente_numero_documento VARCHAR(50),
  cliente_digito_verificacion VARCHAR(1),
  cliente_nombre VARCHAR(255),
  cliente_email VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_direccion TEXT,
  cliente_ciudad VARCHAR(100),
  cliente_codigo_municipio_dane VARCHAR(10),

  -- Desglose de la factura
  subtotal_hospedaje DECIMAL(10,2) NOT NULL,
  subtotal_consumos DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  total_impuestos DECIMAL(10,2) DEFAULT 0,
  total_descuentos DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Detalles de items (JSON)
  items_hospedaje JSONB,                        -- [{descripcion, noches, precio_noche}]
  items_consumos JSONB,                         -- [{descripcion, cantidad, precio_unitario}]

  -- Métodos de pago
  metodos_pago JSONB,                           -- [{metodo, monto, referencia}]

  -- Respuesta completa de Factus
  factus_response JSONB,

  -- Errores
  error_message TEXT,
  error_code VARCHAR(50),

  -- Fechas
  fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_envio_factus TIMESTAMP,
  fecha_aprobacion_dian TIMESTAMP,
  fecha_rechazo_dian TIMESTAMP,

  -- Usuario que generó
  created_by INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT fk_fe_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  CONSTRAINT fk_fe_hospedaje FOREIGN KEY (hospedaje_id) REFERENCES hospedajes(id) ON DELETE CASCADE,
  CONSTRAINT fk_fe_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_fe_usuario FOREIGN KEY (created_by) REFERENCES usuarios(id),

  -- Checks
  CONSTRAINT chk_fe_status CHECK (factus_status IN ('pending', 'Created', 'approved', 'rejected', 'error')),
  CONSTRAINT chk_fe_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_fe_total CHECK (total >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fe_factura ON facturas_electronicas(factura_id);
CREATE INDEX IF NOT EXISTS idx_fe_hospedaje ON facturas_electronicas(hospedaje_id);
CREATE INDEX IF NOT EXISTS idx_fe_cufe ON facturas_electronicas(cufe);
CREATE INDEX IF NOT EXISTS idx_fe_status ON facturas_electronicas(factus_status, fecha_emision);
CREATE INDEX IF NOT EXISTS idx_fe_cliente ON facturas_electronicas(cliente_id, fecha_emision);
CREATE INDEX IF NOT EXISTS idx_fe_numero ON facturas_electronicas(numero_factura_electronica);

-- Trigger
CREATE TRIGGER trigger_update_facturas_electronicas
  BEFORE UPDATE ON facturas_electronicas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE facturas_electronicas IS 'Facturas electrónicas generadas y validadas por Factus/DIAN';
COMMENT ON COLUMN facturas_electronicas.cufe IS 'Código Único de Facturación Electrónica generado por DIAN';

-- ============================================================================
-- TABLA 4: NOTAS DE CRÉDITO
-- Notas de crédito para anular o ajustar facturas electrónicas
-- ============================================================================

CREATE TABLE IF NOT EXISTS notas_credito (
  id SERIAL PRIMARY KEY,

  -- Relación con factura original
  factura_id INT NOT NULL,
  factura_electronica_id INT NOT NULL,
  hospedaje_id INT,

  -- Datos de la nota de crédito
  numero_nota_credito VARCHAR(50) NOT NULL UNIQUE,
  tipo_nota VARCHAR(50) NOT NULL,              -- 'total', 'parcial'
  motivo TEXT NOT NULL,

  -- CUFE de la nota
  cufe VARCHAR(255) UNIQUE,

  -- Información de Factus
  factus_id VARCHAR(100),
  factus_status VARCHAR(50),

  -- URLs de documentos
  pdf_url TEXT,
  xml_url TEXT,
  public_url TEXT,

  -- Información del cliente (copia de factura)
  cliente_tipo_documento VARCHAR(10),
  cliente_tipo_documento_dian INT,
  cliente_numero_documento VARCHAR(50),
  cliente_nombre VARCHAR(255),
  cliente_email VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_direccion TEXT,

  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  impuestos DECIMAL(10,2) DEFAULT 0,
  descuentos DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Items de la nota (JSON)
  items JSONB,

  -- Respuesta de Factus
  factus_response JSONB,

  -- Errores
  error_message TEXT,
  error_code VARCHAR(50),

  -- Fechas
  fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_envio_factus TIMESTAMP,
  fecha_aprobacion_dian TIMESTAMP,

  -- Usuario que generó
  created_by INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT fk_nc_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  CONSTRAINT fk_nc_factura_electronica FOREIGN KEY (factura_electronica_id) REFERENCES facturas_electronicas(id) ON DELETE CASCADE,
  CONSTRAINT fk_nc_hospedaje FOREIGN KEY (hospedaje_id) REFERENCES hospedajes(id),
  CONSTRAINT fk_nc_usuario FOREIGN KEY (created_by) REFERENCES usuarios(id),

  -- Checks
  CONSTRAINT chk_nc_tipo CHECK (tipo_nota IN ('total', 'parcial')),
  CONSTRAINT chk_nc_status CHECK (factus_status IN ('pending', 'Created', 'approved', 'rejected', 'error'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nc_factura ON notas_credito(factura_id);
CREATE INDEX IF NOT EXISTS idx_nc_factura_electronica ON notas_credito(factura_electronica_id);
CREATE INDEX IF NOT EXISTS idx_nc_numero ON notas_credito(numero_nota_credito);
CREATE INDEX IF NOT EXISTS idx_nc_cufe ON notas_credito(cufe);

-- Trigger
CREATE TRIGGER trigger_update_notas_credito
  BEFORE UPDATE ON notas_credito
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notas_credito IS 'Notas de crédito para anular o ajustar facturas electrónicas';

-- ============================================================================
-- TABLA 5: DOCUMENTOS SOPORTE (OPCIONAL)
-- Documentos soporte para compras a proveedores
-- ============================================================================

CREATE TABLE IF NOT EXISTS documentos_soporte (
  id SERIAL PRIMARY KEY,

  -- Datos del documento
  numero_documento VARCHAR(50) NOT NULL UNIQUE,
  tipo_documento VARCHAR(50) NOT NULL DEFAULT 'adquisicion',
  concepto VARCHAR(255) NOT NULL,
  observaciones TEXT,

  -- CUFE
  cufe VARCHAR(255) UNIQUE,

  -- Información de Factus
  factus_id VARCHAR(100),
  factus_status VARCHAR(50),

  -- URLs de documentos
  pdf_url TEXT,
  xml_url TEXT,

  -- Información del proveedor/tercero
  proveedor_tipo_documento VARCHAR(10) NOT NULL,
  proveedor_tipo_documento_dian INT,
  proveedor_numero_documento VARCHAR(50) NOT NULL,
  proveedor_nombre VARCHAR(255) NOT NULL,
  proveedor_email VARCHAR(255),
  proveedor_telefono VARCHAR(50),
  proveedor_direccion TEXT,
  proveedor_ciudad VARCHAR(100),
  proveedor_codigo_municipio_dane VARCHAR(10),

  -- Método de pago
  metodo_pago VARCHAR(50),

  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  impuestos DECIMAL(10,2) DEFAULT 0,
  descuentos DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Items del documento (JSON)
  items JSONB,

  -- Respuesta de Factus
  factus_response JSONB,

  -- Errores
  error_message TEXT,
  error_code VARCHAR(50),

  -- Fechas
  fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_envio_factus TIMESTAMP,
  fecha_aprobacion_dian TIMESTAMP,

  -- Usuario que creó
  created_by INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT fk_ds_usuario FOREIGN KEY (created_by) REFERENCES usuarios(id),

  -- Checks
  CONSTRAINT chk_ds_status CHECK (factus_status IN ('pending', 'Created', 'approved', 'rejected', 'error'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ds_numero ON documentos_soporte(numero_documento);
CREATE INDEX IF NOT EXISTS idx_ds_proveedor ON documentos_soporte(proveedor_numero_documento);
CREATE INDEX IF NOT EXISTS idx_ds_fecha ON documentos_soporte(fecha_emision);

-- Trigger
CREATE TRIGGER trigger_update_documentos_soporte
  BEFORE UPDATE ON documentos_soporte
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE documentos_soporte IS 'Documentos soporte de adquisiciones (compras a proveedores)';

-- ============================================================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- ============================================================================

-- TABLA: clientes
-- Agregar campos para DIAN
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_documento_dian INT,
  ADD COLUMN IF NOT EXISTS codigo_municipio_dane VARCHAR(10) DEFAULT '11001',
  ADD COLUMN IF NOT EXISTS digito_verificacion VARCHAR(1);

-- Relación con catálogo DIAN
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_clientes_tipo_doc_dian'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT fk_clientes_tipo_doc_dian
      FOREIGN KEY (tipo_documento_dian)
      REFERENCES tipos_documento_dian(codigo_dian);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_tipo_doc_dian ON clientes(tipo_documento_dian);

-- TABLA: huespedes
-- Agregar campo tipo_documento_dian
ALTER TABLE huespedes
  ADD COLUMN IF NOT EXISTS tipo_documento_dian INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_huespedes_tipo_doc_dian'
  ) THEN
    ALTER TABLE huespedes
      ADD CONSTRAINT fk_huespedes_tipo_doc_dian
      FOREIGN KEY (tipo_documento_dian)
      REFERENCES tipos_documento_dian(codigo_dian);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_huespedes_tipo_doc_dian ON huespedes(tipo_documento_dian);

-- TABLA: facturas
-- Agregar relación con factura electrónica
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tiene_factura_electronica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS factura_electronica_id INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_facturas_fe'
  ) THEN
    ALTER TABLE facturas
      ADD CONSTRAINT fk_facturas_fe
      FOREIGN KEY (factura_electronica_id)
      REFERENCES facturas_electronicas(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_facturas_fe ON facturas(factura_electronica_id);

-- ============================================================================
-- FUNCIÓN: Sincronizar tipo_documento_dian desde tipo_documento
-- ============================================================================

CREATE OR REPLACE FUNCTION sincronizar_tipo_documento_dian()
RETURNS void AS $$
BEGIN
  -- Actualizar clientes
  UPDATE clientes c
  SET tipo_documento_dian = t.codigo_dian
  FROM tipos_documento_dian t
  WHERE c.tipo_documento = t.codigo_interno
    AND c.tipo_documento_dian IS NULL;

  -- Actualizar huespedes
  UPDATE huespedes h
  SET tipo_documento_dian = t.codigo_dian
  FROM tipos_documento_dian t
  WHERE h.tipo_documento = t.codigo_interno
    AND h.tipo_documento_dian IS NULL;

  RAISE NOTICE 'Tipos de documento DIAN sincronizados exitosamente';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar sincronización
SELECT sincronizar_tipo_documento_dian();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Facturas Electrónicas con información completa
CREATE OR REPLACE VIEW v_facturas_electronicas_completas AS
SELECT
  fe.id,
  fe.numero_factura_electronica,
  fe.cufe,
  fe.factus_status,
  fe.pdf_url,
  fe.xml_url,
  fe.total,
  fe.fecha_emision,
  f.numero_factura AS factura_local_numero,
  f.fecha AS factura_local_fecha,
  h.codigo AS hospedaje_codigo,
  hab.numero AS habitacion_numero,
  fe.cliente_nombre,
  fe.cliente_email,
  u.nombre AS creado_por
FROM facturas_electronicas fe
LEFT JOIN facturas f ON fe.factura_id = f.id
LEFT JOIN hospedajes h ON fe.hospedaje_id = h.id
LEFT JOIN habitaciones hab ON h.habitacion_id = hab.id
LEFT JOIN usuarios u ON fe.created_by = u.id
ORDER BY fe.fecha_emision DESC;

-- Vista: Configuración Factus (sin credenciales sensibles)
CREATE OR REPLACE VIEW v_configuracion_factus_publica AS
SELECT
  id,
  endpoint,
  email,
  ambiente,
  activo,
  nit,
  razon_social,
  nombre_comercial,
  telefono,
  email_facturacion,
  regimen_tributario,
  tipo_persona,
  resolucion_dian,
  prefijo_factura,
  numero_actual_factura,
  fecha_inicio_resolucion,
  fecha_fin_resolucion,
  CASE
    WHEN token_expiry > CURRENT_TIMESTAMP THEN true
    ELSE false
  END AS token_activo,
  created_at,
  updated_at
FROM configuracion_factus
WHERE id = 1;

-- ============================================================================
-- DATOS DE PRUEBA (OPCIONAL - Solo para desarrollo)
-- ============================================================================

-- Descomentar para insertar datos de prueba

/*
-- Crear un huésped de prueba con documento válido para Factus
INSERT INTO clientes (nombre, apellido, tipo_documento, numero_documento, tipo_documento_dian, email, telefono, ciudad, codigo_municipio_dane)
VALUES ('Juan', 'Pérez', 'CC', '1234567890', 3, 'juan.perez@example.com', '3001234567', 'Bogotá', '11001')
ON CONFLICT DO NOTHING;

INSERT INTO huespedes (cliente_id, tipo_documento, numero_documento, tipo_documento_dian, telefono, email, ciudad, pais)
SELECT
  id,
  'CC',
  '1234567890',
  3,
  '3001234567',
  'juan.perez@example.com',
  'Bogotá',
  'Colombia'
FROM clientes
WHERE numero_documento = '1234567890'
ON CONFLICT (numero_documento) DO NOTHING;
*/

-- ============================================================================
-- FINALIZACIÓN
-- ============================================================================

COMMIT;

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Migración de Facturación Electrónica completada exitosamente';
  RAISE NOTICE '📋 Tablas creadas:';
  RAISE NOTICE '   - tipos_documento_dian';
  RAISE NOTICE '   - configuracion_factus';
  RAISE NOTICE '   - facturas_electronicas';
  RAISE NOTICE '   - notas_credito';
  RAISE NOTICE '   - documentos_soporte';
  RAISE NOTICE '📝 Tablas modificadas:';
  RAISE NOTICE '   - clientes (+ tipo_documento_dian, codigo_municipio_dane, digito_verificacion)';
  RAISE NOTICE '   - huespedes (+ tipo_documento_dian)';
  RAISE NOTICE '   - facturas (+ tiene_factura_electronica, factura_electronica_id)';
  RAISE NOTICE '🔧 Configuración inicial:';
  RAISE NOTICE '   - Credenciales de Factus Sandbox insertadas';
  RAISE NOTICE '   - Catálogo de tipos de documento DIAN cargado';
  RAISE NOTICE '📊 Vistas creadas:';
  RAISE NOTICE '   - v_facturas_electronicas_completas';
  RAISE NOTICE '   - v_configuracion_factus_publica';
END $$;

-- Verificar tablas creadas
SELECT
  'tipos_documento_dian' AS tabla,
  COUNT(*) AS registros
FROM tipos_documento_dian
UNION ALL
SELECT
  'configuracion_factus' AS tabla,
  COUNT(*) AS registros
FROM configuracion_factus;