-- Datos de prueba para proyecto universitario hotel_uni
SET client_encoding = 'UTF8';

-- Insertar habitaciones de prueba
-- Tipos validos: simple, doble, suite, familiar, presidencial
INSERT INTO habitaciones (numero, piso, tipo, precio_noche, estado, descripcion) VALUES
('101', '1', 'simple', 80000, 'disponible', 'Habitacion simple primer piso'),
('102', '1', 'simple', 80000, 'disponible', 'Habitacion simple primer piso'),
('103', '1', 'doble', 120000, 'disponible', 'Habitacion doble primer piso'),
('104', '1', 'doble', 120000, 'disponible', 'Habitacion doble primer piso'),
('201', '2', 'doble', 130000, 'disponible', 'Habitacion doble segundo piso'),
('202', '2', 'doble', 130000, 'disponible', 'Habitacion doble segundo piso'),
('203', '2', 'familiar', 150000, 'disponible', 'Habitacion familiar segundo piso'),
('204', '2', 'familiar', 150000, 'disponible', 'Habitacion familiar segundo piso'),
('301', '3', 'suite', 250000, 'disponible', 'Suite tercer piso con vista'),
('302', '3', 'presidencial', 350000, 'disponible', 'Suite presidencial tercer piso')
ON CONFLICT DO NOTHING;

-- Insertar clientes de prueba (tipo_documento_dian es FK a tipos_documento_dian: 1=CC, 2=CE, 3=NIT)
INSERT INTO clientes (nombre, tipo_documento, tipo_documento_dian, numero_documento, email, telefono, direccion) VALUES
('Juan Perez', 'CC', 1, '1234567890', 'juan@email.com', '3001234567', 'Calle 10 #20-30'),
('Maria Garcia', 'CC', 1, '9876543210', 'maria@email.com', '3109876543', 'Carrera 5 #15-45'),
('Carlos Lopez', 'CE', 2, 'E123456', 'carlos@email.com', '3201112233', 'Avenida 7 #8-90')
ON CONFLICT DO NOTHING;

-- Verificar datos insertados
SELECT 'Habitaciones: ' || COUNT(*) FROM habitaciones;
SELECT 'Clientes: ' || COUNT(*) FROM clientes;
SELECT 'Metodos de pago: ' || COUNT(*) FROM metodos_pago;
SELECT 'Servicios hotel: ' || COUNT(*) FROM servicios_hotel;
SELECT 'Usuarios: ' || COUNT(*) FROM usuarios;
