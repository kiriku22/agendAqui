require('dotenv').config();
const pool = require('./src/config/database');

async function fixAllData() {
  try {
    console.log('\n🔧 Limpiando todas las tablas...');

    // Delete data with encoding issues
    await pool.query('DELETE FROM habitaciones');
    await pool.query('DELETE FROM servicios_hotel');

    console.log('✅ Tablas limpiadas');

    // Insert habitaciones (sin acentos)
    console.log('\n🏠 Insertando habitaciones...');
    const habitacionesQuery = `
      INSERT INTO habitaciones (numero, piso, tipo, capacidad, precio_noche, descripcion, estado, activa, comodidades) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9),
      ($10, $11, $12, $13, $14, $15, $16, $17, $18),
      ($19, $20, $21, $22, $23, $24, $25, $26, $27),
      ($28, $29, $30, $31, $32, $33, $34, $35, $36),
      ($37, $38, $39, $40, $41, $42, $43, $44, $45),
      ($46, $47, $48, $49, $50, $51, $52, $53, $54)
    `;

    const habitacionesValues = [
      '101', 1, 'simple', 1, 80000, 'Habitacion simple en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado"]',
      '102', 1, 'doble', 2, 120000, 'Habitacion doble en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado", "Minibar"]',
      '103', 1, 'doble', 2, 120000, 'Habitacion doble en primer piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado"]',
      '201', 2, 'suite', 2, 200000, 'Suite en segundo piso con vista', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado", "Minibar", "Jacuzzi"]',
      '202', 2, 'familiar', 4, 180000, 'Habitacion familiar en segundo piso', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado", "Cocina"]',
      '301', 3, 'presidencial', 4, 350000, 'Suite presidencial con balcon', 'disponible', true, '["WiFi", "TV", "Aire acondicionado", "Bano privado", "Minibar", "Jacuzzi", "Sala", "Balcon"]'
    ];

    await pool.query(habitacionesQuery, habitacionesValues);
    console.log('✅ Habitaciones insertadas');

    // Insert servicios_hotel (sin acentos)
    console.log('\n🛎️  Insertando servicios...');
    const serviciosQuery = `
      INSERT INTO servicios_hotel (codigo, nombre, descripcion, categoria, precio, iva, activo) VALUES
      ($1, $2, $3, $4, $5, $6, $7),
      ($8, $9, $10, $11, $12, $13, $14),
      ($15, $16, $17, $18, $19, $20, $21),
      ($22, $23, $24, $25, $26, $27, $28),
      ($29, $30, $31, $32, $33, $34, $35),
      ($36, $37, $38, $39, $40, $41, $42),
      ($43, $44, $45, $46, $47, $48, $49),
      ($50, $51, $52, $53, $54, $55, $56),
      ($57, $58, $59, $60, $61, $62, $63),
      ($64, $65, $66, $67, $68, $69, $70),
      ($71, $72, $73, $74, $75, $76, $77),
      ($78, $79, $80, $81, $82, $83, $84),
      ($85, $86, $87, $88, $89, $90, $91),
      ($92, $93, $94, $95, $96, $97, $98),
      ($99, $100, $101, $102, $103, $104, $105)
    `;

    const serviciosValues = [
      'SRV-001', 'Lavanderia Express', 'Servicio de lavanderia express (24 horas)', 'lavanderia', 15000, 0, true,
      'SRV-002', 'Lavanderia Normal', 'Servicio de lavanderia normal (48 horas)', 'lavanderia', 10000, 0, true,
      'SRV-003', 'Planchado', 'Servicio de planchado por prenda', 'lavanderia', 5000, 0, true,
      'SRV-004', 'Room Service - Desayuno', 'Desayuno servido en habitacion', 'room_service', 25000, 8, true,
      'SRV-005', 'Room Service - Almuerzo', 'Almuerzo servido en habitacion', 'room_service', 35000, 8, true,
      'SRV-006', 'Room Service - Cena', 'Cena servida en habitacion', 'room_service', 35000, 8, true,
      'SRV-007', 'Masaje Relajante 60min', 'Masaje relajante de 60 minutos', 'spa', 80000, 0, true,
      'SRV-008', 'Transporte Aeropuerto', 'Transporte desde/hacia aeropuerto', 'transporte', 50000, 0, true,
      'SRV-009', 'Late Check-out', 'Salida tardia (despues de las 12pm)', 'otro', 30000, 0, true,
      'SRV-010', 'Early Check-in', 'Entrada temprana (antes de las 2pm)', 'otro', 20000, 0, true,
      'SRV-011', 'Minibar - Agua', 'Botella de agua', 'bar', 3000, 0, true,
      'SRV-012', 'Minibar - Gaseosa', 'Gaseosa 350ml', 'bar', 4000, 0, true,
      'SRV-013', 'Minibar - Snacks', 'Paquete de snacks', 'bar', 5000, 0, true,
      'SRV-014', 'WiFi Premium', 'Internet de alta velocidad 24h', 'otro', 10000, 0, true,
      'SRV-015', 'Parking', 'Estacionamiento cubierto por dia', 'otro', 15000, 0, true
    ];

    await pool.query(serviciosQuery, serviciosValues);
    console.log('✅ Servicios insertados');

    // Verify
    const habitaciones = await pool.query('SELECT COUNT(*) FROM habitaciones');
    const servicios = await pool.query('SELECT COUNT(*) FROM servicios_hotel');

    console.log(`\n✅ Datos insertados correctamente:`);
    console.log(`   - Habitaciones: ${habitaciones.rows[0].count}`);
    console.log(`   - Servicios: ${servicios.rows[0].count}`);
    console.log(`\n💡 Nota: Se removieron acentos y caracteres especiales para evitar errores de encoding`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAllData();
