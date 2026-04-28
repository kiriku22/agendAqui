/**
 * Script para actualizar facturas existentes con items JSON
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87',
});

async function actualizarFacturasItems() {
  try {
    console.log('🔄 Actualizando facturas existentes con items JSON...\n');

    // Obtener facturas que no tienen items
    const facturasSinItems = await pool.query(`
      SELECT
        fe.id,
        fe.factura_id,
        fe.hospedaje_id,
        fe.subtotal_hospedaje,
        fe.subtotal_consumos,
        fe.total,
        h.habitacion_id,
        h.precio_noche,
        h.fecha_entrada,
        COALESCE(h.fecha_salida_real, h.checked_out_at, h.fecha_salida_prevista) as fecha_salida,
        h.noches_reales
      FROM facturas_electronicas fe
      INNER JOIN hospedajes h ON fe.hospedaje_id = h.id
      WHERE fe.items_hospedaje IS NULL OR fe.items_consumos IS NULL OR fe.metodos_pago IS NULL
      ORDER BY fe.id DESC
    `);

    console.log(`Encontradas ${facturasSinItems.rows.length} facturas sin items\n`);

    for (const fe of facturasSinItems.rows) {
      console.log(`Procesando factura ID ${fe.id}...`);

      // Obtener número de habitación
      const habitacion = await pool.query(
        'SELECT numero FROM habitaciones WHERE id = $1',
        [fe.habitacion_id]
      );
      const numeroHabitacion = habitacion.rows[0]?.numero || 'N/A';

      // Usar noches reales si está disponible, sino calcular
      const noches = fe.noches_reales || (() => {
        const fechaEntrada = new Date(fe.fecha_entrada);
        const fechaSalida = new Date(fe.fecha_salida);
        return Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
      })();

      // Construir item de hospedaje
      const itemsHospedaje = [{
        descripcion: `Hospedaje Habitación ${numeroHabitacion}`,
        habitacion: numeroHabitacion,
        noches: noches,
        precio_unitario: parseFloat(fe.precio_noche || 0),
        cantidad: noches,
        total: parseFloat(fe.subtotal_hospedaje || 0),
        tarifa_iva: 0
      }];

      // Obtener consumos del hospedaje
      const consumos = await pool.query(
        'SELECT * FROM consumos_habitacion WHERE hospedaje_id = $1',
        [fe.hospedaje_id]
      );

      const itemsConsumos = consumos.rows.map(c => ({
        descripcion: c.descripcion || 'Consumo',
        cantidad: parseInt(c.cantidad || 1),
        precio_unitario: parseFloat(c.precio_unitario || 0),
        total: parseFloat(c.precio_total || 0),
        tarifa_iva: 19
      }));

      // Obtener métodos de pago de la factura
      const metodosPago = await pool.query(
        `SELECT mp.nombre, fmp.monto
         FROM factura_metodos_pago fmp
         INNER JOIN metodos_pago mp ON fmp.metodo_pago_id = mp.id
         WHERE fmp.factura_id = $1`,
        [fe.factura_id]
      );

      const metodosPagoJson = metodosPago.rows.map(mp => ({
        metodo: mp.nombre,
        monto: parseFloat(mp.monto)
      }));

      // Actualizar factura
      await pool.query(
        `UPDATE facturas_electronicas
         SET
           items_hospedaje = $1,
           items_consumos = $2,
           metodos_pago = $3
         WHERE id = $4`,
        [
          JSON.stringify(itemsHospedaje),
          JSON.stringify(itemsConsumos),
          JSON.stringify(metodosPagoJson),
          fe.id
        ]
      );

      console.log(`  ✅ Actualizada factura ID ${fe.id}`);
      console.log(`     - Items hospedaje: ${itemsHospedaje.length}`);
      console.log(`     - Items consumos: ${itemsConsumos.length}`);
      console.log(`     - Métodos de pago: ${metodosPagoJson.length}\n`);
    }

    console.log('✅ Actualización completada!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

actualizarFacturasItems();
