// ============================================================================
// Resolvers para Gestion de Impresoras
// Basado en: docs/GUIA_IMPLEMENTACION_IMPRESION.md
// ============================================================================

const { GraphQLError } = require('graphql');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const impresorasResolvers = {
  Query: {
    /**
     * Obtiene todas las impresoras configuradas
     */
    impresoras: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT * FROM impresoras ORDER BY tipo, nombre
        `);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener impresoras:', error);
        throw new GraphQLError('Error al obtener impresoras', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Obtiene una impresora por ID
     */
    impresora: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM impresoras WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener impresora:', error);
        throw new GraphQLError('Error al obtener impresora', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Obtiene impresoras activas
     */
    impresorasActivas: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT * FROM impresoras WHERE activa = true ORDER BY tipo, nombre
        `);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener impresoras activas:', error);
        throw new GraphQLError('Error al obtener impresoras activas', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Obtiene impresoras por tipo
     */
    impresorasPorTipo: async (_, { tipo }, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT * FROM impresoras WHERE tipo = $1 AND activa = true ORDER BY nombre
        `, [tipo]);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener impresoras por tipo:', error);
        throw new GraphQLError('Error al obtener impresoras por tipo', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Obtiene la impresora predeterminada de un tipo
     */
    impresoraPredeterminada: async (_, { tipo }, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT * FROM impresoras
          WHERE tipo = $1 AND es_predeterminada = true AND activa = true
          LIMIT 1
        `, [tipo]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener impresora predeterminada:', error);
        throw new GraphQLError('Error al obtener impresora predeterminada', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Obtiene las impresoras instaladas en el sistema operativo (Windows)
     */
    impresorasDelSistema: async () => {
      try {
        // Windows: Usar PowerShell para listar impresoras
        const { stdout } = await execPromise(
          'powershell -Command "Get-Printer | Select-Object Name, DriverName, PrinterStatus | ConvertTo-Json"',
          { encoding: 'utf8' }
        );

        if (!stdout || stdout.trim() === '') {
          return [];
        }

        let impresoras = JSON.parse(stdout);

        // Si es un solo objeto, convertirlo a array
        if (!Array.isArray(impresoras)) {
          impresoras = [impresoras];
        }

        return impresoras.map(p => ({
          nombre: p.Name || '',
          nombre_driver: p.DriverName || '',
          estado: p.PrinterStatus === 0 ? 'Normal' : 'Error'
        }));
      } catch (error) {
        console.error('Error obteniendo impresoras del sistema:', error);
        // No lanzar error, solo retornar array vacio
        return [];
      }
    },
  },

  Mutation: {
    /**
     * Crea una nueva impresora
     */
    crearImpresora: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const {
          nombre,
          tipo,
          nombre_sistema,
          descripcion,
          activa,
          es_predeterminada,
          ancho_papel
        } = input;

        // Si es predeterminada, desmarcar otras del mismo tipo
        if (es_predeterminada) {
          await pool.query(`
            UPDATE impresoras SET es_predeterminada = false WHERE tipo = $1
          `, [tipo]);
        }

        const result = await pool.query(`
          INSERT INTO impresoras (nombre, tipo, nombre_sistema, descripcion, activa, es_predeterminada, ancho_papel)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          nombre,
          tipo,
          nombre_sistema || null,
          descripcion || null,
          activa !== undefined ? activa : true,
          es_predeterminada || false,
          ancho_papel || 80
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('Error al crear impresora:', error);
        throw new GraphQLError('Error al crear impresora', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Actualiza una impresora existente
     */
    actualizarImpresora: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const { nombre, tipo, nombre_sistema, descripcion, activa, es_predeterminada, ancho_papel } = input;

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (nombre !== undefined) {
          params.push(nombre);
          updates.push(`nombre = $${paramCount++}`);
        }
        if (tipo !== undefined) {
          params.push(tipo);
          updates.push(`tipo = $${paramCount++}`);
        }
        if (nombre_sistema !== undefined) {
          params.push(nombre_sistema);
          updates.push(`nombre_sistema = $${paramCount++}`);
        }
        if (descripcion !== undefined) {
          params.push(descripcion);
          updates.push(`descripcion = $${paramCount++}`);
        }
        if (activa !== undefined) {
          params.push(activa);
          updates.push(`activa = $${paramCount++}`);
        }
        if (ancho_papel !== undefined) {
          params.push(ancho_papel);
          updates.push(`ancho_papel = $${paramCount++}`);
        }

        if (updates.length === 0 && es_predeterminada === undefined) {
          throw new GraphQLError('No se proporcionaron campos para actualizar', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        // Si se marca como predeterminada, desmarcar otras del mismo tipo
        if (es_predeterminada) {
          const tipoResult = await pool.query('SELECT tipo FROM impresoras WHERE id = $1', [id]);
          if (tipoResult.rows.length > 0) {
            await pool.query(`
              UPDATE impresoras SET es_predeterminada = false WHERE tipo = $1 AND id != $2
            `, [tipoResult.rows[0].tipo, id]);
          }
          params.push(es_predeterminada);
          updates.push(`es_predeterminada = $${paramCount++}`);
        } else if (es_predeterminada === false) {
          params.push(false);
          updates.push(`es_predeterminada = $${paramCount++}`);
        }

        params.push(id);
        const query = `
          UPDATE impresoras
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
          throw new GraphQLError('Impresora no encontrada', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al actualizar impresora:', error);
        throw error;
      }
    },

    /**
     * Elimina una impresora (delete real, no soft delete)
     */
    eliminarImpresora: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        const result = await pool.query(
          'DELETE FROM impresoras WHERE id = $1 RETURNING id',
          [id]
        );

        return result.rows.length > 0;
      } catch (error) {
        console.error('Error al eliminar impresora:', error);
        throw new GraphQLError('Error al eliminar impresora', {
          extensions: { code: 'DATABASE_ERROR', details: error.message }
        });
      }
    },

    /**
     * Establece una impresora como predeterminada para su tipo
     */
    establecerImpresoraPredeterminada: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new GraphQLError('No autenticado', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      try {
        // Obtener tipo de la impresora
        const tipoResult = await pool.query('SELECT tipo FROM impresoras WHERE id = $1', [id]);
        if (tipoResult.rows.length === 0) {
          throw new GraphQLError('Impresora no encontrada', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        const tipo = tipoResult.rows[0].tipo;

        // Desmarcar todas del mismo tipo
        await pool.query(`
          UPDATE impresoras SET es_predeterminada = false WHERE tipo = $1
        `, [tipo]);

        // Marcar la seleccionada
        const result = await pool.query(`
          UPDATE impresoras SET es_predeterminada = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [id]);

        return result.rows[0];
      } catch (error) {
        console.error('Error al establecer impresora predeterminada:', error);
        throw error;
      }
    },
  },
};

module.exports = impresorasResolvers;
