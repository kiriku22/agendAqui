// =====================================================
// RESOLVER: POS - Sistema de Ventas Punto de Venta
// Gestión completa de ventas, productos y reportes
// =====================================================

const { obtenerSiguienteNumero } = require('./consecutivos');
const { agregarFacturaACola, construirDatosFactura } = require('../services/cola-impresion');
// Factubox removido - proyecto universitario
// const { transmitirFacturaPOSAutomaticamente } = require('./factubox');

const posResolvers = {
  // =====================================================
  // QUERIES
  // =====================================================
  Query: {
    // Obtener todas las ventas POS con filtros
    ventasPOS: async (_, { turno_caja_id, fecha_desde, fecha_hasta, tipo_cliente, estado_pago }, { pool }) => {
      let query = 'SELECT * FROM ventas_pos WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (turno_caja_id) {
        query += ` AND turno_caja_id = $${paramCount}`;
        params.push(turno_caja_id);
        paramCount++;
      }

      if (fecha_desde) {
        query += ` AND DATE(created_at) >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        query += ` AND DATE(created_at) <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      if (tipo_cliente) {
        query += ` AND tipo_cliente = $${paramCount}`;
        params.push(tipo_cliente);
        paramCount++;
      }

      if (estado_pago) {
        query += ` AND estado_pago = $${paramCount}`;
        params.push(estado_pago);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Obtener venta por ID
    ventaPOS: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM ventas_pos WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Estadísticas de ventas POS
    estadisticasVentasPOS: async (_, { fecha_desde, fecha_hasta, turno_caja_id }, { pool }) => {
      let whereClause = 'WHERE estado_pago != $1';
      const params = ['anulado'];
      let paramCount = 2;

      if (fecha_desde) {
        whereClause += ` AND DATE(created_at) >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        whereClause += ` AND DATE(created_at) <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      if (turno_caja_id) {
        whereClause += ` AND turno_caja_id = $${paramCount}`;
        params.push(turno_caja_id);
        paramCount++;
      }

      const result = await pool.query(`
        SELECT
          COUNT(*) as num_ventas,
          COALESCE(SUM(subtotal), 0) as total_subtotal,
          COALESCE(SUM(descuento_monto), 0) as total_descuentos,
          COALESCE(SUM(iva), 0) as total_iva,
          COALESCE(SUM(propina), 0) as total_propinas,
          COALESCE(SUM(total), 0) as total_ventas,
          COALESCE(AVG(total), 0) as ticket_promedio
        FROM ventas_pos
        ${whereClause}
      `, params);

      const stats = result.rows[0];

      return {
        num_ventas: parseInt(stats.num_ventas),
        total_subtotal: parseFloat(stats.total_subtotal),
        total_descuentos: parseFloat(stats.total_descuentos),
        total_iva: parseFloat(stats.total_iva),
        total_propinas: parseFloat(stats.total_propinas),
        total_ventas: parseFloat(stats.total_ventas),
        ticket_promedio: parseFloat(stats.ticket_promedio)
      };
    },

    // Top productos vendidos con cálculo de utilidad
    topProductosVendidos: async (_, { fecha_desde, fecha_hasta, limite, ordenar_por }, { pool }) => {
      let whereClause = 'WHERE vp.estado_pago != $1';
      const params = ['anulado'];
      let paramCount = 2;

      if (fecha_desde) {
        whereClause += ` AND DATE(vp.created_at) >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        whereClause += ` AND DATE(vp.created_at) <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      // Determinar orden
      let orderByClause = '';
      if (ordenar_por === 'cantidad') {
        orderByClause = 'ORDER BY cantidad_vendida DESC';
      } else if (ordenar_por === 'ingresos') {
        orderByClause = 'ORDER BY ingresos_totales DESC';
      } else if (ordenar_por === 'utilidad') {
        orderByClause = 'ORDER BY utilidad_total DESC';
      } else {
        orderByClause = 'ORDER BY cantidad_vendida DESC'; // Por defecto
      }

      const limitClause = limite ? `LIMIT ${parseInt(limite)}` : 'LIMIT 20';

      const result = await pool.query(`
        SELECT
          dvp.item_inventario_id as item_id,
          ii.nombre as item_nombre,
          ii.categoria_id,
          ci.nombre as categoria_nombre,
          SUM(dvp.cantidad) as cantidad_vendida,
          COUNT(DISTINCT vp.id) as num_ventas,
          SUM(dvp.precio_total) as ingresos_totales,
          AVG(dvp.precio_unitario) as precio_promedio,
          ii.precio_compra,
          SUM(dvp.cantidad * COALESCE(ii.precio_compra, 0)) as costo_total,
          SUM(dvp.precio_total) - SUM(dvp.cantidad * COALESCE(ii.precio_compra, 0)) as utilidad_total,
          CASE
            WHEN SUM(dvp.precio_total) > 0
            THEN ((SUM(dvp.precio_total) - SUM(dvp.cantidad * COALESCE(ii.precio_compra, 0))) / SUM(dvp.precio_total) * 100)
            ELSE 0
          END as margen_utilidad_porcentaje
        FROM detalle_venta_pos dvp
        INNER JOIN ventas_pos vp ON dvp.venta_pos_id = vp.id
        INNER JOIN items_inventario ii ON dvp.item_inventario_id = ii.id
        LEFT JOIN categorias_inventario ci ON ii.categoria_id = ci.id
        ${whereClause}
        GROUP BY dvp.item_inventario_id, ii.nombre, ii.categoria_id, ci.nombre, ii.precio_compra
        ${orderByClause}
        ${limitClause}
      `, params);

      return result.rows.map(row => ({
        item_id: row.item_id,
        item_nombre: row.item_nombre,
        categoria_id: row.categoria_id,
        categoria_nombre: row.categoria_nombre,
        cantidad_vendida: parseFloat(row.cantidad_vendida),
        num_ventas: parseInt(row.num_ventas),
        ingresos_totales: parseFloat(row.ingresos_totales),
        precio_promedio: parseFloat(row.precio_promedio),
        precio_compra: row.precio_compra ? parseFloat(row.precio_compra) : null,
        costo_total: parseFloat(row.costo_total),
        utilidad_total: parseFloat(row.utilidad_total),
        margen_utilidad_porcentaje: parseFloat(row.margen_utilidad_porcentaje)
      }));
    },

    // Ventas por hora (para análisis de picos de venta)
    ventasPorHora: async (_, { fecha }, { pool }) => {
      const result = await pool.query(`
        SELECT
          EXTRACT(HOUR FROM created_at) as hora,
          COUNT(*) as num_ventas,
          COALESCE(SUM(total), 0) as total_ventas
        FROM ventas_pos
        WHERE DATE(created_at) = $1 AND estado_pago != 'anulado'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hora
      `, [fecha]);

      return result.rows.map(row => ({
        hora: parseInt(row.hora),
        num_ventas: parseInt(row.num_ventas),
        total_ventas: parseFloat(row.total_ventas)
      }));
    }
  },

  // =====================================================
  // MUTATIONS
  // =====================================================
  Mutation: {
    // Crear venta POS (MUTATION MÁS COMPLEJA)
    crearVentaPOS: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const {
        turno_caja_id,
        tipo_cliente,
        cliente_id,
        huesped_id,
        hospedaje_id,
        items,
        descuento_id,
        descuento_porcentaje_manual,
        descuento_monto_manual,
        propina,
        notas,
        metodos_pago,
        requiere_autorizacion_descuento,
        autorizado_por
      } = input;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. VALIDAR TURNO ACTIVO
        const turnoResult = await client.query(
          'SELECT * FROM turnos_caja WHERE id = $1 AND estado = $2',
          [turno_caja_id, 'abierto']
        );

        if (turnoResult.rows.length === 0) {
          throw new Error('No existe un turno activo o el turno está cerrado');
        }

        // 2. VALIDAR CLIENTE/HUÉSPED SEGÚN TIPO
        if (tipo_cliente === 'cliente_registrado' && !cliente_id) {
          throw new Error('Se requiere cliente_id para ventas a cliente registrado');
        }

        if (tipo_cliente === 'huesped') {
          if (!huesped_id || !hospedaje_id) {
            throw new Error('Se requiere huesped_id y hospedaje_id para cargos a cuenta de huésped');
          }

          // Verificar que el hospedaje esté activo
          const hospedajeResult = await client.query(
            'SELECT * FROM hospedajes WHERE id = $1 AND estado = $2',
            [hospedaje_id, 'activo']
          );

          if (hospedajeResult.rows.length === 0) {
            throw new Error('El hospedaje no existe o no está activo');
          }
        }

        // 3. VALIDAR STOCK DISPONIBLE PARA PRODUCTOS
        for (const item of items) {
          if (item.item_inventario_id) {
            const stockResult = await client.query(
              'SELECT stock_actual, tipo FROM items_inventario WHERE id = $1',
              [item.item_inventario_id]
            );

            if (stockResult.rows.length === 0) {
              throw new Error(`El item ${item.item_inventario_id} no existe`);
            }

            const itemData = stockResult.rows[0];

            // Solo validar stock si es producto (no servicio)
            if (itemData.tipo === 'producto' && itemData.stock_actual < item.cantidad) {
              const itemNombreResult = await client.query(
                'SELECT nombre FROM items_inventario WHERE id = $1',
                [item.item_inventario_id]
              );
              const itemNombre = itemNombreResult.rows[0].nombre;
              throw new Error(`Stock insuficiente para ${itemNombre}. Disponible: ${itemData.stock_actual}, Solicitado: ${item.cantidad}`);
            }
          }
        }

        // 4. VALIDAR QUE CADA ITEM TENGA AL MENOS UN ID
        for (const item of items) {
          if (!item.item_inventario_id && !item.servicio_hotel_id) {
            throw new Error('Cada item debe tener item_inventario_id o servicio_hotel_id');
          }
        }

        // 5. CALCULAR SUBTOTAL
        let subtotal = 0;
        for (const item of items) {
          subtotal += item.cantidad * item.precio_unitario;
        }

        // 6. PROCESAR DESCUENTOS
        let descuento_porcentaje = null;
        let descuento_monto = 0;
        let descuento_id_final = null;

        if (descuento_id) {
          // Descuento predefinido
          const descuentoResult = await client.query(
            'SELECT * FROM descuentos WHERE id = $1 AND activo = true',
            [descuento_id]
          );

          if (descuentoResult.rows.length === 0) {
            throw new Error('El descuento seleccionado no existe o está inactivo');
          }

          const descuento = descuentoResult.rows[0];
          descuento_id_final = descuento.id;

          if (descuento.tipo === 'porcentaje') {
            descuento_porcentaje = descuento.valor;
            descuento_monto = subtotal * (descuento.valor / 100);
          } else if (descuento.tipo === 'monto_fijo') {
            descuento_monto = descuento.valor;
          }
        } else if (descuento_porcentaje_manual !== undefined && descuento_porcentaje_manual !== null) {
          // Descuento manual por porcentaje
          descuento_porcentaje = descuento_porcentaje_manual;
          descuento_monto = subtotal * (descuento_porcentaje_manual / 100);
        } else if (descuento_monto_manual !== undefined && descuento_monto_manual !== null) {
          // Descuento manual por monto
          descuento_monto = descuento_monto_manual;
        }

        // Validar autorización para descuentos > 10%
        if (descuento_porcentaje && descuento_porcentaje > 10) {
          if (!requiere_autorizacion_descuento || !autorizado_por) {
            throw new Error('Descuentos mayores al 10% requieren autorización de gerente o administrador');
          }

          // Verificar que el autorizador sea gerente o admin
          const autorizadorResult = await client.query(
            'SELECT rol FROM usuarios WHERE id = $1',
            [autorizado_por]
          );

          if (autorizadorResult.rows.length === 0) {
            throw new Error('Usuario autorizador no encontrado');
          }

          if (!['admin', 'gerente'].includes(autorizadorResult.rows[0].rol)) {
            throw new Error('Solo gerentes o administradores pueden autorizar descuentos mayores al 10%');
          }
        }

        // 6. CALCULAR IVA (19% sobre subtotal - descuento)
        const base_iva = subtotal - descuento_monto;
        const iva = base_iva * 0.19;

        // 7. CALCULAR TOTAL
        const total = base_iva + iva + (propina || 0);

        // 8. VALIDAR PAGOS
        let total_pagos = 0;
        for (const pago of metodos_pago) {
          total_pagos += pago.monto;
        }

        if (Math.abs(total_pagos - total) > 0.01) {
          throw new Error(`El total de pagos ($${total_pagos}) no coincide con el total de la venta ($${total})`);
        }

        // 9. CREAR VENTA POS
        const ventaResult = await client.query(`
          INSERT INTO ventas_pos (
            turno_caja_id, tipo_cliente, cliente_id, huesped_id, hospedaje_id,
            subtotal, descuento_id, descuento_porcentaje, descuento_monto,
            iva, propina, total, estado_pago, notas, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
          RETURNING *
        `, [
          turno_caja_id,
          tipo_cliente,
          cliente_id || null,
          huesped_id || null,
          hospedaje_id || null,
          subtotal,
          descuento_id_final,
          descuento_porcentaje,
          descuento_monto,
          iva,
          propina || 0,
          total,
          tipo_cliente === 'huesped' ? 'cuenta_huesped' : 'pagado',
          notas || null,
          user.id
        ]);

        const venta = ventaResult.rows[0];

        // 10. CREAR DETALLES DE VENTA
        // Calcular IVA por item (distribuir proporcionalmente)
        const subtotal_items_total = subtotal; // Suma de todos los items antes de descuento
        const iva_a_distribuir = iva; // IVA total ya calculado arriba (línea 368-369)
        const iva_porcentaje = 19; // Porcentaje IVA estándar Colombia

        for (const item of items) {
          // Obtener información del item para los campos obligatorios
          let itemInfo = { codigo: null, nombre: 'Item', tipo: 'producto' };
          if (item.item_inventario_id) {
            const itemResult = await client.query(
              'SELECT codigo, nombre, tipo FROM items_inventario WHERE id = $1',
              [item.item_inventario_id]
            );
            if (itemResult.rows.length > 0) {
              itemInfo = itemResult.rows[0];
            }
          }

          // Calcular subtotal del item
          const itemSubtotal = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);

          // Calcular IVA proporcional del item
          const proporcion = itemSubtotal / subtotal_items_total;
          const itemIVAMonto = iva_a_distribuir * proporcion;

          // Total del item incluye IVA
          const itemTotal = itemSubtotal + itemIVAMonto;

          await client.query(`
            INSERT INTO detalle_venta_pos (
              venta_pos_id, item_inventario_id, codigo_item, nombre_item, tipo_item,
              cantidad, precio_unitario, iva_porcentaje, iva_monto, subtotal, total, notas
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            venta.id,
            item.item_inventario_id || null,
            itemInfo.codigo,
            itemInfo.nombre,
            itemInfo.tipo,
            item.cantidad,
            item.precio_unitario,
            iva_porcentaje,
            parseFloat(itemIVAMonto.toFixed(2)),
            parseFloat(itemSubtotal.toFixed(2)),
            parseFloat(itemTotal.toFixed(2)),
            item.notas || null
          ]);
        }

        // 11. REGISTRAR MÉTODOS DE PAGO
        for (const pago of metodos_pago) {
          await client.query(`
            INSERT INTO venta_pos_pagos (
              venta_pos_id, metodo_pago_id, monto, referencia
            ) VALUES ($1, $2, $3, $4)
          `, [venta.id, pago.metodo_pago_id, pago.monto, pago.referencia || null]);
        }

        // 12. SI ES CARGO A HUÉSPED, CREAR CONSUMO DE HABITACIÓN
        if (tipo_cliente === 'huesped' && hospedaje_id) {
          // Obtener habitacion_id del hospedaje
          const hospedajeResult = await client.query(
            'SELECT habitacion_id FROM hospedajes WHERE id = $1',
            [hospedaje_id]
          );
          const habitacion_id = hospedajeResult.rows[0]?.habitacion_id;

          for (const item of items) {
            // Obtener nombre del item para la descripción
            let descripcion = 'Cargo POS';
            if (item.item_inventario_id) {
              const itemResult = await client.query(
                'SELECT nombre FROM items_inventario WHERE id = $1',
                [item.item_inventario_id]
              );
              if (itemResult.rows.length > 0) {
                descripcion = itemResult.rows[0].nombre;
              }
            }

            const precio_total = item.cantidad * item.precio_unitario;

            await client.query(`
              INSERT INTO consumos_habitacion (
                hospedaje_id, habitacion_id, producto_id,
                descripcion, cantidad, precio_unitario, precio_total,
                notas, facturado, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              hospedaje_id,
              habitacion_id,
              item.item_inventario_id || null,
              descripcion,
              item.cantidad,
              item.precio_unitario,
              precio_total,
              `Cargo POS - ${venta.codigo}`,
              false,
              user.id
            ]);
          }
        }

        // 13. GENERAR FACTURA (si no es cargo a huésped)
        let facturaIdGenerada = null;
        if (tipo_cliente !== 'huesped') {
          // Obtener número de factura de la resolución DIAN activa
          const { prefijo: prefijo_resolucion, numero: numero_solo } = await obtenerSiguienteNumero(client, 'factura');

          const facturaResult = await client.query(`
            INSERT INTO facturas (
              numero_factura, prefijo, cliente_id, venta_pos_id, tipo_factura,
              subtotal, iva, descuento, total,
              estado, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `, [
            numero_solo.toString(),
            prefijo_resolucion || null,
            cliente_id || null,
            venta.id,
            'venta_pos',  // Valor válido según CHECK constraint: ('checkout', 'venta_pos', 'evento', 'otro')
            subtotal,
            iva,
            descuento_monto,
            total,
            'pagada',
            user.id
          ]);

          facturaIdGenerada = facturaResult.rows[0].id;

          // Registrar métodos de pago en factura
          for (const pago of metodos_pago) {
            await client.query(`
              INSERT INTO factura_metodos_pago (
                factura_id, metodo_pago_id, monto
              ) VALUES ($1, $2, $3)
            `, [facturaResult.rows[0].id, pago.metodo_pago_id, pago.monto]);
          }

          // IMPORTANTE: Actualizar ventas_pos con el factura_id generado
          // Esto es necesario para que FactuBox pueda obtener los items de la factura
          await client.query(
            'UPDATE ventas_pos SET factura_id = $1 WHERE id = $2',
            [facturaResult.rows[0].id, venta.id]
          );

          // =====================================================
          // AGREGAR A COLA DE IMPRESIÓN
          // =====================================================
          try {
            // Obtener datos del cliente (si existe)
            let clienteInfo = null;
            if (cliente_id) {
              const clienteDatos = await client.query(
                'SELECT nombre, apellido, tipo_documento, numero_documento FROM clientes WHERE id = $1',
                [cliente_id]
              );
              if (clienteDatos.rows[0]) {
                clienteInfo = clienteDatos.rows[0];
              }
            }

            // Obtener nombres de métodos de pago
            const metodosPagoDatos = await client.query(
              `SELECT mp.nombre, fmp.monto, fmp.referencia
               FROM factura_metodos_pago fmp
               JOIN metodos_pago mp ON fmp.metodo_pago_id = mp.id
               WHERE fmp.factura_id = $1`,
              [facturaResult.rows[0].id]
            );

            // Construir detalles de la venta
            const detallesImpresion = items.map(item => ({
              descripcion: item.nombre || 'Item',
              cantidad: parseInt(item.cantidad) || 1,
              precio_unitario: parseFloat(item.precio_unitario) || 0,
              subtotal: (parseInt(item.cantidad) || 1) * (parseFloat(item.precio_unitario) || 0)
            }));

            // Construir datos para impresión
            const datosImpresion = construirDatosFactura(
              {
                id: facturaResult.rows[0].id,
                numero_factura: numero_solo.toString(),
                prefijo: prefijo_resolucion || null,
                fecha: new Date(),
                subtotal: subtotal,
                descuento: descuento_monto,
                iva: iva,
                propina: propina,
                total: total
              },
              detallesImpresion,
              metodosPagoDatos.rows,
              null, // Sin factura electrónica por ahora
              {
                cliente: clienteInfo ? {
                  nombre: `${clienteInfo.nombre || ''} ${clienteInfo.apellido || ''}`.trim(),
                  tipo_documento: clienteInfo.tipo_documento || 'CC',
                  numero_documento: clienteInfo.numero_documento
                } : null
              }
            );

            // Agregar a cola de impresión (prioridad 1 = alta)
            await agregarFacturaACola(pool, facturaResult.rows[0].id, datosImpresion, 1);
            console.log('[POS] Factura agregada a cola de impresión');

          } catch (errorCola) {
            console.error('[POS] Error al agregar a cola de impresión:', errorCola.message);
            // No fallar la venta si falla la cola de impresión
          }
        }

        await client.query('COMMIT');

        // Auto-transmisión electrónica deshabilitada - proyecto universitario

        return venta;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // Anular venta POS (reversar stock y movimientos)
    anularVentaPOS: async (_, { venta_pos_id, motivo }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin y gerente pueden anular ventas
      if (!['admin', 'gerente'].includes(user.rol)) {
        throw new Error('Solo administradores y gerentes pueden anular ventas');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Obtener la venta
        const ventaResult = await client.query(
          'SELECT * FROM ventas_pos WHERE id = $1',
          [venta_pos_id]
        );

        if (ventaResult.rows.length === 0) {
          throw new Error('Venta no encontrada');
        }

        const venta = ventaResult.rows[0];

        if (venta.estado_pago === 'anulado') {
          throw new Error('La venta ya está anulada');
        }

        // Actualizar estado de la venta
        await client.query(`
          UPDATE ventas_pos
          SET estado_pago = 'anulado',
              notas = CONCAT(COALESCE(notas, ''), '\n[ANULADA] ', $1, ' - Por: ', $2),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [motivo, user.username, venta_pos_id]);

        // Reversar stock (el trigger ya lo maneja, pero podemos registrar movimiento manual)
        // Los movimientos de stock se revierten automáticamente por el trigger

        // Si había factura, anularla también
        await client.query(`
          UPDATE facturas
          SET estado = 'anulada',
              updated_at = CURRENT_TIMESTAMP
          WHERE venta_pos_id = $1
        `, [venta_pos_id]);

        // Si era cargo a huésped, marcar consumos como anulados
        if (venta.hospedaje_id) {
          await client.query(`
            UPDATE consumos_habitacion
            SET notas = CONCAT(COALESCE(notas, ''), '\n[ANULADO] Venta POS anulada'),
                updated_at = CURRENT_TIMESTAMP
            WHERE hospedaje_id = $1
              AND notas LIKE $2
          `, [venta.hospedaje_id, `%${venta.codigo}%`]);
        }

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  },

  // =====================================================
  // FIELD RESOLVERS (relaciones)
  // =====================================================
  VentaPOS: {
    turno_caja: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [parent.turno_caja_id]
      );
      return result.rows[0];
    },

    cliente: async (parent, _, { pool }) => {
      if (!parent.cliente_id) return null;
      const result = await pool.query(
        'SELECT * FROM clientes WHERE id = $1',
        [parent.cliente_id]
      );
      return result.rows[0];
    },

    huesped: async (parent, _, { pool }) => {
      if (!parent.huesped_id) return null;
      const result = await pool.query(
        'SELECT * FROM huespedes WHERE id = $1',
        [parent.huesped_id]
      );
      return result.rows[0];
    },

    hospedaje: async (parent, _, { pool }) => {
      if (!parent.hospedaje_id) return null;
      const result = await pool.query(
        'SELECT * FROM hospedajes WHERE id = $1',
        [parent.hospedaje_id]
      );
      return result.rows[0];
    },

    descuento: async (parent, _, { pool }) => {
      if (!parent.descuento_id) return null;
      const result = await pool.query(
        'SELECT * FROM descuentos WHERE id = $1',
        [parent.descuento_id]
      );
      return result.rows[0];
    },

    autorizado_por: async (parent, _, { pool }) => {
      if (!parent.autorizado_por) return null;
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.autorizado_por]
      );
      return result.rows[0];
    },

    created_by: async (parent, _, { pool }) => {
      if (!parent.created_by) return null;
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.created_by]
      );
      return result.rows[0];
    },

    detalles: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM detalle_venta_pos WHERE venta_pos_id = $1 ORDER BY id',
        [parent.id]
      );
      return result.rows;
    },

    pagos: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM venta_pos_pagos WHERE venta_pos_id = $1 ORDER BY id',
        [parent.id]
      );
      return result.rows;
    }
  },

  DetalleVentaPOS: {
    venta_pos: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM ventas_pos WHERE id = $1',
        [parent.venta_pos_id]
      );
      return result.rows[0];
    },

    item_inventario: async (parent, _, { pool }) => {
      if (!parent.item_inventario_id) return null;
      const result = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [parent.item_inventario_id]
      );
      return result.rows[0];
    },

    servicio_hotel: async (parent, _, { pool }) => {
      if (!parent.servicio_hotel_id) return null;
      const result = await pool.query(
        'SELECT * FROM servicios_hotel WHERE id = $1',
        [parent.servicio_hotel_id]
      );
      return result.rows[0];
    },

    // Campo calculado: precio_total = total de la tabla (o cantidad * precio_unitario)
    precio_total: (parent) => {
      // La tabla tiene 'total' que es calculado por trigger, usarlo si existe
      if (parent.total !== null && parent.total !== undefined) {
        return parseFloat(parent.total);
      }
      // Fallback: calcular manualmente
      return parseFloat(parent.cantidad) * parseFloat(parent.precio_unitario);
    }
  },

  VentaPOSPago: {
    venta_pos: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM ventas_pos WHERE id = $1',
        [parent.venta_pos_id]
      );
      return result.rows[0];
    },

    metodo_pago: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM metodos_pago WHERE id = $1',
        [parent.metodo_pago_id]
      );
      return result.rows[0];
    }
  },

  ProductoMasVendido: {
    item: async (parent, _, { pool }) => {
      if (!parent.item_id) return null;
      const result = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [parent.item_id]
      );
      return result.rows[0];
    },

    categoria: async (parent, _, { pool }) => {
      if (!parent.categoria_id) return null;
      const result = await pool.query(
        'SELECT * FROM categorias_inventario WHERE id = $1',
        [parent.categoria_id]
      );
      return result.rows[0];
    }
  }
};

module.exports = posResolvers;
