-- ============================================================================
-- MIGRATION: 012_trigger_facturas_electronicas.sql
-- DESCRIPCIÓN: Crear trigger para auto-generar facturas_electronicas desde facturas
-- FECHA: 2025-12-24
-- ============================================================================

-- Función del trigger
CREATE OR REPLACE FUNCTION crear_factura_electronica_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nombre TEXT;
  v_cliente_documento TEXT;
  v_cliente_tipo_doc TEXT;
  v_prefijo TEXT;
BEGIN
  -- Obtener datos del cliente si existe
  IF NEW.cliente_id IS NOT NULL THEN
    SELECT
      COALESCE(nombre, 'CONSUMIDOR FINAL'),
      COALESCE(numero_documento, 'CONSUMIDOR FINAL'),
      COALESCE(tipo_documento, 'CC')
    INTO v_cliente_nombre, v_cliente_documento, v_cliente_tipo_doc
    FROM clientes
    WHERE id = NEW.cliente_id;
  ELSE
    v_cliente_nombre := 'CONSUMIDOR FINAL';
    v_cliente_documento := 'CONSUMIDOR FINAL';
    v_cliente_tipo_doc := 'CC';
  END IF;

  -- Obtener prefijo de configuración de Factus
  SELECT prefijo_factura INTO v_prefijo
  FROM configuracion_factus
  WHERE activo = true
  LIMIT 1;

  -- Si no hay prefijo configurado, usar uno por defecto según el tipo
  IF v_prefijo IS NULL THEN
    IF NEW.tipo_factura = 'venta_pos' THEN
      v_prefijo := 'FPOS';
    ELSE
      v_prefijo := 'FHOSP';
    END IF;
  END IF;

  -- Insertar en facturas_electronicas con todos los campos requeridos
  INSERT INTO facturas_electronicas (
    factura_id,
    hospedaje_id,
    cliente_id,
    cliente_nombre,
    cliente_numero_documento,
    cliente_tipo_documento,
    prefijo,
    fecha_emision,
    subtotal_hospedaje,
    subtotal_consumos,
    subtotal,
    total_impuestos,
    total_descuentos,
    total,
    factus_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.hospedaje_id,
    NEW.cliente_id,
    v_cliente_nombre,
    v_cliente_documento,
    v_cliente_tipo_doc,
    v_prefijo,
    COALESCE(NEW.fecha, NEW.created_at),
    0,  -- subtotal_hospedaje (0 para ventas POS)
    COALESCE(NEW.subtotal, 0),  -- subtotal_consumos
    COALESCE(NEW.subtotal, 0),
    COALESCE(NEW.iva, 0),
    COALESCE(NEW.descuento, 0),
    COALESCE(NEW.total, 0),
    'Created',  -- Estado inicial
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_crear_factura_electronica ON facturas;

CREATE TRIGGER trigger_crear_factura_electronica
  AFTER INSERT ON facturas
  FOR EACH ROW
  WHEN (NEW.tipo_factura IN ('venta_pos', 'checkout'))  -- Valores válidos del CHECK constraint
  EXECUTE FUNCTION crear_factura_electronica_automatica();

-- Comentarios
COMMENT ON TRIGGER trigger_crear_factura_electronica ON facturas IS
  'Crea automáticamente un registro en facturas_electronicas cuando se inserta una factura de tipo POS o hospedaje';

COMMENT ON FUNCTION crear_factura_electronica_automatica() IS
  'Función del trigger para crear facturas electrónicas automáticamente';
