-- ============================================================================
-- FACTUFY HOTEL - ESQUEMA DE BASE DE DATOS
-- Base de datos: factufy_hotel
-- Versión: 1.0
-- Descripción: Sistema completo de gestión hotelera
-- ============================================================================

-- Configurar timezone
SET timezone = 'America/Bogota';

-- ============================================================================
-- TABLA 1: USUARIOS
-- ============================================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    pin VARCHAR(6),
    rol VARCHAR(20) NOT NULL DEFAULT 'recepcionista',
    email VARCHAR(100),
    telefono VARCHAR(20),
    foto_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rol CHECK (rol IN ('admin', 'recepcionista', 'limpieza', 'mantenimiento', 'gerente'))
);

CREATE INDEX idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX idx_usuarios_rol ON usuarios(rol, activo);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles específicos';
COMMENT ON COLUMN usuarios.pin IS 'PIN de 4-6 dígitos para acceso rápido';

-- ============================================================================
-- TABLA 2: HABITACIONES
-- ============================================================================
CREATE TABLE habitaciones (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) UNIQUE NOT NULL,
    piso INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    capacidad INT DEFAULT 1,
    precio_noche DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    comodidades JSONB DEFAULT '[]',
    estado VARCHAR(20) DEFAULT 'disponible',
    activa BOOLEAN DEFAULT true,
    imagen_url TEXT,
    ultima_limpieza TIMESTAMP,
    ultima_mantenimiento TIMESTAMP,
    notas_mantenimiento TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo CHECK (tipo IN ('simple', 'doble', 'suite', 'familiar', 'presidencial')),
    CONSTRAINT chk_estado CHECK (estado IN ('disponible', 'ocupada', 'limpieza', 'mantenimiento', 'reservada')),
    CONSTRAINT chk_capacidad CHECK (capacidad > 0),
    CONSTRAINT chk_precio CHECK (precio_noche > 0)
);

CREATE INDEX idx_habitacion_estado ON habitaciones(estado, activa);
CREATE INDEX idx_habitacion_piso ON habitaciones(piso, estado);
CREATE INDEX idx_habitacion_tipo ON habitaciones(tipo, activa);

COMMENT ON TABLE habitaciones IS 'Inventario de habitaciones del hotel';

-- ============================================================================
-- TABLA 3: CLIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    tipo_documento VARCHAR(20) DEFAULT 'CC',
    numero_documento VARCHAR(50),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Colombia',
    fecha_nacimiento DATE,
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_documento CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'))
);

CREATE INDEX idx_clientes_documento ON clientes(tipo_documento, numero_documento);
CREATE INDEX idx_clientes_nombre ON clientes(nombre, apellido);
CREATE INDEX idx_clientes_activo ON clientes(activo);

COMMENT ON TABLE clientes IS 'Base de datos de clientes/huéspedes';

-- ============================================================================
-- TABLA 4: HUESPEDES
-- ============================================================================
CREATE TABLE huespedes (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(50) UNIQUE NOT NULL,
    fecha_nacimiento DATE,
    nacionalidad VARCHAR(50) DEFAULT 'Colombiana',
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Colombia',
    contacto_emergencia VARCHAR(200),
    telefono_emergencia VARCHAR(20),
    observaciones TEXT,
    preferencias JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT chk_tipo_doc_huesped CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'Pasaporte', 'Otro'))
);

CREATE INDEX idx_huesped_cliente ON huespedes(cliente_id);
CREATE INDEX idx_huesped_documento ON huespedes(tipo_documento, numero_documento);
CREATE UNIQUE INDEX idx_huesped_doc_unico ON huespedes(numero_documento);

COMMENT ON TABLE huespedes IS 'Información detallada de huéspedes registrados';

-- ============================================================================
-- TABLA 5: RESERVAS
-- ============================================================================
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    habitacion_id INT NOT NULL,
    huesped_id INT NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    noches INT NOT NULL,
    precio_noche DECIMAL(10,2) NOT NULL,
    precio_total DECIMAL(10,2) NOT NULL,
    anticipo DECIMAL(10,2) DEFAULT 0,
    saldo_pendiente DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'pendiente',
    canal_reserva VARCHAR(50) DEFAULT 'directo',
    observaciones TEXT,
    notas_especiales TEXT,
    created_by INT,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    motivo_cancelacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reserva_habitacion FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_huesped FOREIGN KEY (huesped_id) REFERENCES huespedes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_usuario FOREIGN KEY (created_by) REFERENCES usuarios(id),
    CONSTRAINT chk_reserva_estado CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'en_curso', 'finalizada', 'no_show')),
    CONSTRAINT chk_canal_reserva CHECK (canal_reserva IN ('directo', 'booking', 'airbnb', 'expedia', 'telefono', 'web', 'walk_in')),
    CONSTRAINT chk_fechas_validas CHECK (fecha_salida > fecha_entrada),
    CONSTRAINT chk_noches CHECK (noches > 0),
    CONSTRAINT chk_anticipo CHECK (anticipo >= 0 AND anticipo <= precio_total)
);

CREATE INDEX idx_reserva_codigo ON reservas(codigo);
CREATE INDEX idx_reserva_fechas ON reservas(fecha_entrada, fecha_salida, estado);
CREATE INDEX idx_reserva_habitacion ON reservas(habitacion_id, estado);
CREATE INDEX idx_reserva_huesped ON reservas(huesped_id);
CREATE INDEX idx_reserva_estado ON reservas(estado, fecha_entrada);

-- ============================================================================
-- TABLA 6: HOSPEDAJES
-- ============================================================================
CREATE TABLE hospedajes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    reserva_id INT,
    habitacion_id INT NOT NULL,
    huesped_id INT NOT NULL,
    acompanantes JSONB DEFAULT '[]',
    fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_salida_prevista DATE NOT NULL,
    fecha_salida_real TIMESTAMP,
    noches_previstas INT NOT NULL,
    noches_reales INT,
    precio_noche DECIMAL(10,2) NOT NULL,
    precio_total_hospedaje DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'activo',
    observaciones TEXT,
    notas_especiales TEXT,
    forma_pago_anticipo VARCHAR(50),
    monto_anticipo DECIMAL(10,2) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMP,
    checked_out_by INT,
    CONSTRAINT fk_hospedaje_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL,
    CONSTRAINT fk_hospedaje_habitacion FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospedaje_huesped FOREIGN KEY (huesped_id) REFERENCES huespedes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospedaje_creador FOREIGN KEY (created_by) REFERENCES usuarios(id),
    CONSTRAINT fk_hospedaje_finalizador FOREIGN KEY (checked_out_by) REFERENCES usuarios(id),
    CONSTRAINT chk_hospedaje_estado CHECK (estado IN ('activo', 'finalizado', 'cancelado')),
    CONSTRAINT chk_noches_previstas CHECK (noches_previstas > 0)
);

CREATE INDEX idx_hospedaje_codigo ON hospedajes(codigo);
CREATE INDEX idx_hospedaje_activo ON hospedajes(estado, habitacion_id);
CREATE INDEX idx_hospedaje_habitacion ON hospedajes(habitacion_id, estado);
CREATE INDEX idx_hospedaje_huesped ON hospedajes(huesped_id);

-- ============================================================================
-- TABLA 7: SERVICIOS HOTEL
-- ============================================================================
CREATE TABLE servicios_hotel (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    iva DECIMAL(5,2) DEFAULT 0,
    precio_con_iva DECIMAL(10,2),
    unidad VARCHAR(20) DEFAULT 'servicio',
    duracion_minutos INT,
    activo BOOLEAN DEFAULT true,
    imagen_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_categoria_servicio CHECK (categoria IN ('lavanderia', 'transporte', 'spa', 'room_service', 'bar', 'restaurante', 'tours', 'otro')),
    CONSTRAINT chk_precio_servicio CHECK (precio >= 0)
);

CREATE INDEX idx_servicio_categoria ON servicios_hotel(categoria, activo);
CREATE INDEX idx_servicio_codigo ON servicios_hotel(codigo);

-- ============================================================================
-- TABLA 8: CONSUMOS HABITACIÓN
-- ============================================================================
CREATE TABLE consumos_habitacion (
    id SERIAL PRIMARY KEY,
    hospedaje_id INT NOT NULL,
    habitacion_id INT NOT NULL,
    producto_id INT,
    servicio_id INT,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    precio_total DECIMAL(10,2) NOT NULL,
    iva DECIMAL(10,2) DEFAULT 0,
    fecha_consumo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    facturado BOOLEAN DEFAULT false,
    factura_id INT,
    created_by INT,
    notas TEXT,
    CONSTRAINT fk_consumo_hospedaje FOREIGN KEY (hospedaje_id) REFERENCES hospedajes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_consumo_habitacion FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id) ON DELETE RESTRICT,
    CONSTRAINT fk_consumo_servicio FOREIGN KEY (servicio_id) REFERENCES servicios_hotel(id),
    CONSTRAINT fk_consumo_creador FOREIGN KEY (created_by) REFERENCES usuarios(id),
    CONSTRAINT chk_consumo_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_consumo_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_producto_o_servicio CHECK (producto_id IS NOT NULL OR servicio_id IS NOT NULL)
);

CREATE INDEX idx_consumo_hospedaje ON consumos_habitacion(hospedaje_id, facturado);
CREATE INDEX idx_consumo_habitacion ON consumos_habitacion(habitacion_id, fecha_consumo);

-- ============================================================================
-- TABLA 9: FACTURAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INT,
    hospedaje_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    iva DECIMAL(10,2) DEFAULT 0,
    propina DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pagada',
    observaciones TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_factura_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_factura_hospedaje FOREIGN KEY (hospedaje_id) REFERENCES hospedajes(id),
    CONSTRAINT fk_factura_usuario FOREIGN KEY (created_by) REFERENCES usuarios(id),
    CONSTRAINT chk_factura_estado CHECK (estado IN ('pagada', 'pendiente', 'anulada')),
    CONSTRAINT chk_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_total CHECK (total >= 0)
);

CREATE INDEX idx_factura_numero ON facturas(numero_factura);
CREATE INDEX idx_factura_cliente ON facturas(cliente_id);
CREATE INDEX idx_factura_hospedaje ON facturas(hospedaje_id);

-- ============================================================================
-- TABLA 10: METODOS DE PAGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    activo BOOLEAN DEFAULT true,
    requiere_referencia BOOLEAN DEFAULT false,
    icono VARCHAR(50),
    orden INT DEFAULT 0,
    CONSTRAINT chk_tipo_pago CHECK (tipo IN ('efectivo', 'tarjeta', 'transferencia', 'otro'))
);

CREATE INDEX idx_metodo_pago_activo ON metodos_pago(activo, orden);

-- ============================================================================
-- TABLA 11: FACTURA METODOS PAGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS factura_metodos_pago (
    id SERIAL PRIMARY KEY,
    factura_id INT NOT NULL,
    metodo_pago_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fmp_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    CONSTRAINT fk_fmp_metodo FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id),
    CONSTRAINT chk_monto_pago CHECK (monto > 0)
);

CREATE INDEX idx_fmp_factura ON factura_metodos_pago(factura_id);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trigger_update_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_habitaciones BEFORE UPDATE ON habitaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_clientes BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_huespedes BEFORE UPDATE ON huespedes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_reservas BEFORE UPDATE ON reservas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_hospedajes BEFORE UPDATE ON hospedajes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_servicios BEFORE UPDATE ON servicios_hotel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generar código de reserva
CREATE OR REPLACE FUNCTION generar_codigo_reserva()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := 'RES-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_reserva AFTER INSERT ON reservas FOR EACH ROW EXECUTE FUNCTION generar_codigo_reserva();

-- Calcular saldo pendiente de reserva
CREATE OR REPLACE FUNCTION calcular_saldo_reserva()
RETURNS TRIGGER AS $$
BEGIN
    NEW.saldo_pendiente := NEW.precio_total - COALESCE(NEW.anticipo, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_saldo_reserva BEFORE INSERT OR UPDATE ON reservas FOR EACH ROW EXECUTE FUNCTION calcular_saldo_reserva();

-- Generar código de hospedaje
CREATE OR REPLACE FUNCTION generar_codigo_hospedaje()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := 'HOS-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_hospedaje AFTER INSERT ON hospedajes FOR EACH ROW EXECUTE FUNCTION generar_codigo_hospedaje();

-- Actualizar estado habitación en check-in
CREATE OR REPLACE FUNCTION actualizar_estado_habitacion_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE habitaciones SET estado = 'ocupada', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.habitacion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_estado_habitacion_checkin AFTER INSERT ON hospedajes FOR EACH ROW WHEN (NEW.estado = 'activo') EXECUTE FUNCTION actualizar_estado_habitacion_checkin();

-- Calcular noches reales en checkout
CREATE OR REPLACE FUNCTION calcular_noches_reales()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_salida_real IS NOT NULL AND OLD.fecha_salida_real IS NULL THEN
        NEW.noches_reales := CEIL(EXTRACT(EPOCH FROM (NEW.fecha_salida_real - NEW.fecha_entrada)) / 86400);
        NEW.precio_total_hospedaje := NEW.noches_reales * NEW.precio_noche;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_noches_reales BEFORE UPDATE ON hospedajes FOR EACH ROW EXECUTE FUNCTION calcular_noches_reales();

-- Calcular precio con IVA de servicio
CREATE OR REPLACE FUNCTION calcular_precio_con_iva_servicio()
RETURNS TRIGGER AS $$
BEGIN
    NEW.precio_con_iva := NEW.precio * (1 + COALESCE(NEW.iva, 0) / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_precio_iva_servicio BEFORE INSERT OR UPDATE ON servicios_hotel FOR EACH ROW EXECUTE FUNCTION calcular_precio_con_iva_servicio();

-- Calcular precio total consumo
CREATE OR REPLACE FUNCTION calcular_precio_total_consumo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.precio_total := NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_precio_consumo BEFORE INSERT OR UPDATE ON consumos_habitacion FOR EACH ROW EXECUTE FUNCTION calcular_precio_total_consumo();

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Métodos de pago
INSERT INTO metodos_pago (nombre, tipo, requiere_referencia, icono, orden) VALUES
('Efectivo', 'efectivo', false, 'FaMoneyBillWave', 1),
('Tarjeta Débito', 'tarjeta', true, 'FaCreditCard', 2),
('Tarjeta Crédito', 'tarjeta', true, 'FaCreditCard', 3),
('Transferencia', 'transferencia', true, 'FaExchangeAlt', 4),
('Nequi', 'transferencia', true, 'FaMobileAlt', 5),
('Daviplata', 'transferencia', true, 'FaMobileAlt', 6)
ON CONFLICT DO NOTHING;

-- Usuario admin (password: admin123)
INSERT INTO usuarios (nombre, apellido, usuario, password, rol, activo) VALUES
('Administrador', 'Hotel', 'admin', '$2b$10$XqKwjW.jFZJZz8KXr6yGAeD4jyF0P0vM8Y8jE9tPzXy6B5qW0jq8W', 'admin', true)
ON CONFLICT (usuario) DO NOTHING;

-- Servicios hotel
INSERT INTO servicios_hotel (codigo, nombre, descripcion, categoria, precio, iva, activo) VALUES
('SRV-001', 'Lavandería Express', 'Servicio de lavandería express (24 horas)', 'lavanderia', 15000, 0, true),
('SRV-002', 'Lavandería Normal', 'Servicio de lavandería normal (48 horas)', 'lavanderia', 10000, 0, true),
('SRV-003', 'Planchado', 'Servicio de planchado por prenda', 'lavanderia', 5000, 0, true),
('SRV-004', 'Room Service - Desayuno', 'Desayuno servido en habitación', 'room_service', 25000, 8, true),
('SRV-005', 'Room Service - Almuerzo', 'Almuerzo servido en habitación', 'room_service', 35000, 8, true),
('SRV-006', 'Room Service - Cena', 'Cena servida en habitación', 'room_service', 35000, 8, true),
('SRV-007', 'Masaje Relajante 60min', 'Masaje relajante de 60 minutos', 'spa', 80000, 0, true),
('SRV-008', 'Transporte Aeropuerto', 'Transporte desde/hacia aeropuerto', 'transporte', 50000, 0, true),
('SRV-009', 'Late Check-out', 'Salida tardía (después de las 12pm)', 'otro', 30000, 0, true),
('SRV-010', 'Early Check-in', 'Entrada temprana (antes de las 2pm)', 'otro', 20000, 0, true)
ON CONFLICT (codigo) DO NOTHING;

SELECT 'Esquema factufy_hotel creado exitosamente!' as mensaje;
