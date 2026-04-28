-- =====================================================
-- SEEDS SISTEMA POS - FACTUFY HOTEL
-- Datos iniciales para el sistema de punto de venta
-- =====================================================

-- =====================================================
-- 1. CAJAS (Caja única de recepción)
-- =====================================================
INSERT INTO cajas (codigo, nombre, ubicacion, activa) VALUES
('CAJA-01', 'Caja Principal', 'Recepción', true)
ON CONFLICT (codigo) DO NOTHING;

RAISE NOTICE '✅ Caja principal creada';

-- =====================================================
-- 2. DESCUENTOS PREDEFINIDOS (Ejemplos)
-- =====================================================
INSERT INTO descuentos (
    codigo, nombre, descripcion, tipo, valor,
    monto_minimo, tipo_item_aplicable,
    requiere_autorizacion, activo
) VALUES
-- Descuentos porcentuales
('DESC-5', 'Descuento 5%', 'Descuento general del 5%', 'porcentaje', 5.00, 0, 'ambos', false, true),
('DESC-10', 'Descuento 10%', 'Descuento del 10%', 'porcentaje', 10.00, 0, 'ambos', false, true),
('DESC-15', 'Descuento 15%', 'Descuento del 15% (requiere autorización)', 'porcentaje', 15.00, 0, 'ambos', true, true),
('DESC-20', 'Descuento 20%', 'Descuento del 20% (requiere autorización)', 'porcentaje', 20.00, 0, 'ambos', true, true),

-- Descuentos por monto fijo
('DESC-5K', 'Descuento $5,000', 'Descuento fijo de $5,000', 'monto_fijo', 5000.00, 20000, 'ambos', false, true),
('DESC-10K', 'Descuento $10,000', 'Descuento fijo de $10,000', 'monto_fijo', 10000.00, 50000, 'ambos', true, true),

-- Descuentos especiales
('HUESPED-FREC', 'Huésped Frecuente', 'Descuento del 8% para huéspedes frecuentes', 'porcentaje', 8.00, 0, 'ambos', false, true),
('HAPPY-HOUR', 'Happy Hour', 'Descuento del 12% en happy hour (18:00-20:00)', 'porcentaje', 12.00, 0, 'producto', false, false) -- Desactivado por defecto, se activa en horario

ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    tipo = EXCLUDED.tipo,
    valor = EXCLUDED.valor,
    updated_at = CURRENT_TIMESTAMP;

RAISE NOTICE '✅ 8 descuentos predefinidos creados';

-- =====================================================
-- 3. CÓDIGOS DE BARRAS DE EJEMPLO (Opcional)
-- =====================================================
-- Agregar códigos de barras a algunos items existentes como ejemplo
-- Esto es opcional y depende de tu inventario real

DO $$
DECLARE
    v_count INT;
BEGIN
    -- Verificar si hay items en inventario
    SELECT COUNT(*) INTO v_count FROM items_inventario WHERE activo = true;

    IF v_count > 0 THEN
        -- Agregar códigos de barras ficticios a los primeros 10 items
        -- En producción, estos serían códigos reales escaneados
        UPDATE items_inventario
        SET codigo_barras = 'EAN' || LPAD(id::TEXT, 10, '0')
        WHERE id IN (
            SELECT id FROM items_inventario
            WHERE activo = true
            AND codigo_barras IS NULL
            LIMIT 10
        );

        RAISE NOTICE '✅ Códigos de barras de ejemplo agregados a items de inventario';
    ELSE
        RAISE NOTICE 'ℹ️ No hay items en inventario para agregar códigos de barras';
    END IF;
END $$;

-- =====================================================
-- 4. DATOS DE PRUEBA (OPCIONAL - Solo para desarrollo)
-- =====================================================
-- Descomenta esta sección si quieres datos de prueba

/*
-- Crear un turno de prueba (requiere usuario existente)
DO $$
DECLARE
    v_usuario_id INT;
    v_caja_id INT;
    v_turno_id INT;
BEGIN
    -- Obtener primer usuario admin
    SELECT id INTO v_usuario_id FROM usuarios WHERE rol = 'admin' LIMIT 1;

    -- Obtener caja
    SELECT id INTO v_caja_id FROM cajas WHERE codigo = 'CAJA-01';

    IF v_usuario_id IS NOT NULL AND v_caja_id IS NOT NULL THEN
        -- Abrir turno de prueba
        INSERT INTO turnos_caja (
            caja_id, usuario_id, monto_inicial, notas_apertura, created_by
        ) VALUES (
            v_caja_id, v_usuario_id, 100000, 'Turno de prueba inicial', v_usuario_id
        )
        RETURNING id INTO v_turno_id;

        RAISE NOTICE '✅ Turno de prueba creado (ID: %)', v_turno_id;
    ELSE
        RAISE NOTICE 'ℹ️ No se puede crear turno de prueba (falta usuario o caja)';
    END IF;
END $$;

-- Crear una venta de prueba (consumidor final)
DO $$
DECLARE
    v_usuario_id INT;
    v_turno_id INT;
    v_item_id INT;
    v_venta_id INT;
    v_detalle_id INT;
    v_metodo_efectivo_id INT;
BEGIN
    -- Obtener IDs necesarios
    SELECT id INTO v_usuario_id FROM usuarios WHERE rol = 'admin' LIMIT 1;
    SELECT id INTO v_turno_id FROM turnos_caja WHERE estado = 'abierto' LIMIT 1;
    SELECT id INTO v_item_id FROM items_inventario WHERE activo = true AND tipo = 'producto' LIMIT 1;
    SELECT id INTO v_metodo_efectivo_id FROM metodos_pago WHERE tipo = 'efectivo' LIMIT 1;

    IF v_usuario_id IS NOT NULL AND v_turno_id IS NOT NULL AND v_item_id IS NOT NULL THEN
        -- Crear venta
        INSERT INTO ventas_pos (
            turno_caja_id, tipo_cliente, subtotal, iva, total,
            estado_pago, created_by
        ) VALUES (
            v_turno_id, 'consumidor_final', 10000, 1900, 11900,
            'pagado', v_usuario_id
        )
        RETURNING id INTO v_venta_id;

        -- Agregar detalle de venta
        INSERT INTO detalle_venta_pos (
            venta_pos_id, item_inventario_id, nombre_item, tipo_item,
            cantidad, precio_unitario, iva_porcentaje
        ) VALUES (
            v_venta_id, v_item_id, 'Producto de prueba', 'producto',
            2, 5000, 19
        )
        RETURNING id INTO v_detalle_id;

        -- Agregar pago
        INSERT INTO venta_pos_pagos (
            venta_pos_id, metodo_pago_id, monto, monto_recibido, cambio
        ) VALUES (
            v_venta_id, v_metodo_efectivo_id, 11900, 20000, 8100
        );

        RAISE NOTICE '✅ Venta de prueba creada (ID: %)', v_venta_id;
    ELSE
        RAISE NOTICE 'ℹ️ No se puede crear venta de prueba (faltan datos)';
    END IF;
END $$;
*/

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
    v_cajas INT;
    v_descuentos INT;
    v_items_con_barcode INT;
BEGIN
    SELECT COUNT(*) INTO v_cajas FROM cajas WHERE activa = true;
    SELECT COUNT(*) INTO v_descuentos FROM descuentos WHERE activo = true;
    SELECT COUNT(*) INTO v_items_con_barcode FROM items_inventario WHERE codigo_barras IS NOT NULL;

    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ SEEDS POS COMPLETADOS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Cajas activas: %', v_cajas;
    RAISE NOTICE 'Descuentos activos: %', v_descuentos;
    RAISE NOTICE 'Items con código de barras: %', v_items_con_barcode;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema POS listo para usar!';
    RAISE NOTICE '💡 Puedes descomentar la sección de datos de prueba si necesitas';
    RAISE NOTICE '';
END $$;
