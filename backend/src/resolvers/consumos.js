// Resolvers para Consumos de Habitación
const { GraphQLError } = require('graphql');

const consumosResolvers = {
  Query: {
    // Obtener todos los consumos de un hospedaje
    consumosPorHospedaje: async (_, { hospedaje_id }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT c.*,
                  s.nombre as servicio_nombre,
                  i.nombre as item_nombre,
                  i.tipo as item_tipo,
                  u.usuario as usuario_registro
           FROM consumos_habitacion c
           LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
           LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
           LEFT JOIN usuarios u ON c.created_by = u.id
           WHERE c.hospedaje_id = $1
           ORDER BY c.fecha_consumo DESC`,
          [hospedaje_id]
        );

        return result.rows;
      } catch (error) {
        console.error('Error al obtener consumos:', error);
        throw new GraphQLError('Error al obtener consumos del hospedaje', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Obtener consumo por ID
    consumo: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT c.*,
                  s.nombre as servicio_nombre,
                  i.nombre as item_nombre,
                  i.tipo as item_tipo,
                  u.usuario as usuario_registro
           FROM consumos_habitacion c
           LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
           LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
           LEFT JOIN usuarios u ON c.created_by = u.id
           WHERE c.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new GraphQLError('Consumo no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener consumo:', error);
        throw error;
      }
    },

    // Obtener consumos no facturados
    consumosNoFacturados: async (_, { hospedaje_id }, { pool }) => {
      try {
        let query = `
          SELECT c.*,
                 s.nombre as servicio_nombre,
                 i.nombre as item_nombre,
                 i.tipo as item_tipo,
                 u.usuario as usuario_registro
          FROM consumos_habitacion c
          LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
          LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
          LEFT JOIN usuarios u ON c.created_by = u.id
          WHERE c.facturado = false
        `;
        const params = [];

        if (hospedaje_id) {
          params.push(hospedaje_id);
          query += ` AND c.hospedaje_id = $${params.length}`;
        }

        query += ' ORDER BY c.fecha_consumo DESC';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener consumos no facturados:', error);
        throw new GraphQLError('Error al obtener consumos no facturados', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Resumen de consumos por hospedaje (para cuenta corriente)
    resumenConsumos: async (_, { hospedaje_id }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT
             COUNT(*) as total_items,
             SUM(precio_total) as total_consumos,
             COUNT(CASE WHEN facturado = true THEN 1 END) as items_facturados,
             SUM(CASE WHEN facturado = true THEN precio_total ELSE 0 END) as total_facturado,
             COUNT(CASE WHEN facturado = false THEN 1 END) as items_pendientes,
             SUM(CASE WHEN facturado = false THEN precio_total ELSE 0 END) as total_pendiente
           FROM consumos_habitacion
           WHERE hospedaje_id = $1`,
          [hospedaje_id]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener resumen de consumos:', error);
        throw new GraphQLError('Error al obtener resumen de consumos', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },
  },

  Mutation: {
    // Agregar consumo a hospedaje
    agregarConsumo: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { hospedaje_id, habitacion_id, producto_id, servicio_id, item_inventario_id, descripcion, cantidad, precio_unitario, notas } = input;

        // Validar que el hospedaje existe y está activo
        const hospedajeCheck = await client.query(
          'SELECT id, estado FROM hospedajes WHERE id = $1',
          [hospedaje_id]
        );

        if (hospedajeCheck.rows.length === 0) {
          throw new GraphQLError('Hospedaje no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        if (hospedajeCheck.rows[0].estado === 'finalizado' || hospedajeCheck.rows[0].estado === 'cancelado') {
          throw new GraphQLError('No se pueden agregar consumos a un hospedaje finalizado o cancelado', {
            extensions: { code: 'INVALID_STATE' }
          });
        }

        // Validar que se proporcione producto, servicio o item
        if (!producto_id && !servicio_id && !item_inventario_id) {
          throw new GraphQLError('Debe proporcionar un item_inventario_id, producto_id o servicio_id', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Calcular precio total
        const precio_total = cantidad * precio_unitario;

        // Insertar consumo (el trigger se encargará de descontar stock si es producto)
        const result = await client.query(
          `INSERT INTO consumos_habitacion
           (hospedaje_id, habitacion_id, item_inventario_id, producto_id, servicio_id, descripcion, cantidad, precio_unitario, precio_total, created_by, notas, facturado)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
           RETURNING *`,
          [hospedaje_id, habitacion_id, item_inventario_id || null, producto_id || null, servicio_id || null, descripcion, cantidad, precio_unitario, precio_total, user.id, notas || null]
        );

        await client.query('COMMIT');

        // Obtener el consumo con información relacionada
        const consumoCompleto = await pool.query(
          `SELECT c.*,
                  s.nombre as servicio_nombre,
                  i.nombre as item_nombre,
                  i.tipo as item_tipo,
                  u.usuario as usuario_registro
           FROM consumos_habitacion c
           LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
           LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
           LEFT JOIN usuarios u ON c.created_by = u.id
           WHERE c.id = $1`,
          [result.rows[0].id]
        );

        return consumoCompleto.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al agregar consumo:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    // Actualizar consumo
    actualizarConsumo: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        // Verificar que el consumo no esté facturado
        const consumoCheck = await pool.query(
          'SELECT facturado FROM consumos_habitacion WHERE id = $1',
          [id]
        );

        if (consumoCheck.rows.length === 0) {
          throw new GraphQLError('Consumo no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        if (consumoCheck.rows[0].facturado) {
          throw new GraphQLError('No se puede modificar un consumo ya facturado', {
            extensions: { code: 'INVALID_STATE' }
          });
        }

        const { descripcion, cantidad, precio_unitario, notas } = input;

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (descripcion !== undefined) {
          params.push(descripcion);
          updates.push(`descripcion = $${paramCount++}`);
        }
        if (cantidad !== undefined) {
          params.push(cantidad);
          updates.push(`cantidad = $${paramCount++}`);
        }
        if (precio_unitario !== undefined) {
          params.push(precio_unitario);
          updates.push(`precio_unitario = $${paramCount++}`);
        }
        if (notas !== undefined) {
          params.push(notas);
          updates.push(`notas = $${paramCount++}`);
        }

        // Recalcular precio_total si se actualizó cantidad o precio_unitario
        if (cantidad !== undefined || precio_unitario !== undefined) {
          const current = await pool.query(
            'SELECT cantidad, precio_unitario FROM consumos_habitacion WHERE id = $1',
            [id]
          );
          const nuevaCantidad = cantidad !== undefined ? cantidad : current.rows[0].cantidad;
          const nuevoPrecio = precio_unitario !== undefined ? precio_unitario : current.rows[0].precio_unitario;
          const nuevoPrecioTotal = nuevaCantidad * nuevoPrecio;

          params.push(nuevoPrecioTotal);
          updates.push(`precio_total = $${paramCount++}`);
        }

        if (updates.length === 0) {
          throw new GraphQLError('No se proporcionaron campos para actualizar', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        params.push(id);
        const query = `UPDATE consumos_habitacion SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        // Obtener el consumo con información relacionada
        const consumoCompleto = await pool.query(
          `SELECT c.*,
                  s.nombre as servicio_nombre,
                  i.nombre as item_nombre,
                  i.tipo as item_tipo,
                  u.usuario as usuario_registro
           FROM consumos_habitacion c
           LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
           LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
           LEFT JOIN usuarios u ON c.created_by = u.id
           WHERE c.id = $1`,
          [id]
        );

        return consumoCompleto.rows[0];
      } catch (error) {
        console.error('Error al actualizar consumo:', error);
        throw error;
      }
    },

    // Eliminar consumo
    eliminarConsumo: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verificar que el consumo no esté facturado
        const consumoCheck = await client.query(
          'SELECT facturado FROM consumos_habitacion WHERE id = $1',
          [id]
        );

        if (consumoCheck.rows.length === 0) {
          throw new GraphQLError('Consumo no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        if (consumoCheck.rows[0].facturado) {
          throw new GraphQLError('No se puede eliminar un consumo ya facturado', {
            extensions: { code: 'INVALID_STATE' }
          });
        }

        // Eliminar el consumo
        const result = await client.query(
          'DELETE FROM consumos_habitacion WHERE id = $1 RETURNING *',
          [id]
        );

        await client.query('COMMIT');

        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar consumo:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    // Marcar consumos como facturados (usado en check-out)
    marcarConsumosFacturados: async (_, { hospedaje_id }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const result = await pool.query(
          'UPDATE consumos_habitacion SET facturado = true WHERE hospedaje_id = $1 AND facturado = false RETURNING *',
          [hospedaje_id]
        );

        return result.rows;
      } catch (error) {
        console.error('Error al marcar consumos como facturados:', error);
        throw new GraphQLError('Error al marcar consumos como facturados', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },
  },
};

module.exports = consumosResolvers;
