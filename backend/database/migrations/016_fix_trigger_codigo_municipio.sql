-- ============================================================================
-- MIGRATION: 016_fix_trigger_codigo_municipio.sql
-- DESCRIPCIÓN: Corregir nombre de columna en trigger de facturas electrónicas
--              El trigger buscaba 'codigo_municipio_dane' pero la columna real
--              se llama 'codigo_municipio' (según migración 002)
-- FECHA: 2025-12-27
-- ============================================================================

-- Función mejorada del trigger con nombre de columna corregido
CREATE OR REPLACE FUNCTION crear_factura_electronica_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nombre TEXT;
  v_cliente_documento TEXT;
  v_cliente_tipo_doc TEXT;
  v_cliente_email TEXT;
  v_cliente_telefono TEXT;
  v_cliente_direccion TEXT;
  v_cliente_municipio TEXT;
  v_prefijo TEXT;
  v_items_json JSONB;
  v_metodos_pago_json JSONB;
BEGIN
  -- Obtener datos COMPLETOS del cliente si existe
  IF NEW.cliente_id IS NOT NULL THEN
    SELECT
      COALESCE(nombre, 'CONSUMIDOR FINAL'),
      COALESCE(numero_documento, '222222222222'),
      COALESCE(tipo_documento, 'CC'),
      email,
      telefono,
      direccion,
      COALESCE(codigo_municipio, '11001')  -- ✅ CORREGIDO: Era codigo_municipio_dane
    INTO
      v_cliente_nombre,
      v_cliente_documento,
      v_cliente_tipo_doc,
      v_cliente_email,
      v_cliente_telefono,
      v_cliente_direccion,
      v_cliente_municipio
    FROM clientes
    WHERE id = NEW.cliente_id;
  ELSE
    v_cliente_nombre := 'CONSUMIDOR FINAL';
    v_cliente_documento := '222222222222';
    v_cliente_tipo_doc := 'CC';
    v_cliente_email := NULL;
    v_cliente_telefono := NULL;
    v_cliente_direccion := NULL;
    v_cliente_municipio := '11001';
  END IF;

  -- Obtener email de configuración si el cliente no tiene
  IF v_cliente_email IS NULL THEN
    SELECT email_facturacion INTO v_cliente_email
    FROM configuracion_factus
    WHERE activo = true
    LIMIT 1;
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

  -- Obtener items de la venta POS si es venta_pos
  IF NEW.tipo_factura = 'venta_pos' AND NEW.venta_pos_id IS NOT NULL THEN
    SELECT
      COALESCE(
        json_agg(
          json_build_object(
            'codigo', dv.codigo_item,
            'descripcion', dv.nombre_item,
            'cantidad', dv.cantidad,
            'precio_unitario', dv.precio_unitario,
            'iva_porcentaje', dv.iva_porcentaje,
            'iva_monto', dv.iva_monto,
            'subtotal', dv.subtotal,
            'total', dv.total,
            'tipo', dv.tipo_item
          )
          ORDER BY dv.id
        ),
        '[]'::json
      )::jsonb
    INTO v_items_json
    FROM detalle_venta_pos dv
    WHERE dv.venta_pos_id = NEW.venta_pos_id;
  ELSE
    v_items_json := '[]'::jsonb;
  END IF;

  -- Obtener métodos de pago de la venta POS
  IF NEW.tipo_factura = 'venta_pos' AND NEW.venta_pos_id IS NOT NULL THEN
    SELECT
      COALESCE(
        json_agg(
          json_build_object(
            'metodo_pago_id', vp.metodo_pago_id,
            'metodo', mp.nombre,
            'monto', vp.monto,
            'referencia', vp.referencia
          )
          ORDER BY vp.id
        ),
        '[]'::json
      )::jsonb
    INTO v_metodos_pago_json
    FROM venta_pos_pagos vp
    INNER JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
    WHERE vp.venta_pos_id = NEW.venta_pos_id;
  ELSE
    v_metodos_pago_json := '[]'::jsonb;
  END IF;

  -- Insertar en facturas_electronicas con TODOS los campos necesarios
  INSERT INTO facturas_electronicas (
    factura_id,
    hospedaje_id,
    cliente_id,
    cliente_nombre,
    cliente_numero_documento,
    cliente_tipo_documento,
    cliente_email,
    cliente_telefono,
    cliente_direccion,
    cliente_codigo_municipio_dane,
    prefijo,
    fecha_emision,
    subtotal_hospedaje,
    subtotal_consumos,
    subtotal,
    total_impuestos,
    total_descuentos,
    total,
    items_consumos,
    metodos_pago,
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
    v_cliente_email,
    v_cliente_telefono,
    v_cliente_direccion,
    v_cliente_municipio,
    v_prefijo,
    COALESCE(NEW.fecha, NEW.created_at),
    0,  -- subtotal_hospedaje (0 para ventas POS)
    COALESCE(NEW.subtotal, 0),  -- subtotal_consumos
    COALESCE(NEW.subtotal, 0),
    COALESCE(NEW.iva, 0),
    COALESCE(NEW.descuento, 0),
    COALESCE(NEW.total, 0),
    v_items_json,
    v_metodos_pago_json,
    'Created',  -- Estado inicial
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON FUNCTION crear_factura_electronica_automatica() IS
  'Función del trigger para crear facturas electrónicas automáticamente con datos completos del cliente. CORREGIDO: usa codigo_municipio en vez de codigo_municipio_dane';

-- Notificar éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger corregido: ahora usa codigo_municipio en vez de codigo_municipio_dane';
END $$;
