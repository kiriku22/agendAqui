/**
 * Resolvers para el módulo de Configuración
 * Incluye: datos_hotel, parametros_generales, tipos_habitacion,
 * canales_reserva, notificaciones_config, usuarios
 */

const bcrypt = require('bcrypt');

// Función auxiliar para validar permisos de admin/gerente
function verificarPermisos(user, mensaje = 'No autorizado') {
  if (!user || !['admin', 'gerente'].includes(user.rol)) {
    throw new Error(mensaje);
  }
}

// Función auxiliar para validar permisos de solo admin
function verificarAdmin(user, mensaje = 'Solo administradores pueden realizar esta acción') {
  if (!user || user.rol !== 'admin') {
    throw new Error(mensaje);
  }
}

const configuracionResolvers = {
  Query: {
    // ============================================================================
    // DATOS DEL HOTEL
    // ============================================================================
    datosHotel: async (_, __, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query('SELECT * FROM datos_hotel LIMIT 1');

      if (result.rows.length === 0) {
        throw new Error('No se encontró configuración de datos del hotel');
      }

      return result.rows[0];
    },

    // ============================================================================
    // PARÁMETROS GENERALES
    // ============================================================================
    parametrosGenerales: async (_, __, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query('SELECT * FROM parametros_generales LIMIT 1');

      if (result.rows.length === 0) {
        throw new Error('No se encontró configuración de parámetros generales');
      }

      return result.rows[0];
    },

    // ============================================================================
    // TIPOS DE HABITACIÓN CONFIG
    // ============================================================================
    tiposHabitacionConfig: async (_, { activo }, { pool, user }) => {
      verificarPermisos(user);

      let query = 'SELECT * FROM tipos_habitacion';
      const params = [];

      if (activo !== undefined) {
        query += ' WHERE activo = $1';
        params.push(activo);
      }

      query += ' ORDER BY orden, nombre';

      const result = await pool.query(query, params);
      return result.rows;
    },

    tipoHabitacionConfig: async (_, { codigo }, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query(
        'SELECT * FROM tipos_habitacion WHERE codigo = $1',
        [codigo]
      );

      if (result.rows.length === 0) {
        throw new Error(`Tipo de habitación con código ${codigo} no encontrado`);
      }

      return result.rows[0];
    },

    // ============================================================================
    // CANALES DE RESERVA CONFIG
    // ============================================================================
    canalesReservaConfig: async (_, { activo }, { pool, user }) => {
      verificarPermisos(user);

      let query = 'SELECT * FROM canales_reserva';
      const params = [];

      if (activo !== undefined) {
        query += ' WHERE activo = $1';
        params.push(activo);
      }

      query += ' ORDER BY orden, nombre';

      const result = await pool.query(query, params);
      return result.rows;
    },

    canalReservaConfig: async (_, { codigo }, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query(
        'SELECT * FROM canales_reserva WHERE codigo = $1',
        [codigo]
      );

      if (result.rows.length === 0) {
        throw new Error(`Canal de reserva con código ${codigo} no encontrado`);
      }

      return result.rows[0];
    },

    // ============================================================================
    // NOTIFICACIONES
    // ============================================================================
    notificacionesConfig: async (_, __, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query('SELECT * FROM notificaciones_config LIMIT 1');

      if (result.rows.length === 0) {
        throw new Error('No se encontró configuración de notificaciones');
      }

      // No retornar campos sensibles (passwords)
      const config = result.rows[0];
      delete config.email_password;
      delete config.sms_api_key;
      delete config.sms_api_secret;
      delete config.sms_credenciales;
      delete config.whatsapp_api_key;
      delete config.whatsapp_api_secret;
      delete config.whatsapp_credenciales;

      return config;
    },

    // ============================================================================
    // USUARIOS
    // ============================================================================
    usuarios: async (_, { activo }, { pool, user }) => {
      verificarPermisos(user);

      let query = 'SELECT id, usuario, nombre, apellido, email, rol, telefono, activo, created_at, updated_at FROM usuarios';
      const params = [];

      if (activo !== undefined) {
        query += ' WHERE activo = $1';
        params.push(activo);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    },
  },

  Mutation: {
    // ============================================================================
    // DATOS DEL HOTEL
    // ============================================================================
    actualizarDatosHotel: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const campos = Object.keys(input);
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
      const valores = campos.map(campo => input[campo]);

      const query = `
        UPDATE datos_hotel
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pool.query(query, valores);
      return result.rows[0];
    },

    // ============================================================================
    // PARÁMETROS GENERALES
    // ============================================================================
    actualizarParametrosGenerales: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const campos = Object.keys(input);
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
      const valores = campos.map(campo => input[campo]);

      const query = `
        UPDATE parametros_generales
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pool.query(query, valores);
      return result.rows[0];
    },

    // ============================================================================
    // TIPOS DE HABITACIÓN CONFIG
    // ============================================================================
    crearTipoHabitacionConfig: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const {
        codigo,
        nombre,
        descripcion,
        capacidad_adultos = 2,
        capacidad_ninos = 0,
        precio_base,
        metros_cuadrados,
        comodidades,
        orden = 1,
        activo = true
      } = input;

      if (!codigo || !nombre || precio_base === undefined) {
        throw new Error('Los campos codigo, nombre y precio_base son requeridos');
      }

      const result = await pool.query(`
        INSERT INTO tipos_habitacion (
          codigo, nombre, descripcion, capacidad_adultos, capacidad_ninos,
          precio_base, metros_cuadrados, comodidades, orden, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        codigo, nombre, descripcion, capacidad_adultos, capacidad_ninos,
        precio_base, metros_cuadrados, comodidades, orden, activo
      ]);

      return result.rows[0];
    },

    actualizarTipoHabitacionConfig: async (_, { codigo, input }, { pool, user }) => {
      verificarPermisos(user);

      const campos = Object.keys(input).filter(campo => campo !== 'codigo'); // No permitir cambiar el código
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ');
      const valores = [codigo, ...campos.map(campo => input[campo])];

      const query = `
        UPDATE tipos_habitacion
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE codigo = $1
        RETURNING *
      `;

      const result = await pool.query(query, valores);

      if (result.rows.length === 0) {
        throw new Error(`Tipo de habitación con código ${codigo} no encontrado`);
      }

      return result.rows[0];
    },

    eliminarTipoHabitacionConfig: async (_, { codigo }, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query(
        'DELETE FROM tipos_habitacion WHERE codigo = $1 RETURNING *',
        [codigo]
      );

      if (result.rows.length === 0) {
        throw new Error(`Tipo de habitación con código ${codigo} no encontrado`);
      }

      return true;
    },

    // ============================================================================
    // CANALES DE RESERVA CONFIG
    // ============================================================================
    crearCanalReservaConfig: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const {
        codigo,
        nombre,
        descripcion,
        comision_pct = 0,
        requiere_pago_anticipado = false,
        url_integracion,
        color_identificacion,
        icono,
        orden = 1,
        activo = true
      } = input;

      if (!codigo || !nombre) {
        throw new Error('Los campos codigo y nombre son requeridos');
      }

      const result = await pool.query(`
        INSERT INTO canales_reserva (
          codigo, nombre, descripcion, comision_pct, requiere_pago_anticipado,
          url_integracion, color_identificacion, icono, orden, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        codigo, nombre, descripcion, comision_pct, requiere_pago_anticipado,
        url_integracion, color_identificacion, icono, orden, activo
      ]);

      return result.rows[0];
    },

    actualizarCanalReservaConfig: async (_, { codigo, input }, { pool, user }) => {
      verificarPermisos(user);

      const campos = Object.keys(input).filter(campo => campo !== 'codigo');
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ');
      const valores = [codigo, ...campos.map(campo => input[campo])];

      const query = `
        UPDATE canales_reserva
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE codigo = $1
        RETURNING *
      `;

      const result = await pool.query(query, valores);

      if (result.rows.length === 0) {
        throw new Error(`Canal de reserva con código ${codigo} no encontrado`);
      }

      return result.rows[0];
    },

    eliminarCanalReservaConfig: async (_, { codigo }, { pool, user }) => {
      verificarPermisos(user);

      const result = await pool.query(
        'DELETE FROM canales_reserva WHERE codigo = $1 RETURNING *',
        [codigo]
      );

      if (result.rows.length === 0) {
        throw new Error(`Canal de reserva con código ${codigo} no encontrado`);
      }

      return true;
    },

    // ============================================================================
    // MÉTODOS DE PAGO
    // ============================================================================
    crearMetodoPago: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const { nombre, codigo_dian, tipo, requiere_referencia, icono, orden } = input;

      // Validar que el nombre no esté duplicado
      const nombreExistente = await pool.query(
        'SELECT id FROM metodos_pago WHERE nombre = $1',
        [nombre]
      );

      if (nombreExistente.rows.length > 0) {
        throw new Error(`Ya existe un método de pago con el nombre "${nombre}"`);
      }

      // Determinar el orden si no se proporciona
      let ordenFinal = orden;
      if (!ordenFinal) {
        const maxOrden = await pool.query('SELECT COALESCE(MAX(orden), 0) as max_orden FROM metodos_pago');
        ordenFinal = maxOrden.rows[0].max_orden + 1;
      }

      const result = await pool.query(
        `INSERT INTO metodos_pago (nombre, codigo_dian, tipo, requiere_referencia, icono, orden, activo)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [nombre, codigo_dian, tipo, requiere_referencia || false, icono, ordenFinal]
      );

      return result.rows[0];
    },

    actualizarMetodoPago: async (_, { id, input }, { pool, user }) => {
      verificarPermisos(user);

      const { nombre, codigo_dian, tipo, requiere_referencia, icono, orden, activo } = input;

      // Construir query dinámica con los campos proporcionados
      const campos = [];
      const valores = [];
      let contador = 1;

      if (nombre !== undefined) {
        // Validar que el nombre no esté duplicado
        const nombreExistente = await pool.query(
          'SELECT id FROM metodos_pago WHERE nombre = $1 AND id != $2',
          [nombre, id]
        );
        if (nombreExistente.rows.length > 0) {
          throw new Error(`Ya existe un método de pago con el nombre "${nombre}"`);
        }
        campos.push(`nombre = $${contador}`);
        valores.push(nombre);
        contador++;
      }

      if (codigo_dian !== undefined) {
        campos.push(`codigo_dian = $${contador}`);
        valores.push(codigo_dian);
        contador++;
      }

      if (tipo !== undefined) {
        campos.push(`tipo = $${contador}`);
        valores.push(tipo);
        contador++;
      }

      if (requiere_referencia !== undefined) {
        campos.push(`requiere_referencia = $${contador}`);
        valores.push(requiere_referencia);
        contador++;
      }

      if (icono !== undefined) {
        campos.push(`icono = $${contador}`);
        valores.push(icono);
        contador++;
      }

      if (orden !== undefined) {
        campos.push(`orden = $${contador}`);
        valores.push(orden);
        contador++;
      }

      if (activo !== undefined) {
        campos.push(`activo = $${contador}`);
        valores.push(activo);
        contador++;
      }

      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      valores.push(id);
      const query = `UPDATE metodos_pago SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`;

      const result = await pool.query(query, valores);

      if (result.rows.length === 0) {
        throw new Error(`Método de pago con id ${id} no encontrado`);
      }

      return result.rows[0];
    },

    eliminarMetodoPago: async (_, { id }, { pool, user }) => {
      verificarPermisos(user);

      // Verificar si el método de pago está siendo usado en facturas
      const enUso = await pool.query(
        'SELECT COUNT(*) as count FROM factura_metodos_pago WHERE metodo_pago_id = $1',
        [id]
      );

      if (parseInt(enUso.rows[0].count) > 0) {
        throw new Error('No se puede eliminar este método de pago porque ya ha sido utilizado en facturas. Puede desactivarlo en su lugar.');
      }

      const result = await pool.query(
        'DELETE FROM metodos_pago WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error(`Método de pago con id ${id} no encontrado`);
      }

      return true;
    },

    // ============================================================================
    // NOTIFICACIONES
    // ============================================================================
    actualizarNotificacionesConfig: async (_, { input }, { pool, user }) => {
      verificarPermisos(user);

      const campos = Object.keys(input);
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
      const valores = campos.map(campo => input[campo]);

      const query = `
        UPDATE notificaciones_config
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pool.query(query, valores);

      // No retornar campos sensibles
      const config = result.rows[0];
      delete config.email_password;
      delete config.sms_api_key;
      delete config.sms_api_secret;
      delete config.sms_credenciales;
      delete config.whatsapp_api_key;
      delete config.whatsapp_api_secret;
      delete config.whatsapp_credenciales;

      return config;
    },

    // ============================================================================
    // USUARIOS (solo admin)
    // ============================================================================
    crearUsuario: async (_, { input }, { pool, user }) => {
      verificarAdmin(user);

      const {
        usuario,
        nombre,
        apellido,
        email,
        password,
        pin,
        rol = 'recepcionista',
        telefono,
        activo = true
      } = input;

      if (!usuario) {
        throw new Error('El campo usuario es requerido');
      }

      if (!password && !pin) {
        throw new Error('Debe proporcionar password o PIN');
      }

      // Hash password si existe
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(`
        INSERT INTO usuarios (
          usuario, nombre, apellido, email, password, pin, rol, telefono, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, usuario, nombre, apellido, email, rol, telefono, activo, created_at, updated_at
      `, [
        usuario, nombre, apellido, email, hashedPassword, pin, rol, telefono, activo
      ]);

      return result.rows[0];
    },

    actualizarUsuario: async (_, { id, input }, { pool, user }) => {
      verificarAdmin(user);

      // No permitir actualizar password aquí (usar mutation específica)
      const campos = Object.keys(input).filter(campo => campo !== 'password');
      if (campos.length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      const setClause = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ');
      const valores = [id, ...campos.map(campo => input[campo])];

      const query = `
        UPDATE usuarios
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, usuario, nombre, apellido, email, rol, telefono, activo, created_at, updated_at
      `;

      const result = await pool.query(query, valores);

      if (result.rows.length === 0) {
        throw new Error(`Usuario con id ${id} no encontrado`);
      }

      return result.rows[0];
    },

    cambiarPasswordUsuario: async (_, { id, password }, { pool, user }) => {
      verificarAdmin(user);

      if (!password || password.length < 4) {
        throw new Error('La contraseña debe tener al menos 4 caracteres');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        'UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [hashedPassword, id]
      );

      if (result.rows.length === 0) {
        throw new Error(`Usuario con id ${id} no encontrado`);
      }

      return true;
    },

    desactivarUsuario: async (_, { id }, { pool, user }) => {
      verificarAdmin(user);

      const result = await pool.query(
        'UPDATE usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error(`Usuario con id ${id} no encontrado`);
      }

      return true;
    },
  },
};

module.exports = configuracionResolvers;
