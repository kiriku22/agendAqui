-- =====================================================
-- SISTEMA POS - FACTUFY HOTEL
-- Migración: Crear sistema completo de Punto de Venta
-- Incluye: Caja, Ventas, Descuentos, Turnos
-- =====================================================

-- =====================================================
-- 1. TABLA: cajas
-- Definición de cajas registradoras
-- =====================================================
CREATE TABLE IF NOT EXISTS cajas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cajas IS 'Definiciones de cajas registradoras del hotel';
COMMENT ON COLUMN cajas.codigo IS 'Código único de la caja (ej: CAJA-01)';
COMMENT ON COLUMN cajas.ubicacion IS 'Ubicación física (ej: Recepción, Bar, Restaurante)';

-- =====================================================
-- 2. TABLA: descuentos
-- Reglas y configuraciones de descuentos
-- =====================================================
CREATE TABLE IF NOT EXISTS descuentos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
    valor DECIMAL(10,2) NOT NULL,
    -- Condiciones de aplicación
    monto_minimo DECIMAL(10,2) DEFAULT 0,
    categoria_aplicable INT REFERENCES categorias_inventario(id),
    tipo_item_aplicable VARCHAR(20) CHECK (tipo_item_aplicable IN ('producto', 'servicio', 'ambos')),
    -- Vigencia
    fecha_inicio DATE,
    fecha_fin DATE,
    dias_semana VARCHAR(50), -- JSON: ["lunes", "martes", ...]
    hora_inicio TIME,
    hora_fin TIME,
    -- Autorización
    requiere_autorizacion BOOLEAN DEFAULT false,
    rol_autorizador VARCHAR(20) DEFAULT 'gerente',
    -- Estado
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES usuarios(id),

    CONSTRAINT chk_descuento_valor_positivo CHECK (valor > 0),
    CONSTRAINT chk_descuento_porcentaje CHECK (
        (tipo = 'porcentaje' AND valor <= 100) OR tipo = 'monto_fijo'
    )
);

COMMENT ON TABLE descuentos IS 'Reglas de descuentos predefinidos para el POS';
COMMENT ON COLUMN descuentos.tipo IS 'Tipo de descuento: porcentaje (%) o monto fijo ($)';
COMMENT ON COLUMN descuentos.valor IS 'Valor del descuento (porcentaje o monto según tipo)';
COMMENT ON COLUMN descuentos.requiere_autorizacion IS 'Si requiere autorización de gerente para aplicar';

-- =====================================================
-- 3. TABLA: turnos_caja
-- Turnos de apertura/cierre de caja
-- =====================================================
CREATE TABLE IF NOT EXISTS turnos_caja (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    caja_id INT NOT NULL REFERENCES cajas(id),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    -- Apertura
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
    notas_apertura TEXT,
    -- Cierre
    fecha_cierre TIMESTAMP,
    monto_esperado DECIMAL(10,2),
    monto_real DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    notas_cierre TEXT,
    -- Estado
    estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    -- Auditoría
    created_by INT REFERENCES usuarios(id),
    closed_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_monto_inicial_positivo CHECK (monto_inicial >= 0),
    CONSTRAINT chk_un_turno_abierto_por_caja UNIQUE (caja_id, estado)
        DEFERRABLE INITIALLY DEFERRED
);

-- Índice para buscar turno activo rápidamente
CREATE INDEX idx_turnos_caja_activo ON turnos_caja(caja_id, estado) WHERE estado = 'abierto';

COMMENT ON TABLE turnos_caja IS 'Turnos de caja con apertura y cierre';
COMMENT ON COLUMN turnos_caja.monto_inicial IS 'Efectivo inicial al abrir caja';
COMMENT ON COLUMN turnos_caja.monto_esperado IS 'Monto calculado según ventas del turno';
COMMENT ON COLUMN turnos_caja.monto_real IS 'Monto real contado al cerrar';
COMMENT ON COLUMN turnos_caja.diferencia IS 'Diferencia = monto_real - monto_esperado';

-- =====================================================
-- 4. TABLA: arqueos_caja
-- Conteo de denominaciones al cierre de turno
-- =====================================================
CREATE TABLE IF NOT EXISTS arqueos_caja (
    id SERIAL PRIMARY KEY,
    turno_caja_id INT NOT NULL REFERENCES turnos_caja(id) ON DELETE CASCADE,
    denominacion VARCHAR(20) NOT NULL, -- '100000', '50000', '20000', '10000', '5000', '2000', '1000', '500', '200', '100', '50'
    cantidad INT NOT NULL DEFAULT 0,
    valor_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cantidad_positiva CHECK (cantidad >= 0)
);

CREATE INDEX idx_arqueos_turno ON arqueos_caja(turno_caja_id);

COMMENT ON TABLE arqueos_caja IS 'Conteo detallado de billetes y monedas al cierre';
COMMENT ON COLUMN arqueos_caja.denominacion IS 'Denominación del billete/moneda';
COMMENT ON COLUMN arqueos_caja.subtotal IS 'cantidad × valor_unitario';

-- =====================================================
-- 5. TABLA: movimientos_caja
-- Registro de todos los movimientos de efectivo
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id SERIAL PRIMARY KEY,
    turno_caja_id INT NOT NULL REFERENCES turnos_caja(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
    concepto VARCHAR(50) NOT NULL CHECK (concepto IN (
        'venta', 'retiro', 'fondo_inicial', 'reembolso', 'ajuste', 'otro'
    )),
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago_id INT REFERENCES metodos_pago(id),
    venta_pos_id INT, -- Referencia a ventas_pos (se crea después)
    factura_id INT REFERENCES facturas(id),
    referencia VARCHAR(100),
    descripcion TEXT,
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_movimientos_turno ON movimientos_caja(turno_caja_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_caja(tipo, concepto);

COMMENT ON TABLE movimientos_caja IS 'Registro de todos los movimientos de efectivo del turno';
COMMENT ON COLUMN movimientos_caja.tipo IS 'ingreso (entrada) o egreso (salida)';
COMMENT ON COLUMN movimientos_caja.concepto IS 'Razón del movimiento';

-- =====================================================
-- 6. TABLA: ventas_pos
-- Registro principal de ventas del POS
-- =====================================================
CREATE TABLE IF NOT EXISTS ventas_pos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    turno_caja_id INT NOT NULL REFERENCES turnos_caja(id),
    -- Cliente
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN (
        'consumidor_final', 'cliente_registrado', 'huesped'
    )),
    cliente_id INT REFERENCES clientes(id),
    huesped_id INT REFERENCES huespedes(id),
    hospedaje_id INT REFERENCES hospedajes(id),
    -- Montos
    subtotal DECIMAL(10,2) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(10,2) DEFAULT 0,
    descuento_id INT REFERENCES descuentos(id),
    iva DECIMAL(10,2) DEFAULT 0,
    propina DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    -- Estado
    estado_pago VARCHAR(20) DEFAULT 'pagado' CHECK (estado_pago IN (
        'pagado', 'cuenta_huesped', 'pendiente', 'anulado'
    )),
    -- Metadatos
    notas TEXT,
    factura_id INT REFERENCES facturas(id),
    created_by INT REFERENCES usuarios(id),
    anulado_by INT REFERENCES usuarios(id),
    fecha_anulacion TIMESTAMP,
    motivo_anulacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_subtotal_positivo CHECK (subtotal > 0),
    CONSTRAINT chk_total_positivo CHECK (total > 0),
    CONSTRAINT chk_descuento_porcentaje_valido CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
    CONSTRAINT chk_cliente_segun_tipo CHECK (
        (tipo_cliente = 'consumidor_final' AND cliente_id IS NULL AND huesped_id IS NULL) OR
        (tipo_cliente = 'cliente_registrado' AND cliente_id IS NOT NULL) OR
        (tipo_cliente = 'huesped' AND huesped_id IS NOT NULL AND hospedaje_id IS NOT NULL)
    )
);

CREATE INDEX idx_ventas_pos_turno ON ventas_pos(turno_caja_id);
CREATE INDEX idx_ventas_pos_fecha ON ventas_pos(created_at);
CREATE INDEX idx_ventas_pos_cliente ON ventas_pos(cliente_id);
CREATE INDEX idx_ventas_pos_huesped ON ventas_pos(huesped_id);
CREATE INDEX idx_ventas_pos_estado ON ventas_pos(estado_pago);

COMMENT ON TABLE ventas_pos IS 'Ventas realizadas desde el punto de venta';
COMMENT ON COLUMN ventas_pos.tipo_cliente IS 'Tipo de cliente: walk-in, registrado o huésped';
COMMENT ON COLUMN ventas_pos.estado_pago IS 'Estado del pago: pagado inmediato, cargado a cuenta o pendiente';

-- =====================================================
-- 7. TABLA: detalle_venta_pos
-- Líneas/items de cada venta
-- =====================================================
CREATE TABLE IF NOT EXISTS detalle_venta_pos (
    id SERIAL PRIMARY KEY,
    venta_pos_id INT NOT NULL REFERENCES ventas_pos(id) ON DELETE CASCADE,
    item_inventario_id INT REFERENCES items_inventario(id),
    -- Datos del item (denormalizados para histórico)
    codigo_item VARCHAR(50),
    nombre_item VARCHAR(200) NOT NULL,
    tipo_item VARCHAR(20) NOT NULL CHECK (tipo_item IN ('producto', 'servicio')),
    -- Cantidades y precios
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento_linea DECIMAL(10,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 0,
    iva_monto DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    -- Notas
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    CONSTRAINT chk_precio_unitario_positivo CHECK (precio_unitario >= 0)
);

CREATE INDEX idx_detalle_venta_pos ON detalle_venta_pos(venta_pos_id);
CREATE INDEX idx_detalle_item ON detalle_venta_pos(item_inventario_id);

COMMENT ON TABLE detalle_venta_pos IS 'Items individuales de cada venta POS';
COMMENT ON COLUMN detalle_venta_pos.nombre_item IS 'Nombre denormalizado para mantener histórico';

-- =====================================================
-- 8. TABLA: venta_pos_pagos
-- Métodos de pago de cada venta (split payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS venta_pos_pagos (
    id SERIAL PRIMARY KEY,
    venta_pos_id INT NOT NULL REFERENCES ventas_pos(id) ON DELETE CASCADE,
    metodo_pago_id INT NOT NULL REFERENCES metodos_pago(id),
    monto DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100),
    monto_recibido DECIMAL(10,2), -- Para efectivo
    cambio DECIMAL(10,2), -- Para efectivo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_monto_pago_positivo CHECK (monto > 0)
);

CREATE INDEX idx_venta_pos_pagos ON venta_pos_pagos(venta_pos_id);
CREATE INDEX idx_venta_pos_pagos_metodo ON venta_pos_pagos(metodo_pago_id);

COMMENT ON TABLE venta_pos_pagos IS 'Métodos de pago utilizados en cada venta (soporta split payment)';
COMMENT ON COLUMN venta_pos_pagos.cambio IS 'Vuelto dado al cliente (solo efectivo)';

-- =====================================================
-- MODIFICACIÓN DE TABLAS EXISTENTES
-- =====================================================

-- Agregar campo codigo_barras a items_inventario
ALTER TABLE items_inventario
ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(100) UNIQUE;

COMMENT ON COLUMN items_inventario.codigo_barras IS 'Código de barras para escaneo en POS';

-- Agregar campos a facturas para vincular con POS
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS venta_pos_id INT REFERENCES ventas_pos(id),
ADD COLUMN IF NOT EXISTS tipo_factura VARCHAR(20) DEFAULT 'checkout'
    CHECK (tipo_factura IN ('checkout', 'venta_pos', 'evento', 'otro'));

COMMENT ON COLUMN facturas.venta_pos_id IS 'ID de venta POS que generó esta factura';
COMMENT ON COLUMN facturas.tipo_factura IS 'Origen de la factura: checkout hotel, venta directa POS, etc.';

-- Ahora podemos agregar la FK desde movimientos_caja
ALTER TABLE movimientos_caja
ADD CONSTRAINT fk_movimientos_venta_pos
FOREIGN KEY (venta_pos_id) REFERENCES ventas_pos(id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- =====================================================
-- TRIGGER 1: Generar código de turno
-- =====================================================
CREATE OR REPLACE FUNCTION generar_codigo_turno()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_codigo VARCHAR(20);
    fecha_actual DATE;
    contador INT;
BEGIN
    fecha_actual := CURRENT_DATE;

    -- Contar turnos del día
    SELECT COUNT(*) + 1 INTO contador
    FROM turnos_caja
    WHERE DATE(fecha_apertura) = fecha_actual;

    -- Generar código: TURNO-YYYYMMDD-0001
    nuevo_codigo := 'TURNO-' ||
                   TO_CHAR(fecha_actual, 'YYYYMMDD') || '-' ||
                   LPAD(contador::TEXT, 4, '0');

    NEW.codigo := nuevo_codigo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_turno
BEFORE INSERT ON turnos_caja
FOR EACH ROW
WHEN (NEW.codigo IS NULL)
EXECUTE FUNCTION generar_codigo_turno();

-- =====================================================
-- TRIGGER 2: Generar código de venta POS
-- =====================================================
CREATE OR REPLACE FUNCTION generar_codigo_venta_pos()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_codigo VARCHAR(20);
    fecha_actual DATE;
    contador INT;
BEGIN
    fecha_actual := CURRENT_DATE;

    -- Contar ventas del día
    SELECT COUNT(*) + 1 INTO contador
    FROM ventas_pos
    WHERE DATE(created_at) = fecha_actual;

    -- Generar código: VPOS-YYYYMMDD-0001
    nuevo_codigo := 'VPOS-' ||
                   TO_CHAR(fecha_actual, 'YYYYMMDD') || '-' ||
                   LPAD(contador::TEXT, 4, '0');

    NEW.codigo := nuevo_codigo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_venta_pos
BEFORE INSERT ON ventas_pos
FOR EACH ROW
WHEN (NEW.codigo IS NULL)
EXECUTE FUNCTION generar_codigo_venta_pos();

-- =====================================================
-- TRIGGER 3: Calcular totales de línea de venta
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_totales_linea_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular subtotal antes de IVA y descuentos
    NEW.subtotal := NEW.cantidad * NEW.precio_unitario;

    -- Aplicar descuento de línea si existe
    IF NEW.descuento_linea > 0 THEN
        NEW.subtotal := NEW.subtotal - NEW.descuento_linea;
    END IF;

    -- Calcular IVA
    IF NEW.iva_porcentaje > 0 THEN
        NEW.iva_monto := NEW.subtotal * (NEW.iva_porcentaje / 100);
    ELSE
        NEW.iva_monto := 0;
    END IF;

    -- Calcular total de línea
    NEW.total := NEW.subtotal + NEW.iva_monto;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_totales_linea_venta
BEFORE INSERT OR UPDATE ON detalle_venta_pos
FOR EACH ROW
EXECUTE FUNCTION calcular_totales_linea_venta();

-- =====================================================
-- TRIGGER 4: Registrar movimiento de caja en venta
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_movimiento_caja_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar movimientos para ventas pagadas inmediatamente
    IF NEW.estado_pago = 'pagado' THEN
        -- Insertar un movimiento por cada método de pago
        INSERT INTO movimientos_caja (
            turno_caja_id,
            tipo,
            concepto,
            monto,
            metodo_pago_id,
            venta_pos_id,
            factura_id,
            descripcion,
            created_by
        )
        SELECT
            NEW.turno_caja_id,
            'ingreso',
            'venta',
            vpp.monto,
            vpp.metodo_pago_id,
            NEW.id,
            NEW.factura_id,
            'Venta POS ' || NEW.codigo,
            NEW.created_by
        FROM venta_pos_pagos vpp
        WHERE vpp.venta_pos_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registrar_movimiento_caja_venta
AFTER INSERT ON ventas_pos
FOR EACH ROW
EXECUTE FUNCTION registrar_movimiento_caja_venta();

-- =====================================================
-- TRIGGER 5: Actualizar stock en venta POS
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_stock_venta_pos()
RETURNS TRIGGER AS $$
DECLARE
    v_item items_inventario%ROWTYPE;
    v_venta ventas_pos%ROWTYPE;
BEGIN
    -- Obtener información del item
    SELECT * INTO v_item
    FROM items_inventario
    WHERE id = NEW.item_inventario_id;

    -- Obtener información de la venta
    SELECT * INTO v_venta
    FROM ventas_pos
    WHERE id = NEW.venta_pos_id;

    -- Solo actualizar stock si es un producto y la venta no está anulada
    IF v_item.tipo = 'producto' AND v_venta.estado_pago != 'anulado' THEN
        -- Verificar stock disponible
        IF v_item.stock_actual < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, Solicitado: %',
                v_item.nombre, v_item.stock_actual, NEW.cantidad;
        END IF;

        -- Reducir stock
        UPDATE items_inventario
        SET stock_actual = stock_actual - NEW.cantidad,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.item_inventario_id;

        -- Registrar movimiento de inventario
        INSERT INTO movimientos_inventario (
            item_inventario_id,
            tipo_movimiento,
            cantidad,
            stock_anterior,
            stock_nuevo,
            motivo,
            usuario_id,
            fecha_movimiento
        ) VALUES (
            NEW.item_inventario_id,
            'salida',
            NEW.cantidad::INT,
            v_item.stock_actual,
            v_item.stock_actual - NEW.cantidad::INT,
            'Venta POS ' || v_venta.codigo,
            v_venta.created_by,
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock_venta_pos
AFTER INSERT ON detalle_venta_pos
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_venta_pos();

-- =====================================================
-- TRIGGER 6: Calcular monto esperado al cerrar turno
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_monto_esperado_cierre()
RETURNS TRIGGER AS $$
DECLARE
    total_ingresos DECIMAL(10,2);
    total_egresos DECIMAL(10,2);
BEGIN
    -- Solo calcular al cerrar
    IF NEW.estado = 'cerrado' AND OLD.estado = 'abierto' THEN
        -- Sumar ingresos del turno
        SELECT COALESCE(SUM(monto), 0) INTO total_ingresos
        FROM movimientos_caja
        WHERE turno_caja_id = NEW.id AND tipo = 'ingreso';

        -- Sumar egresos del turno
        SELECT COALESCE(SUM(monto), 0) INTO total_egresos
        FROM movimientos_caja
        WHERE turno_caja_id = NEW.id AND tipo = 'egreso';

        -- Calcular monto esperado
        NEW.monto_esperado := NEW.monto_inicial + total_ingresos - total_egresos;

        -- Calcular diferencia si ya hay monto real
        IF NEW.monto_real IS NOT NULL THEN
            NEW.diferencia := NEW.monto_real - NEW.monto_esperado;
        END IF;

        NEW.fecha_cierre := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_monto_esperado_cierre
BEFORE UPDATE ON turnos_caja
FOR EACH ROW
WHEN (NEW.estado = 'cerrado')
EXECUTE FUNCTION calcular_monto_esperado_cierre();

-- =====================================================
-- TRIGGER 7: Actualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cajas_updated_at
BEFORE UPDATE ON cajas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_descuentos_updated_at
BEFORE UPDATE ON descuentos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS
-- =====================================================

-- =====================================================
-- VISTA 1: Turnos activos con resumen de ventas
-- =====================================================
CREATE OR REPLACE VIEW v_turnos_activos AS
SELECT
    t.id,
    t.codigo,
    t.caja_id,
    c.nombre AS caja_nombre,
    t.usuario_id,
    u.username AS usuario_nombre,
    t.fecha_apertura,
    t.monto_inicial,
    t.estado,
    -- Estadísticas del turno
    COUNT(DISTINCT v.id) AS num_ventas,
    COALESCE(SUM(v.total), 0) AS total_ventas,
    COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) AS total_ingresos,
    COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) AS total_egresos,
    t.monto_inicial +
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) AS efectivo_esperado
FROM turnos_caja t
INNER JOIN cajas c ON t.caja_id = c.id
INNER JOIN usuarios u ON t.usuario_id = u.id
LEFT JOIN ventas_pos v ON v.turno_caja_id = t.id AND v.estado_pago != 'anulado'
LEFT JOIN movimientos_caja m ON m.turno_caja_id = t.id
WHERE t.estado = 'abierto'
GROUP BY t.id, c.nombre, u.username;

COMMENT ON VIEW v_turnos_activos IS 'Vista de turnos activos con estadísticas en tiempo real';

-- =====================================================
-- VISTA 2: Productos más vendidos
-- =====================================================
CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT
    i.id AS item_id,
    i.codigo,
    i.nombre,
    i.tipo,
    c.nombre AS categoria_nombre,
    SUM(dv.cantidad)::INT AS cantidad_vendida,
    COUNT(DISTINCT dv.venta_pos_id)::INT AS veces_vendido,
    SUM(dv.total) AS ingresos_generados,
    AVG(dv.precio_unitario) AS precio_promedio,
    -- Calcular utilidad si hay precio_compra
    CASE
        WHEN i.precio_compra IS NOT NULL AND i.precio_compra > 0 THEN
            SUM((dv.precio_unitario - i.precio_compra) * dv.cantidad)
        ELSE NULL
    END AS utilidad_generada,
    MAX(v.created_at) AS ultima_venta
FROM detalle_venta_pos dv
INNER JOIN ventas_pos v ON dv.venta_pos_id = v.id
INNER JOIN items_inventario i ON dv.item_inventario_id = i.id
LEFT JOIN categorias_inventario c ON i.categoria_id = c.id
WHERE v.estado_pago != 'anulado'
GROUP BY i.id, i.codigo, i.nombre, i.tipo, c.nombre, i.precio_compra
ORDER BY cantidad_vendida DESC;

COMMENT ON VIEW v_productos_mas_vendidos IS 'Ranking de productos/servicios más vendidos con métricas de utilidad';

-- =====================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_descuentos_activo_vigente
ON descuentos(activo, fecha_inicio, fecha_fin)
WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_ventas_pos_created_at_desc
ON ventas_pos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_item_fecha
ON detalle_venta_pos(item_inventario_id, created_at);

-- Índice para código de barras (búsqueda rápida en POS)
CREATE INDEX IF NOT EXISTS idx_items_codigo_barras
ON items_inventario(codigo_barras)
WHERE codigo_barras IS NOT NULL;

-- =====================================================
-- PERMISOS Y SEGURIDAD
-- =====================================================

-- Los permisos se manejan a nivel de aplicación con JWT
-- pero podemos agregar RLS (Row Level Security) si es necesario

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema POS creado exitosamente';
    RAISE NOTICE '📊 8 tablas creadas';
    RAISE NOTICE '⚡ 7 triggers configurados';
    RAISE NOTICE '👁️ 2 vistas creadas';
    RAISE NOTICE '🚀 Listo para usar!';
END $$;
