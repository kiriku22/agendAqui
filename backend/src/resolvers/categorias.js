// Resolvers para Categorías de Inventario

const categoriasResolvers = {
  Query: {
    /**
     * Obtener todas las categorías de inventario con filtros opcionales
     */
    categoriasInventario: async (_, { tipo, activa }, { pool }) => {
      let query = 'SELECT * FROM categorias_inventario WHERE 1=1';
      const params = [];

      if (tipo !== undefined) {
        params.push(tipo);
        query += ` AND tipo = $${params.length}`;
      }

      if (activa !== undefined) {
        params.push(activa);
        query += ` AND activa = $${params.length}`;
      }

      query += ' ORDER BY orden ASC, nombre ASC';

      const result = await pool.query(query, params);
      return result.rows;
    },

    /**
     * Obtener una categoría por ID
     */
    categoriaInventario: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM categorias_inventario WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Categoría no encontrada');
      }

      return result.rows[0];
    },
  },

  Mutation: {
    /**
     * Crear una nueva categoría de inventario
     */
    crearCategoriaInventario: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que el nombre no esté duplicado
      const existente = await pool.query(
        'SELECT id FROM categorias_inventario WHERE nombre = $1',
        [input.nombre]
      );

      if (existente.rows.length > 0) {
        throw new Error('Ya existe una categoría con ese nombre');
      }

      // Establecer orden por defecto si no se proporciona
      const orden = input.orden !== undefined ? input.orden : 0;

      const result = await pool.query(
        `INSERT INTO categorias_inventario
         (nombre, descripcion, tipo, color, icono, orden, activa)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [
          input.nombre,
          input.descripcion || null,
          input.tipo,
          input.color || null,
          input.icono || null,
          orden,
        ]
      );

      return result.rows[0];
    },

    /**
     * Actualizar una categoría existente
     */
    actualizarCategoriaInventario: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que la categoría existe
      const existente = await pool.query(
        'SELECT * FROM categorias_inventario WHERE id = $1',
        [id]
      );

      if (existente.rows.length === 0) {
        throw new Error('Categoría no encontrada');
      }

      // Si se cambia el nombre, verificar que no esté duplicado
      if (input.nombre && input.nombre !== existente.rows[0].nombre) {
        const duplicado = await pool.query(
          'SELECT id FROM categorias_inventario WHERE nombre = $1 AND id != $2',
          [input.nombre, id]
        );

        if (duplicado.rows.length > 0) {
          throw new Error('Ya existe una categoría con ese nombre');
        }
      }

      // Construir query dinámica
      const campos = [];
      const valores = [];
      let contador = 1;

      if (input.nombre !== undefined) {
        campos.push(`nombre = $${contador}`);
        valores.push(input.nombre);
        contador++;
      }

      if (input.descripcion !== undefined) {
        campos.push(`descripcion = $${contador}`);
        valores.push(input.descripcion);
        contador++;
      }

      if (input.tipo !== undefined) {
        campos.push(`tipo = $${contador}`);
        valores.push(input.tipo);
        contador++;
      }

      if (input.color !== undefined) {
        campos.push(`color = $${contador}`);
        valores.push(input.color);
        contador++;
      }

      if (input.icono !== undefined) {
        campos.push(`icono = $${contador}`);
        valores.push(input.icono);
        contador++;
      }

      if (input.orden !== undefined) {
        campos.push(`orden = $${contador}`);
        valores.push(input.orden);
        contador++;
      }

      if (input.activa !== undefined) {
        campos.push(`activa = $${contador}`);
        valores.push(input.activa);
        contador++;
      }

      if (campos.length === 0) {
        return existente.rows[0];
      }

      valores.push(id);
      const query = `
        UPDATE categorias_inventario
        SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${contador}
        RETURNING *
      `;

      const result = await pool.query(query, valores);
      return result.rows[0];
    },

    /**
     * Eliminar (desactivar) una categoría
     */
    eliminarCategoriaInventario: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que la categoría existe
      const existente = await pool.query(
        'SELECT * FROM categorias_inventario WHERE id = $1',
        [id]
      );

      if (existente.rows.length === 0) {
        throw new Error('Categoría no encontrada');
      }

      // Verificar si hay items asociados a esta categoría
      const itemsAsociados = await pool.query(
        'SELECT COUNT(*) as total FROM items_inventario WHERE categoria_id = $1 AND activo = true',
        [id]
      );

      if (parseInt(itemsAsociados.rows[0].total) > 0) {
        // Solo desactivar, no eliminar físicamente
        const result = await pool.query(
          `UPDATE categorias_inventario
           SET activa = false, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        return result.rows[0];
      } else {
        // Si no hay items asociados, se puede eliminar físicamente
        const result = await pool.query(
          'DELETE FROM categorias_inventario WHERE id = $1 RETURNING *',
          [id]
        );
        return result.rows[0];
      }
    },
  },
};

module.exports = categoriasResolvers;
