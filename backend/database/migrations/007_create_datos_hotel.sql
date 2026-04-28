-- ============================================================================
-- Migración 007: Tabla datos_hotel
-- Descripción: Información legal y configuración general del hotel
-- Fecha: 2025-01
-- ============================================================================

-- Tabla singleton para datos del hotel
CREATE TABLE datos_hotel (
  id SERIAL PRIMARY KEY,

  -- Información Legal
  nombre_comercial VARCHAR(255) NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  digito_verificacion CHAR(1),
  tipo_persona VARCHAR(20) DEFAULT 'juridica' CHECK (tipo_persona IN ('natural', 'juridica')),
  regimen_tributario VARCHAR(50) DEFAULT 'comun' CHECK (regimen_tributario IN ('comun', 'simplificado', 'gran_contribuyente')),

  -- Dirección
  direccion VARCHAR(255) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  departamento VARCHAR(100) NOT NULL,
  codigo_postal VARCHAR(10),
  pais VARCHAR(100) DEFAULT 'Colombia',

  -- Contacto
  telefono VARCHAR(20),
  celular VARCHAR(20),
  email VARCHAR(100) NOT NULL,
  sitio_web VARCHAR(255),

  -- DIAN - Facturación Electrónica
  resolucion_dian VARCHAR(100),
  fecha_inicio_resolucion DATE,
  fecha_fin_resolucion DATE,
  prefijo_factura VARCHAR(10) DEFAULT 'FAC',
  numero_actual_factura INT DEFAULT 1,
  rango_inicial_factura INT,
  rango_final_factura INT,
  clave_tecnica_dian TEXT,
  ambiente_dian VARCHAR(20) DEFAULT 'pruebas' CHECK (ambiente_dian IN ('produccion', 'pruebas')),

  -- Branding
  logo_url VARCHAR(500),
  color_primario VARCHAR(7) DEFAULT '#8b5cf6',
  color_secundario VARCHAR(7) DEFAULT '#06b6d4',
  eslogan TEXT,
  descripcion_empresa TEXT,

  -- Configuración adicional
  moneda VARCHAR(3) DEFAULT 'COP',
  timezone VARCHAR(50) DEFAULT 'America/Bogota',
  idioma VARCHAR(5) DEFAULT 'es-CO',

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT true
);

-- Índice único para garantizar singleton (solo un registro)
CREATE UNIQUE INDEX idx_datos_hotel_singleton ON datos_hotel ((1));

-- Trigger para updated_at
CREATE TRIGGER update_datos_hotel_updated_at
  BEFORE UPDATE ON datos_hotel
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE datos_hotel IS 'Información legal y configuración general del hotel (singleton)';
COMMENT ON COLUMN datos_hotel.nit IS 'Número de Identificación Tributaria sin dígito de verificación';
COMMENT ON COLUMN datos_hotel.clave_tecnica_dian IS 'Clave técnica para firma electrónica DIAN';

-- Insertar registro inicial (singleton)
INSERT INTO datos_hotel (
  nombre_comercial,
  razon_social,
  nit,
  direccion,
  ciudad,
  departamento,
  email
) VALUES (
  'Hotel Factufy',
  'Hotel Factufy S.A.S',
  '9001234567',
  'Calle 123 # 45-67',
  'Bogotá',
  'Cundinamarca',
  'contacto@hotelfactufy.com'
);
