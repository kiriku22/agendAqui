-- ============================================================================
-- MIGRACIÓN SIMPLIFICADA: Solo crear tabla facturas_electronicas
-- Base de datos: factufy_hotel
-- Descripción: Crea solo la tabla facturas_electronicas y sus dependencias
-- ============================================================================

SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================================
-- TABLA: FACTURAS ELECTRÓNICAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS facturas_electronicas (
  id SERIAL PRIMARY KEY,

  -- Relación con factura local
  factura_id INT NOT NULL UNIQUE,
  hospedaje_id INT NOT NULL,

  -- Datos de la factura electrónica
  numero_factura_electronica VARCHAR(50) NOT NULL,
  prefijo VARCHAR(10) NOT NULL,
  numero BIGINT NOT NULL,

  -- CUFE (Código Único de Facturación Electrónica)
  cufe VARCHAR(255) UNIQUE,

  -- Información de Factus
  factus_id VARCHAR(100),
  factus_status VARCHAR(50) DEFAULT 'pending',

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
  items_hospedaje JSONB,
  items_consumos JSONB,

  -- Métodos de pago
  metodos_pago JSONB,

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
-- TABLA: NOTAS DE CRÉDITO
-- ============================================================================

CREATE TABLE IF NOT EXISTS notas_credito (
  id SERIAL PRIMARY KEY,

  -- Relación con factura original
  factura_id INT NOT NULL,
  factura_electronica_id INT NOT NULL,
  hospedaje_id INT,

  -- Datos de la nota de crédito
  numero_nota_credito VARCHAR(50) NOT NULL UNIQUE,
  tipo_nota VARCHAR(50) NOT NULL,
  motivo TEXT NOT NULL,

  -- CUFE de la nota
  cufe VARCHAR(255) UNIQUE,

  -- Información de Factus
  factus_id VARCHAR(100),
  factus_status VARCHAR(50) DEFAULT 'pending',

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
-- INSERTAR DATOS DE PRUEBA
-- ============================================================================

-- Insertar facturas electrónicas de prueba (vacías por ahora)
-- Las facturas reales se crearán desde el checkout

COMMIT;

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Tablas de facturación electrónica creadas exitosamente';
  RAISE NOTICE '📋 Tablas creadas:';
  RAISE NOTICE '   - facturas_electronicas';
  RAISE NOTICE '   - notas_credito';
END $$;
