// Resolvers para Items de Inventario

const itemsResolvers = {
  Query: {
    /**
     * Obtener todos los items de inventario con filtros opcionales
     */
    itemsInventario: async (_, { tipo, categoria_id, activo, busqueda }, { pool }) => {
      let query = `
        SELECT
          i.*,
          json_build_object(
            'id', c.id,
            'nombre', c.nombre,
            'descripcion', c.descripcion,
            'tipo', c.tipo,
            'color', c.color,
            'icono', c.icono,
            'orden', c.orden,
            'activa', c.activa,
            'created_at', c.created_at,
            'updated_at', c.updated_at
          ) as categoria
        FROM items_inventario i
        LEFT JOIN categorias_inventario c ON i.categoria_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (tipo !== undefined) {
        params.push(tipo);
        query += ` AND i.tipo = $${params.length}`;
      }

      if (categoria_id !== undefined) {
        params.push(categoria_id);
        query += ` AND i.categoria_id = $${params.length}`;
      }

      if (activo !== undefined) {
        params.push(activo);
        query += ` AND i.activo = $${params.length}`;
      }

      if (busqueda) {
        params.push(`%${busqueda}%`);
        query += ` AND (i.nombre ILIKE $${params.length} OR i.descripcion ILIKE $${params.length} OR i.codigo ILIKE $${params.length})`;
      }

      query += ' ORDER BY i.nombre ASC';

      const result = await pool.query(query, params);
      return result.rows;
    },

    /**
     * Obtener un item por ID
     */
    itemInventario: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Item no encontrado');
      }

      return result.rows[0];
    },

    /**
     * Obtener un item por código
     */
    itemInventarioPorCodigo: async (_, { codigo }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM items_inventario WHERE codigo = $1',
        [codigo]
      );

      if (result.rows.length === 0) {
        throw new Error('Item no encontrado');
      }

      return result.rows[0];
    },

    /**
     * Obtener items con stock bajo (stock_actual <= stock_minimo)
     */
    itemsBajoStock: async (_, __, { pool }) => {
      const result = await pool.query(
        `SELECT * FROM items_inventario
         WHERE tipo = 'producto'
         AND activo = true
         AND stock_actual <= stock_minimo
         ORDER BY (stock_actual - stock_minimo) ASC`
      );

      return result.rows;
    },

    /**
     * Obtener movimientos de inventario con filtros
     */
    movimientosInventario: async (_, { item_inventario_id, tipo_movimiento, fecha_desde, fecha_hasta }, { pool }) => {
      console.log('🔍 movimientosInventario called with:', { item_inventario_id, tipo_movimiento, fecha_desde, fecha_hasta });

      let query = 'SELECT * FROM movimientos_inventario WHERE 1=1';
      const params = [];

      if (item_inventario_id !== undefined && item_inventario_id !== null) {
        params.push(item_inventario_id);
        query += ` AND item_inventario_id = $${params.length}`;
      }

      if (tipo_movimiento !== undefined) {
        params.push(tipo_movimiento);
        query += ` AND tipo_movimiento = $${params.length}`;
      }

      if (fecha_desde) {
        params.push(fecha_desde);
        query += ` AND fecha_movimiento >= $${params.length}::date`;
      }

      if (fecha_hasta) {
        params.push(fecha_hasta);
        query += ` AND fecha_movimiento < ($${params.length}::date + interval '1 day')`;
      }

      query += ' ORDER BY fecha_movimiento DESC';

      console.log('🔍 SQL Query:', query);
      console.log('🔍 SQL Params:', params);

      const result = await pool.query(query, params);
      console.log('🔍 Results:', result.rows.length, 'rows');
      return result.rows;
    },

    /**
     * Obtener estadísticas del inventario
     */
    estadisticasInventario: async (_, __, { pool }) => {
      // Total items
      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM items_inventario WHERE activo = true'
      );
      const total_items = parseInt(totalResult.rows[0].total);

      // Total productos y servicios
      const tiposResult = await pool.query(
        `SELECT tipo, COUNT(*) as total
         FROM items_inventario
         WHERE activo = true
         GROUP BY tipo`
      );
      const total_productos = parseInt(tiposResult.rows.find(r => r.tipo === 'producto')?.total || 0);
      const total_servicios = parseInt(tiposResult.rows.find(r => r.tipo === 'servicio')?.total || 0);

      // Items bajo stock
      const bajoStockResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM items_inventario
         WHERE tipo = 'producto'
         AND activo = true
         AND stock_actual <= stock_minimo`
      );
      const items_bajo_stock = parseInt(bajoStockResult.rows[0].total);

      // Valor total del inventario
      const valorResult = await pool.query(
        `SELECT SUM(precio_base * stock_actual) as valor_total
         FROM items_inventario
         WHERE tipo = 'producto' AND activo = true`
      );
      const valor_total_inventario = parseFloat(valorResult.rows[0].valor_total || 0);

      // Items por categoría
      const categoriaResult = await pool.query(
        `SELECT
          i.categoria_id,
          c.nombre as categoria_nombre,
          COUNT(*) as cantidad,
          SUM(i.precio_base * i.stock_actual) as valor_total
         FROM items_inventario i
         LEFT JOIN categorias_inventario c ON i.categoria_id = c.id
         WHERE i.activo = true
         GROUP BY i.categoria_id, c.nombre
         ORDER BY cantidad DESC`
      );
      const items_por_categoria = categoriaResult.rows.map(row => ({
        categoria_id: row.categoria_id,
        categoria_nombre: row.categoria_nombre || 'Sin categoría',
        cantidad: parseInt(row.cantidad),
        valor_total: parseFloat(row.valor_total || 0)
      }));

      // Productos más consumidos (últimos 30 días)
      const consumidosResult = await pool.query(
        `SELECT
          i.id as item_id,
          i.codigo,
          i.nombre,
          i.tipo,
          SUM(c.cantidad) as cantidad_consumida,
          COUNT(c.id) as veces_consumido,
          cat.nombre as categoria_nombre
         FROM consumos_habitacion c
         JOIN items_inventario i ON c.item_inventario_id = i.id
         LEFT JOIN categorias_inventario cat ON i.categoria_id = cat.id
         WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY i.id, i.codigo, i.nombre, i.tipo, cat.nombre
         ORDER BY cantidad_consumida DESC
         LIMIT 5`
      );
      const productos_mas_consumidos = consumidosResult.rows.map(row => ({
        item_id: row.item_id,
        codigo: row.codigo,
        nombre: row.nombre,
        tipo: row.tipo,
        cantidad_consumida: parseInt(row.cantidad_consumida),
        veces_consumido: parseInt(row.veces_consumido),
        categoria_nombre: row.categoria_nombre
      }));

      return {
        total_items,
        total_productos,
        total_servicios,
        items_bajo_stock,
        valor_total_inventario,
        items_por_categoria,
        productos_mas_consumidos
      };
    },
  },

  Mutation: {
    /**
     * Crear un nuevo item de inventario
     */
    crearItemInventario: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que la categoría existe
      const categoria = await pool.query(
        'SELECT id FROM categorias_inventario WHERE id = $1 AND activa = true',
        [input.categoria_id]
      );

      if (categoria.rows.length === 0) {
        throw new Error('Categoría no encontrada o inactiva');
      }

      // Verificar código único si se proporciona
      if (input.codigo) {
        const existente = await pool.query(
          'SELECT id FROM items_inventario WHERE codigo = $1',
          [input.codigo]
        );

        if (existente.rows.length > 0) {
          throw new Error('Ya existe un item con ese código');
        }
      }

      // Establecer valores por defecto
      const stock_actual = input.stock_actual !== undefined ? input.stock_actual : 0;
      const stock_minimo = input.stock_minimo !== undefined ? input.stock_minimo : 0;
      const iva_porcentaje = input.iva_porcentaje !== undefined ? input.iva_porcentaje : 0;
      const unidad_medida = input.unidad_medida || (input.tipo === 'servicio' ? 'servicio' : 'unidad');

      const result = await pool.query(
        `INSERT INTO items_inventario
         (codigo, nombre, descripcion, tipo, categoria_id, precio_base, iva_porcentaje,
          stock_actual, stock_minimo, unidad_medida, ubicacion_almacen, duracion_minutos,
          precio_compra, margen_utilidad, imagen_url, notas, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
         RETURNING *`,
        [
          input.codigo || null,
          input.nombre,
          input.descripcion || null,
          input.tipo,
          input.categoria_id,
          input.precio_base,
          iva_porcentaje,
          stock_actual,
          stock_minimo,
          unidad_medida,
          input.ubicacion_almacen || null,
          input.duracion_minutos || null,
          input.precio_compra || null,
          input.margen_utilidad || null,
          input.imagen_url || null,
          input.notas || null,
        ]
      );

      // Si es producto y tiene stock inicial, registrar movimiento
      if (input.tipo === 'producto' && stock_actual > 0) {
        await pool.query(
          `INSERT INTO movimientos_inventario
           (item_inventario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
           VALUES ($1, 'entrada', $2, 0, $2, 'Stock inicial', $3)`,
          [result.rows[0].id, stock_actual, user.id]
        );
      }

      return result.rows[0];
    },

    /**
     * Crear múltiples items de inventario en lote
     */
    crearItemsMasivo: async (_, { items }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      if (!items || items.length === 0) {
        throw new Error('Debe proporcionar al menos un item');
      }

      const client = await pool.connect();
      const itemsCreados = [];
      const errores = [];

      try {
        await client.query('BEGIN');

        for (let i = 0; i < items.length; i++) {
          const input = items[i];

          try {
            // Verificar que la categoría existe
            const categoria = await client.query(
              'SELECT id FROM categorias_inventario WHERE id = $1 AND activa = true',
              [input.categoria_id]
            );

            if (categoria.rows.length === 0) {
              throw new Error(`Fila ${i + 1}: Categoría no encontrada o inactiva`);
            }

            // Verificar código único si se proporciona
            if (input.codigo) {
              const existente = await client.query(
                'SELECT id FROM items_inventario WHERE codigo = $1',
                [input.codigo]
              );

              if (existente.rows.length > 0) {
                throw new Error(`Fila ${i + 1}: Ya existe un item con el código "${input.codigo}"`);
              }
            }

            // Establecer valores por defecto
            const stock_actual = input.stock_actual !== undefined ? input.stock_actual : 0;
            const stock_minimo = input.stock_minimo !== undefined ? input.stock_minimo : 0;
            const iva_porcentaje = input.iva_porcentaje !== undefined ? input.iva_porcentaje : 0;
            const unidad_medida = input.unidad_medida || (input.tipo === 'servicio' ? 'servicio' : 'unidad');

            // Insertar item
            const result = await client.query(
              `INSERT INTO items_inventario
               (codigo, nombre, descripcion, tipo, categoria_id, precio_base, iva_porcentaje,
                stock_actual, stock_minimo, unidad_medida, ubicacion_almacen, duracion_minutos,
                precio_compra, margen_utilidad, imagen_url, notas, activo)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
               RETURNING *`,
              [
                input.codigo || null,
                input.nombre,
                input.descripcion || null,
                input.tipo,
                input.categoria_id,
                input.precio_base,
                iva_porcentaje,
                stock_actual,
                stock_minimo,
                unidad_medida,
                input.ubicacion_almacen || null,
                input.duracion_minutos || null,
                input.precio_compra || null,
                input.margen_utilidad || null,
                input.imagen_url || null,
                input.notas || null,
              ]
            );

            // Si es producto y tiene stock inicial, registrar movimiento
            if (input.tipo === 'producto' && stock_actual > 0) {
              await client.query(
                `INSERT INTO movimientos_inventario
                 (item_inventario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
                 VALUES ($1, 'entrada', $2, 0, $2, 'Ingreso masivo - Stock inicial', $3)`,
                [result.rows[0].id, stock_actual, user.id]
              );
            }

            itemsCreados.push(result.rows[0]);
          } catch (error) {
            errores.push(error.message);
            throw error;
          }
        }

        await client.query('COMMIT');
        return itemsCreados;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(errores.length > 0 ? errores.join('; ') : error.message);
      } finally {
        client.release();
      }
    },

    /**
     * Actualizar un item existente
     */
    actualizarItemInventario: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que el item existe
      const existente = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [id]
      );

      if (existente.rows.length === 0) {
        throw new Error('Item no encontrado');
      }

      // Si se cambia la categoría, verificar que existe y está activa
      if (input.categoria_id) {
        const categoria = await pool.query(
          'SELECT id FROM categorias_inventario WHERE id = $1 AND activa = true',
          [input.categoria_id]
        );

        if (categoria.rows.length === 0) {
          throw new Error('Categoría no encontrada o inactiva');
        }
      }

      // Si se cambia el código, verificar que no esté duplicado
      if (input.codigo && input.codigo !== existente.rows[0].codigo) {
        const duplicado = await pool.query(
          'SELECT id FROM items_inventario WHERE codigo = $1 AND id != $2',
          [input.codigo, id]
        );

        if (duplicado.rows.length > 0) {
          throw new Error('Ya existe un item con ese código');
        }
      }

      // Construir query dinámica
      const campos = [];
      const valores = [];
      let contador = 1;

      if (input.codigo !== undefined) {
        campos.push(`codigo = $${contador}`);
        valores.push(input.codigo);
        contador++;
      }

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

      if (input.categoria_id !== undefined) {
        campos.push(`categoria_id = $${contador}`);
        valores.push(input.categoria_id);
        contador++;
      }

      if (input.precio_base !== undefined) {
        campos.push(`precio_base = $${contador}`);
        valores.push(input.precio_base);
        contador++;
      }

      if (input.iva_porcentaje !== undefined) {
        campos.push(`iva_porcentaje = $${contador}`);
        valores.push(input.iva_porcentaje);
        contador++;
      }

      if (input.stock_minimo !== undefined) {
        campos.push(`stock_minimo = $${contador}`);
        valores.push(input.stock_minimo);
        contador++;
      }

      if (input.unidad_medida !== undefined) {
        campos.push(`unidad_medida = $${contador}`);
        valores.push(input.unidad_medida);
        contador++;
      }

      if (input.ubicacion_almacen !== undefined) {
        campos.push(`ubicacion_almacen = $${contador}`);
        valores.push(input.ubicacion_almacen);
        contador++;
      }

      if (input.duracion_minutos !== undefined) {
        campos.push(`duracion_minutos = $${contador}`);
        valores.push(input.duracion_minutos);
        contador++;
      }

      if (input.precio_compra !== undefined) {
        campos.push(`precio_compra = $${contador}`);
        valores.push(input.precio_compra);
        contador++;
      }

      if (input.margen_utilidad !== undefined) {
        campos.push(`margen_utilidad = $${contador}`);
        valores.push(input.margen_utilidad);
        contador++;
      }

      if (input.activo !== undefined) {
        campos.push(`activo = $${contador}`);
        valores.push(input.activo);
        contador++;
      }

      if (input.imagen_url !== undefined) {
        campos.push(`imagen_url = $${contador}`);
        valores.push(input.imagen_url);
        contador++;
      }

      if (input.notas !== undefined) {
        campos.push(`notas = $${contador}`);
        valores.push(input.notas);
        contador++;
      }

      if (campos.length === 0) {
        return existente.rows[0];
      }

      valores.push(id);
      const query = `
        UPDATE items_inventario
        SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${contador}
        RETURNING *
      `;

      const result = await pool.query(query, valores);
      return result.rows[0];
    },

    /**
     * Eliminar (desactivar) un item
     */
    eliminarItemInventario: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Verificar que el item existe
      const existente = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [id]
      );

      if (existente.rows.length === 0) {
        throw new Error('Item no encontrado');
      }

      // Verificar si hay consumos asociados
      const consumosAsociados = await pool.query(
        'SELECT COUNT(*) as total FROM consumos_habitacion WHERE item_inventario_id = $1',
        [id]
      );

      if (parseInt(consumosAsociados.rows[0].total) > 0) {
        // Solo desactivar, no eliminar físicamente
        const result = await pool.query(
          `UPDATE items_inventario
           SET activo = false, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        return result.rows[0];
      } else {
        // Si no hay consumos, se puede eliminar físicamente
        const result = await pool.query(
          'DELETE FROM items_inventario WHERE id = $1 RETURNING *',
          [id]
        );
        return result.rows[0];
      }
    },

    /**
     * Ajustar stock manualmente (entrada, salida, ajuste, devolución)
     */
    ajustarStock: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Obtener item actual
        const itemResult = await client.query(
          'SELECT * FROM items_inventario WHERE id = $1 AND tipo = $2',
          [input.item_inventario_id, 'producto']
        );

        if (itemResult.rows.length === 0) {
          throw new Error('Item no encontrado o no es un producto');
        }

        const item = itemResult.rows[0];
        const stock_anterior = item.stock_actual;
        let stock_nuevo;

        // Calcular nuevo stock según tipo de movimiento
        switch (input.tipo_movimiento) {
          case 'entrada':
            stock_nuevo = stock_anterior + Math.abs(input.cantidad);
            break;
          case 'salida':
            stock_nuevo = stock_anterior - Math.abs(input.cantidad);
            if (stock_nuevo < 0) {
              throw new Error('Stock insuficiente');
            }
            break;
          case 'ajuste':
            // Ajuste puede ser positivo o negativo
            stock_nuevo = stock_anterior + input.cantidad;
            if (stock_nuevo < 0) {
              throw new Error('El ajuste resultaría en stock negativo');
            }
            break;
          case 'devolucion':
            stock_nuevo = stock_anterior + Math.abs(input.cantidad);
            break;
          default:
            throw new Error('Tipo de movimiento no válido');
        }

        // Actualizar stock
        await client.query(
          'UPDATE items_inventario SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [stock_nuevo, input.item_inventario_id]
        );

        // Registrar movimiento
        const movimientoResult = await client.query(
          `INSERT INTO movimientos_inventario
           (item_inventario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            input.item_inventario_id,
            input.tipo_movimiento,
            Math.abs(input.cantidad),
            stock_anterior,
            stock_nuevo,
            input.motivo,
            user.id,
          ]
        );

        // Logging para debugging
        console.log('[ajustarStock] Movimiento registrado exitosamente:', {
          id: movimientoResult.rows[0].id,
          item_id: movimientoResult.rows[0].item_inventario_id,
          tipo: movimientoResult.rows[0].tipo_movimiento,
          cantidad: movimientoResult.rows[0].cantidad,
          stock_anterior: movimientoResult.rows[0].stock_anterior,
          stock_nuevo: movimientoResult.rows[0].stock_nuevo,
          usuario_id: movimientoResult.rows[0].usuario_id,
          created_at: movimientoResult.rows[0].created_at
        });

        await client.query('COMMIT');
        return movimientoResult.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  },

  // Nested resolvers eliminados - categoria ahora viene del LEFT JOIN en la query principal
  ItemInventario: {},

  MovimientoInventario: {
    item: async (parent, _, { pool }) => {
      if (!parent.item_inventario_id) return null;

      const result = await pool.query(
        'SELECT * FROM items_inventario WHERE id = $1',
        [parent.item_inventario_id]
      );

      return result.rows[0] || null;
    },

    usuario: async (parent, _, { pool }) => {
      if (!parent.usuario_id) return null;

      const result = await pool.query(
        'SELECT id, nombre, apellido, usuario, rol FROM usuarios WHERE id = $1',
        [parent.usuario_id]
      );

      return result.rows[0] || null;
    },
  },
};

module.exports = itemsResolvers;
