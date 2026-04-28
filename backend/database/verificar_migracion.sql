-- Script de verificación: ¿Se crearon las tablas POS?

\echo '================================='
\echo 'VERIFICACIÓN SISTEMA POS'
\echo '================================='
\echo ''

-- Verificar si existen las tablas
\echo 'Verificando tablas creadas...'
\echo ''

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cajas')
        THEN '✅ cajas'
        ELSE '❌ cajas NO EXISTE'
    END AS tabla_cajas,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'descuentos')
        THEN '✅ descuentos'
        ELSE '❌ descuentos NO EXISTE'
    END AS tabla_descuentos,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'turnos_caja')
        THEN '✅ turnos_caja'
        ELSE '❌ turnos_caja NO EXISTE'
    END AS tabla_turnos_caja,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'movimientos_caja')
        THEN '✅ movimientos_caja'
        ELSE '❌ movimientos_caja NO EXISTE'
    END AS tabla_movimientos_caja;

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arqueos_caja')
        THEN '✅ arqueos_caja'
        ELSE '❌ arqueos_caja NO EXISTE'
    END AS tabla_arqueos_caja,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_pos')
        THEN '✅ ventas_pos'
        ELSE '❌ ventas_pos NO EXISTE'
    END AS tabla_ventas_pos,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detalle_venta_pos')
        THEN '✅ detalle_venta_pos'
        ELSE '❌ detalle_venta_pos NO EXISTE'
    END AS tabla_detalle_venta_pos,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venta_pos_pagos')
        THEN '✅ venta_pos_pagos'
        ELSE '❌ venta_pos_pagos NO EXISTE'
    END AS tabla_venta_pos_pagos;

\echo ''
\echo 'Verificando campos agregados a tablas existentes...'
\echo ''

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'items_inventario' AND column_name = 'codigo_barras'
        )
        THEN '✅ items_inventario.codigo_barras agregado'
        ELSE '❌ items_inventario.codigo_barras NO EXISTE'
    END AS campo_codigo_barras,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'facturas' AND column_name = 'venta_pos_id'
        )
        THEN '✅ facturas.venta_pos_id agregado'
        ELSE '❌ facturas.venta_pos_id NO EXISTE'
    END AS campo_venta_pos_id,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'facturas' AND column_name = 'tipo_factura'
        )
        THEN '✅ facturas.tipo_factura agregado'
        ELSE '❌ facturas.tipo_factura NO EXISTE'
    END AS campo_tipo_factura;

\echo ''
\echo 'Verificando vistas creadas...'
\echo ''

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_turnos_activos')
        THEN '✅ v_turnos_activos'
        ELSE '❌ v_turnos_activos NO EXISTE'
    END AS vista_turnos_activos,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_productos_mas_vendidos')
        THEN '✅ v_productos_mas_vendidos'
        ELSE '❌ v_productos_mas_vendidos NO EXISTE'
    END AS vista_productos_vendidos;

\echo ''
\echo 'Verificando datos iniciales (seeds)...'
\echo ''

SELECT
    (SELECT COUNT(*) FROM cajas WHERE activa = true) AS num_cajas,
    (SELECT COUNT(*) FROM descuentos WHERE activo = true) AS num_descuentos;

\echo ''
\echo '================================='
\echo 'VERIFICACIÓN COMPLETADA'
\echo '================================='
