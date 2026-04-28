// Resolvers para Servicios Hotel y Productos
const { GraphQLError } = require('graphql');

const serviciosResolvers = {
  Query: {
    // Obtener todos los servicios hotel
    serviciosHotel: async (_, { activo }, { pool }) => {
      try {
        let query = 'SELECT * FROM servicios_hotel';
        const params = [];

        if (activo !== undefined) {
          params.push(activo);
          query += ` WHERE activo = $${params.length}`;
        }

        query += ' ORDER BY categoria, nombre';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener servicios hotel:', error);
        throw new GraphQLError('Error al obtener servicios del hotel', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Obtener servicio por ID
    servicioHotel: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM servicios_hotel WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          throw new GraphQLError('Servicio no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener servicio:', error);
        throw error;
      }
    },

    // Obtener servicios por categoría
    serviciosPorCategoria: async (_, { categoria }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM servicios_hotel WHERE categoria = $1 AND activo = true ORDER BY nombre',
          [categoria]
        );

        return result.rows;
      } catch (error) {
        console.error('Error al obtener servicios por categoría:', error);
        throw new GraphQLError('Error al obtener servicios por categoría', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Obtener productos (del sistema de inventario - para consumos)
    productos: async (_, { categoria, activo }, { pool }) => {
      try {
        let query = 'SELECT * FROM productos WHERE 1=1';
        const params = [];

        if (categoria) {
          params.push(categoria);
          query += ` AND categoria = $${params.length}`;
        }

        if (activo !== undefined) {
          params.push(activo);
          query += ` AND activo = $${params.length}`;
        }

        query += ' ORDER BY nombre';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener productos:', error);
        throw new GraphQLError('Error al obtener productos', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Buscar productos por nombre (para autocomplete)
    buscarProductos: async (_, { termino }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT * FROM productos
           WHERE LOWER(nombre) LIKE LOWER($1) AND activo = true
           ORDER BY nombre
           LIMIT 20`,
          [`%${termino}%`]
        );

        return result.rows;
      } catch (error) {
        console.error('Error al buscar productos:', error);
        throw new GraphQLError('Error al buscar productos', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },
  },

  Mutation: {
    // Crear servicio hotel
    crearServicioHotel: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const { nombre, descripcion, categoria, precio, unidad_medida, duracion_minutos, incluye_iva, iva_porcentaje } = input;

        const result = await pool.query(
          `INSERT INTO servicios_hotel
           (nombre, descripcion, categoria, precio, unidad_medida, duracion_minutos, incluye_iva, iva_porcentaje, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           RETURNING *`,
          [nombre, descripcion || null, categoria, precio, unidad_medida || 'unidad', duracion_minutos || null, incluye_iva || false, iva_porcentaje || 0]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error al crear servicio hotel:', error);
        throw new GraphQLError('Error al crear servicio del hotel', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    // Actualizar servicio hotel
    actualizarServicioHotel: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const { nombre, descripcion, categoria, precio, unidad_medida, duracion_minutos, incluye_iva, iva_porcentaje, activo } = input;

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (nombre !== undefined) {
          params.push(nombre);
          updates.push(`nombre = $${paramCount++}`);
        }
        if (descripcion !== undefined) {
          params.push(descripcion);
          updates.push(`descripcion = $${paramCount++}`);
        }
        if (categoria !== undefined) {
          params.push(categoria);
          updates.push(`categoria = $${paramCount++}`);
        }
        if (precio !== undefined) {
          params.push(precio);
          updates.push(`precio = $${paramCount++}`);
        }
        if (unidad_medida !== undefined) {
          params.push(unidad_medida);
          updates.push(`unidad_medida = $${paramCount++}`);
        }
        if (duracion_minutos !== undefined) {
          params.push(duracion_minutos);
          updates.push(`duracion_minutos = $${paramCount++}`);
        }
        if (incluye_iva !== undefined) {
          params.push(incluye_iva);
          updates.push(`incluye_iva = $${paramCount++}`);
        }
        if (iva_porcentaje !== undefined) {
          params.push(iva_porcentaje);
          updates.push(`iva_porcentaje = $${paramCount++}`);
        }
        if (activo !== undefined) {
          params.push(activo);
          updates.push(`activo = $${paramCount++}`);
        }

        if (updates.length === 0) {
          throw new GraphQLError('No se proporcionaron campos para actualizar', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        params.push(id);
        const query = `UPDATE servicios_hotel SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
          throw new GraphQLError('Servicio no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al actualizar servicio hotel:', error);
        throw error;
      }
    },

    // Eliminar servicio hotel (soft delete)
    eliminarServicioHotel: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const result = await pool.query(
          'UPDATE servicios_hotel SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          throw new GraphQLError('Servicio no encontrado', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al eliminar servicio hotel:', error);
        throw new GraphQLError('Error al eliminar servicio', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },
  },
};

module.exports = serviciosResolvers;
