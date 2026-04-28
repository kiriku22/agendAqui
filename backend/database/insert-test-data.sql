-- ============================================================================
-- DATOS DE PRUEBA PARA FACTUFY HOTEL
-- ============================================================================

BEGIN;

-- Insertar usuario administrador (password: admin123)
-- Password hash generado con bcrypt rounds=10
INSERT INTO usuarios (nombre, apellido, usuario, password, rol, activo) VALUES
('Administrador', 'Hotel', 'admin', '$2b$10$XqKwjW.jFZJZz8KXr6yGAeD4jyF0P0vM8Y8jE9tPzXy6B5qW0jq8W', 'admin', true),
('Recepcionista', 'Principal', 'recepcion', '$2b$10$XqKwjW.jFZJZz8KXr6yGAeD4jyF0P0vM8Y8jE9tPzXy6B5qW0jq8W', 'recepcionista', true),
('Personal', 'Limpieza', 'limpieza', '$2b$10$XqKwjW.jFZJZz8KXr6yGAeD4jyF0P0vM8Y8jE9tPzXy6B5qW0jq8W', 'limpieza', true)
ON CONFLICT (usuario) DO NOTHING;

-- Insertar métodos de pago
INSERT INTO metodos_pago (nombre, tipo, requiere_referencia, icono, orden) VALUES
('Efectivo', 'efectivo', false, 'FaMoneyBillWave', 1),
('Tarjeta Débito', 'tarjeta', true, 'FaCreditCard', 2),
('Tarjeta Crédito', 'tarjeta', true, 'FaCreditCard', 3),
('Transferencia', 'transferencia', true, 'FaExchangeAlt', 4),
('Nequi', 'transferencia', true, 'FaMobileAlt', 5),
('Daviplata', 'transferencia', true, 'FaMobileAlt', 6)
ON CONFLICT DO NOTHING;

-- Insertar habitaciones de ejemplo
INSERT INTO habitaciones (numero, piso, tipo, capacidad, precio_noche, descripcion, estado, activa, comodidades) VALUES
('101', 1, 'simple', 1, 80000, 'Habitación simple en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado"]'::jsonb),
('102', 1, 'doble', 2, 120000, 'Habitación doble en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado", "Minibar"]'::jsonb),
('103', 1, 'doble', 2, 120000, 'Habitación doble en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado"]'::jsonb),
('201', 2, 'suite', 2, 200000, 'Suite en segundo piso con vista', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado", "Minibar", "Jacuzzi"]'::jsonb),
('202', 2, 'familiar', 4, 180000, 'Habitación familiar en segundo piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado", "Cocina"]'::jsonb),
('301', 3, 'presidencial', 4, 350000, 'Suite presidencial con balcón', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Baño privado", "Minibar", "Jacuzzi", "Sala", "Balcón"]'::jsonb)
ON CONFLICT (numero) DO NOTHING;

-- Insertar servicios del hotel
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
('SRV-010', 'Early Check-in', 'Entrada temprana (antes de las 2pm)', 'otro', 20000, 0, true),
('SRV-011', 'Minibar - Agua', 'Botella de agua', 'bar', 3000, 0, true),
('SRV-012', 'Minibar - Gaseosa', 'Gaseosa 350ml', 'bar', 4000, 0, true),
('SRV-013', 'Minibar - Snacks', 'Paquete de snacks', 'bar', 5000, 0, true),
('SRV-014', 'WiFi Premium', 'Internet de alta velocidad 24h', 'otro', 10000, 0, true),
('SRV-015', 'Parking', 'Estacionamiento cubierto por día', 'otro', 15000, 0, true)
ON CONFLICT (codigo) DO NOTHING;

COMMIT;

SELECT 'Datos de prueba insertados exitosamente!' as mensaje;
