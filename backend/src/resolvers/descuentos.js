// =====================================================
// RESOLVER: DESCUENTOS
// Gestión de descuentos predefinidos y aplicables
// =====================================================

const descuentosResolvers = {
  // =====================================================
  // QUERIES
  // =====================================================
  Query: {
    // Obtener todos los descuentos
    descuentos: async (_, { activo, tipo }, { pool }) => {
      let query = 'SELECT * FROM descuentos WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (activo !== undefined) {
        query += ` AND activo = $${paramCount}`;
        params.push(activo);
        paramCount++;
      }

      if (tipo) {
        query += ` AND tipo = $${paramCount}`;
        params.push(tipo);
        paramCount++;
      }

      query += ' ORDER BY orden, nombre';

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Obtener descuento por ID
    descuento: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM descuentos WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Obtener descuentos aplicables según condiciones
    descuentosAplicables: async (_, { monto, categoria_id, tipo_item }, { pool }) => {
      const now = new Date();
      const hora_actual = now.toTimeString().slice(0, 5); // HH:MM
      const dia_semana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][now.getDay()];

      let query = `
        SELECT * FROM descuentos
        WHERE activo = true
        AND (monto_minimo IS NULL OR monto_minimo <= $1)
      `;
      const params = [monto];
      let paramCount = 2;

      // Filtrar por fecha de vigencia
      query += ` AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)`;
      query += ` AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)`;

      // Filtrar por categoría si se especifica
      if (categoria_id) {
        query += ` AND (categoria_aplicable IS NULL OR categoria_aplicable = $${paramCount})`;
        params.push(categoria_id);
        paramCount++;
      }

      // Filtrar por tipo de item si se especifica
      if (tipo_item) {
        query += ` AND (tipo_item_aplicable IS NULL OR tipo_item_aplicable = $${paramCount} OR tipo_item_aplicable = 'ambos')`;
        params.push(tipo_item);
        paramCount++;
      }

      query += ' ORDER BY valor DESC'; // Ordenar por mayor descuento primero

      const result = await pool.query(query, params);

      // Filtrar por días de la semana y horario (esto se hace en memoria porque son campos JSON/TEXT)
      return result.rows.filter(descuento => {
        // Verificar días de la semana
        if (descuento.dias_semana) {
          try {
            const dias = JSON.parse(descuento.dias_semana);
            if (Array.isArray(dias) && !dias.includes(dia_semana)) {
              return false;
            }
          } catch (e) {
            // Si falla el parse, ignorar el filtro
          }
        }

        // Verificar horario
        if (descuento.hora_inicio && descuento.hora_fin) {
          if (hora_actual < descuento.hora_inicio || hora_actual > descuento.hora_fin) {
            return false;
          }
        }

        return true;
      });
    }
  },

  // =====================================================
  // MUTATIONS
  // =====================================================
  Mutation: {
    // Crear descuento
    crearDescuento: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin y gerente pueden crear descuentos
      if (!['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No tienes permisos para crear descuentos');
      }

      const {
        codigo,
        nombre,
        descripcion,
        tipo,
        valor,
        monto_minimo,
        categoria_aplicable,
        tipo_item_aplicable,
        fecha_inicio,
        fecha_fin,
        dias_semana,
        hora_inicio,
        hora_fin,
        requiere_autorizacion,
        rol_autorizador,
        activo
      } = input;

      // Validar que el código no exista
      const existeResult = await pool.query(
        'SELECT id FROM descuentos WHERE codigo = $1',
        [codigo]
      );

      if (existeResult.rows.length > 0) {
        throw new Error('Ya existe un descuento con ese código');
      }

      // Validar valor según tipo
      if (tipo === 'porcentaje' && (valor <= 0 || valor > 100)) {
        throw new Error('El valor de porcentaje debe estar entre 0 y 100');
      }

      if (tipo === 'monto_fijo' && valor <= 0) {
        throw new Error('El valor de monto fijo debe ser mayor a 0');
      }

      const result = await pool.query(`
        INSERT INTO descuentos (
          codigo, nombre, descripcion, tipo, valor,
          monto_minimo, categoria_aplicable, tipo_item_aplicable,
          fecha_inicio, fecha_fin, dias_semana,
          hora_inicio, hora_fin,
          requiere_autorizacion, rol_autorizador,
          activo, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `, [
        codigo, nombre, descripcion, tipo, valor,
        monto_minimo, categoria_aplicable, tipo_item_aplicable,
        fecha_inicio, fecha_fin, dias_semana,
        hora_inicio, hora_fin,
        requiere_autorizacion || false,
        rol_autorizador || 'gerente',
        activo !== undefined ? activo : true,
        user.id
      ]);

      return result.rows[0];
    },

    // Actualizar descuento
    actualizarDescuento: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin y gerente pueden actualizar descuentos
      if (!['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No tienes permisos para actualizar descuentos');
      }

      // Verificar que el descuento existe
      const existeResult = await pool.query(
        'SELECT * FROM descuentos WHERE id = $1',
        [id]
      );

      if (existeResult.rows.length === 0) {
        throw new Error('Descuento no encontrado');
      }

      // Construir query dinámica con los campos a actualizar
      const campos = [];
      const valores = [];
      let paramCount = 1;

      if (input.nombre !== undefined) {
        campos.push(`nombre = $${paramCount}`);
        valores.push(input.nombre);
        paramCount++;
      }

      if (input.descripcion !== undefined) {
        campos.push(`descripcion = $${paramCount}`);
        valores.push(input.descripcion);
        paramCount++;
      }

      if (input.valor !== undefined) {
        // Validar valor
        const descuento = existeResult.rows[0];
        if (descuento.tipo === 'porcentaje' && (input.valor <= 0 || input.valor > 100)) {
          throw new Error('El valor de porcentaje debe estar entre 0 y 100');
        }
        if (descuento.tipo === 'monto_fijo' && input.valor <= 0) {
          throw new Error('El valor de monto fijo debe ser mayor a 0');
        }

        campos.push(`valor = $${paramCount}`);
        valores.push(input.valor);
        paramCount++;
      }

      if (input.monto_minimo !== undefined) {
        campos.push(`monto_minimo = $${paramCount}`);
        valores.push(input.monto_minimo);
        paramCount++;
      }

      if (input.fecha_inicio !== undefined) {
        campos.push(`fecha_inicio = $${paramCount}`);
        valores.push(input.fecha_inicio);
        paramCount++;
      }

      if (input.fecha_fin !== undefined) {
        campos.push(`fecha_fin = $${paramCount}`);
        valores.push(input.fecha_fin);
        paramCount++;
      }

      if (input.activo !== undefined) {
        campos.push(`activo = $${paramCount}`);
        valores.push(input.activo);
        paramCount++;
      }

      if (campos.length === 0) {
        throw new Error('No se especificaron campos para actualizar');
      }

      // Agregar updated_at
      campos.push(`updated_at = CURRENT_TIMESTAMP`);

      // Agregar ID al final de los parámetros
      valores.push(id);

      const query = `
        UPDATE descuentos
        SET ${campos.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, valores);
      return result.rows[0];
    },

    // Eliminar (desactivar) descuento
    eliminarDescuento: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin puede eliminar descuentos
      if (user.rol !== 'admin') {
        throw new Error('Solo los administradores pueden eliminar descuentos');
      }

      // Soft delete - solo desactivamos
      const result = await pool.query(
        'UPDATE descuentos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Descuento no encontrado');
      }

      return true;
    }
  },

  // =====================================================
  // FIELD RESOLVERS (relaciones)
  // =====================================================
  Descuento: {
    categoria_aplicable: async (parent, _, { pool }) => {
      if (!parent.categoria_aplicable) return null;
      const result = await pool.query(
        'SELECT * FROM categorias_inventario WHERE id = $1',
        [parent.categoria_aplicable]
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
    }
  }
};

module.exports = descuentosResolvers;
