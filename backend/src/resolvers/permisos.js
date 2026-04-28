/**
 * Resolver de Permisos - Sistema de gestión de permisos por rol y usuario
 *
 * Lógica de permisos efectivos:
 * Permisos efectivos = (Permisos del rol) + (Agregados al usuario) - (Quitados al usuario)
 */

const permisosResolvers = {
  Query: {
    /**
     * Obtener catálogo de permisos
     */
    permisos: async (_, { modulo, activo }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      try {
        let query = 'SELECT * FROM permisos WHERE 1=1';
        const params = [];

        if (modulo) {
          params.push(modulo);
          query += ` AND modulo = $${params.length}`;
        }

        if (activo !== undefined && activo !== null) {
          params.push(activo);
          query += ` AND activo = $${params.length}`;
        }

        query += ' ORDER BY modulo, orden, nombre';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en permisos query:', error);
        throw new Error('Error al obtener permisos');
      }
    },

    /**
     * Obtener permisos de un rol agrupados por módulo
     */
    permisosRolAgrupados: async (_, { rol }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      try {
        const result = await pool.query(`
          SELECT
            p.id, p.codigo, p.nombre, p.descripcion, p.modulo, p.categoria,
            CASE WHEN rp.id IS NOT NULL THEN true ELSE false END as asignado
          FROM permisos p
          LEFT JOIN rol_permisos rp ON rp.permiso_id = p.id AND rp.rol = $1
          WHERE p.activo = true
          ORDER BY p.modulo, p.orden, p.nombre
        `, [rol]);

        // Agrupar por módulo
        const grupos = {};
        for (const row of result.rows) {
          if (!grupos[row.modulo]) {
            grupos[row.modulo] = {
              modulo: row.modulo,
              permisos: []
            };
          }
          grupos[row.modulo].permisos.push({
            id: row.id,
            codigo: row.codigo,
            nombre: row.nombre,
            descripcion: row.descripcion,
            modulo: row.modulo,
            categoria: row.categoria,
            asignado: row.asignado,
            origen: row.asignado ? 'rol' : 'sin_permiso',
            editable: rol !== 'admin' // Admin no es editable
          });
        }

        return Object.values(grupos);
      } catch (error) {
        console.error('Error en permisosRolAgrupados query:', error);
        throw new Error('Error al obtener permisos del rol agrupados');
      }
    },

    /**
     * Obtener permisos de usuario con indicador de herencia
     */
    permisosUsuarioAgrupados: async (_, { usuario_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      if (user.rol !== 'admin') throw new Error('No autorizado');

      try {
        const result = await pool.query(`
          SELECT
            p.id, p.codigo, p.nombre, p.descripcion, p.modulo, p.categoria,
            vpe.tiene_permiso, vpe.origen
          FROM permisos p
          JOIN v_permisos_efectivos vpe ON vpe.permiso_id = p.id AND vpe.usuario_id = $1
          WHERE p.activo = true
          ORDER BY p.modulo, p.orden, p.nombre
        `, [usuario_id]);

        // Agrupar por módulo
        const grupos = {};
        for (const row of result.rows) {
          if (!grupos[row.modulo]) {
            grupos[row.modulo] = {
              modulo: row.modulo,
              permisos: []
            };
          }
          grupos[row.modulo].permisos.push({
            id: row.id,
            codigo: row.codigo,
            nombre: row.nombre,
            descripcion: row.descripcion,
            modulo: row.modulo,
            categoria: row.categoria,
            asignado: row.tiene_permiso,
            origen: row.origen,
            editable: true // Siempre editable para usuarios
          });
        }

        return Object.values(grupos);
      } catch (error) {
        console.error('Error en permisosUsuarioAgrupados query:', error);
        throw new Error('Error al obtener permisos del usuario agrupados');
      }
    },

    /**
     * Verificar si el usuario actual tiene un permiso específico
     */
    tienePermiso: async (_, { codigo }, { pool, user }) => {
      if (!user) return false;

      // Admin siempre tiene todos los permisos
      if (user.rol === 'admin') return true;

      try {
        const result = await pool.query(
          'SELECT tiene_permiso($1, $2) as tiene',
          [user.id, codigo]
        );
        return result.rows[0]?.tiene || false;
      } catch (error) {
        console.error('Error en tienePermiso query:', error);
        return false;
      }
    }
  },

  Mutation: {
    /**
     * Asignar permisos a un rol (reemplaza los existentes)
     */
    asignarPermisosRol: async (_, { rol, permisos_ids }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      if (user.rol !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden gestionar permisos de rol.');
      }

      // No permitir modificar permisos del rol admin
      if (rol === 'admin') {
        throw new Error('No se pueden modificar los permisos del rol administrador.');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Eliminar permisos actuales del rol
        await client.query('DELETE FROM rol_permisos WHERE rol = $1', [rol]);

        // Insertar nuevos permisos
        for (const permiso_id of permisos_ids) {
          await client.query(`
            INSERT INTO rol_permisos (rol, permiso_id)
            VALUES ($1, $2)
          `, [rol, permiso_id]);
        }

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en asignarPermisosRol mutation:', error);
        throw new Error('Error al asignar permisos al rol');
      } finally {
        client.release();
      }
    },

    /**
     * Asignar permiso específico a un usuario
     */
    asignarPermisoUsuario: async (_, { usuario_id, permiso_id, tipo_asignacion, motivo }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      if (user.rol !== 'admin') {
        throw new Error('No autorizado');
      }

      try {
        await pool.query(`
          INSERT INTO usuario_permisos (usuario_id, permiso_id, tipo_asignacion, motivo, asignado_por)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (usuario_id, permiso_id)
          DO UPDATE SET
            tipo_asignacion = EXCLUDED.tipo_asignacion,
            motivo = EXCLUDED.motivo,
            asignado_por = EXCLUDED.asignado_por
        `, [usuario_id, permiso_id, tipo_asignacion, motivo, user.id]);

        return true;
      } catch (error) {
        console.error('Error en asignarPermisoUsuario mutation:', error);
        throw new Error('Error al asignar permiso al usuario');
      }
    },

    /**
     * Quitar permiso específico de un usuario (elimina la excepción)
     */
    quitarPermisoUsuario: async (_, { usuario_id, permiso_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      if (user.rol !== 'admin') {
        throw new Error('No autorizado');
      }

      try {
        const result = await pool.query(`
          DELETE FROM usuario_permisos
          WHERE usuario_id = $1 AND permiso_id = $2
        `, [usuario_id, permiso_id]);

        return result.rowCount > 0;
      } catch (error) {
        console.error('Error en quitarPermisoUsuario mutation:', error);
        throw new Error('Error al quitar permiso del usuario');
      }
    }
  },

  // Field resolvers
  Usuario: {
    permisos_efectivos: async (parent, _, { pool }) => {
      try {
        // Admin tiene todos los permisos
        if (parent.rol === 'admin') {
          const result = await pool.query(
            'SELECT codigo FROM permisos WHERE activo = true ORDER BY codigo'
          );
          return result.rows.map(r => r.codigo);
        }

        const result = await pool.query(
          `SELECT codigo FROM obtener_permisos_usuario($1)`,
          [parent.id]
        );
        return result.rows.map(r => r.codigo);
      } catch (error) {
        console.error('Error obteniendo permisos del usuario:', error);
        return [];
      }
    }
  }
};

module.exports = permisosResolvers;
