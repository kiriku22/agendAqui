/**
 * Resolvers para Sistema de Licencias
 *
 * Maneja la activacion y consulta del estado de licencia.
 * Los datos del comercio (NIT, nombre, razon_social) se obtienen de datos_hotel.
 *
 * Basado en: docs/GUIA_IMPLEMENTACION_LICENCIAS.md
 */

const {
  obtenerEstadoLicencia,
  calcularDiasRestantes,
  esPermanente,
  validarFormatoCodigo,
  TIPO_LICENCIA_NOMBRES
} = require('../services/licenseValidator');

const { obtenerModulosConEstado } = require('../config/modulos');

// ============================================================================
// QUERIES
// ============================================================================

const Query = {
  /**
   * Obtiene el estado actual de la licencia del sistema
   * Combina datos de configuracion_licencia + datos_hotel
   */
  licenciaSistema: async (_, __, { pool }) => {
    try {
      // Obtener datos de licencia
      const licenciaResult = await pool.query(`
        SELECT
          cl.codigo_licencia,
          cl.huella_licencia,
          cl.tipo_licencia,
          cl.estado_licencia,
          cl.fecha_activacion,
          cl.fecha_vencimiento_licencia,
          cl.dias_gracia,
          cl.modulos,
          cl.modulos_version,
          cl.created_at,
          cl.updated_at
        FROM configuracion_licencia cl
        WHERE cl.id = 1
      `);

      // Obtener datos del comercio desde datos_hotel
      const hotelResult = await pool.query(`
        SELECT
          nit,
          nombre_comercial,
          razon_social,
          ciudad
        FROM datos_hotel
        LIMIT 1
      `);

      const licenciaData = licenciaResult.rows[0] || {
        estado_licencia: 'sin_activar',
        dias_gracia: 15
      };
      const hotelData = hotelResult.rows[0] || {};

      // Calcular estado usando el servicio
      const estadoLicencia = obtenerEstadoLicencia(licenciaData);

      // Calcular dias restantes
      let diasRestantes = null;
      let enGracia = false;

      if (licenciaData.fecha_vencimiento_licencia && !esPermanente(licenciaData.tipo_licencia)) {
        diasRestantes = calcularDiasRestantes(licenciaData.fecha_vencimiento_licencia);
        enGracia = diasRestantes !== null &&
                   diasRestantes <= 0 &&
                   diasRestantes > -(licenciaData.dias_gracia || 15);
      }

      // Formatear fecha
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      return {
        codigo_licencia: licenciaData.codigo_licencia,
        huella_licencia: licenciaData.huella_licencia ? '***PROTEGIDA***' : null,
        tipo_licencia: licenciaData.tipo_licencia,
        tipo_licencia_nombre: TIPO_LICENCIA_NOMBRES[licenciaData.tipo_licencia] || null,
        estado_licencia: estadoLicencia.estado,
        fecha_activacion: formatDate(licenciaData.fecha_activacion),
        fecha_vencimiento: formatDate(licenciaData.fecha_vencimiento_licencia),
        dias_gracia: licenciaData.dias_gracia || 15,
        dias_restantes: diasRestantes,
        en_gracia: enGracia,
        permanente: esPermanente(licenciaData.tipo_licencia),
        // Datos del comercio desde datos_hotel
        nit: hotelData.nit,
        nombre_comercial: hotelData.nombre_comercial,
        razon_social: hotelData.razon_social,
        ciudad: hotelData.ciudad,
        // Estados de acceso
        activa: estadoLicencia.estado === 'activa',
        permitir_acceso: estadoLicencia.permitirAcceso,
        mensaje: estadoLicencia.mensaje,
        mostrar_alerta: estadoLicencia.mostrarAlerta || false,
        tipo_alerta: estadoLicencia.tipoAlerta || null,
        // Modulos
        modulos: licenciaData.modulos || [],
        modulos_version: licenciaData.modulos_version
      };
    } catch (error) {
      console.error('Error en licenciaSistema:', error);
      throw new Error('Error al obtener estado de licencia: ' + error.message);
    }
  },

  /**
   * Obtiene la lista de modulos del sistema con su estado de habilitacion
   * basado en la licencia actual
   */
  modulosDisponibles: async (_, __, { pool }) => {
    try {
      // Obtener modulos de la licencia actual
      const licenciaResult = await pool.query(`
        SELECT modulos
        FROM configuracion_licencia
        WHERE id = 1
      `);

      const modulosLicencia = licenciaResult.rows[0]?.modulos || [];

      // Retornar catalogo de modulos con estado de habilitacion
      return obtenerModulosConEstado(modulosLicencia);

    } catch (error) {
      console.error('Error en modulosDisponibles:', error);
      throw new Error('Error al obtener modulos disponibles: ' + error.message);
    }
  }
};

// ============================================================================
// MUTATIONS
// ============================================================================

const Mutation = {
  /**
   * Activa una licencia con los datos obtenidos del gestor
   *
   * IMPORTANTE: Esta mutation se llama DESPUES de que el frontend
   * haya llamado al API del gestor (/api/v1/activar) y obtenido
   * la huella y demas datos.
   *
   * @param {Object} input - Datos de activacion
   * @param {string} input.codigo - Codigo de 32 caracteres
   * @param {string} input.nit - NIT del comercio
   * @param {string} input.nombre_comercial - Nombre del comercio
   * @param {string} input.razon_social - Razon social
   * @param {string} input.ciudad - Ciudad (opcional)
   * @param {string} input.huella - Huella HMAC-SHA256 del gestor
   * @param {string} input.fecha_vencimiento - Fecha de vencimiento (opcional, null para compra)
   * @param {string} input.tipo_licencia - Tipo de licencia
   * @param {Array<string>} input.modulos - Modulos habilitados
   * @param {string} input.modulos_version - Version de modulos
   */
  activarLicenciaSistema: async (_, { input }, { pool }) => {
    const {
      codigo,
      nit,
      nombre_comercial,
      razon_social,
      ciudad,
      huella,
      fecha_vencimiento,
      tipo_licencia,
      modulos,
      modulos_version
    } = input;

    // Validar campos requeridos
    if (!codigo || !nit || !nombre_comercial || !razon_social || !huella || !tipo_licencia) {
      return {
        success: false,
        mensaje: 'Faltan campos requeridos para la activacion (codigo, nit, nombre_comercial, razon_social, huella, tipo_licencia)',
        licencia: null
      };
    }

    // Validar formato del codigo
    const validacion = validarFormatoCodigo(codigo);
    if (!validacion.valido) {
      return {
        success: false,
        mensaje: validacion.error,
        licencia: null
      };
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Actualizar configuracion_licencia
      const updateLicenciaResult = await client.query(`
        UPDATE configuracion_licencia
        SET
          codigo_licencia = $1,
          huella_licencia = $2,
          tipo_licencia = $3,
          fecha_vencimiento_licencia = $4,
          estado_licencia = 'activa',
          fecha_activacion = CURRENT_DATE,
          dias_gracia = 15,
          modulos = $5,
          modulos_version = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `, [
        codigo.toUpperCase(),
        huella,
        tipo_licencia,
        fecha_vencimiento || null,
        JSON.stringify(modulos || []),
        modulos_version || null
      ]);

      // Si no existe registro, crear uno
      let licenciaData;
      if (updateLicenciaResult.rows.length === 0) {
        const insertResult = await client.query(`
          INSERT INTO configuracion_licencia (
            id, codigo_licencia, huella_licencia, tipo_licencia,
            fecha_vencimiento_licencia, estado_licencia, fecha_activacion,
            dias_gracia, modulos, modulos_version
          ) VALUES (
            1, $1, $2, $3, $4, 'activa', CURRENT_DATE, 15, $5, $6
          )
          RETURNING *
        `, [
          codigo.toUpperCase(),
          huella,
          tipo_licencia,
          fecha_vencimiento || null,
          JSON.stringify(modulos || []),
          modulos_version || null
        ]);
        licenciaData = insertResult.rows[0];
      } else {
        licenciaData = updateLicenciaResult.rows[0];
      }

      // 2. Actualizar datos_hotel con la informacion del comercio
      // Verificar si existe registro en datos_hotel
      const hotelExiste = await client.query('SELECT id FROM datos_hotel LIMIT 1');

      if (hotelExiste.rows.length > 0) {
        // Actualizar datos existentes
        await client.query(`
          UPDATE datos_hotel
          SET
            nit = $1,
            nombre_comercial = $2,
            razon_social = $3,
            ciudad = COALESCE($4, ciudad),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM datos_hotel LIMIT 1)
        `, [nit, nombre_comercial, razon_social, ciudad]);
      } else {
        // Crear registro inicial
        await client.query(`
          INSERT INTO datos_hotel (nit, nombre_comercial, razon_social, ciudad)
          VALUES ($1, $2, $3, $4)
        `, [nit, nombre_comercial, razon_social, ciudad]);
      }

      await client.query('COMMIT');

      console.log(`Licencia activada exitosamente para NIT: ${nit}`);

      // Obtener datos actualizados para retornar
      const estadoLicencia = obtenerEstadoLicencia(licenciaData);

      return {
        success: true,
        mensaje: 'Licencia activada exitosamente',
        licencia: {
          codigo_licencia: licenciaData.codigo_licencia,
          tipo_licencia: licenciaData.tipo_licencia,
          tipo_licencia_nombre: TIPO_LICENCIA_NOMBRES[licenciaData.tipo_licencia],
          estado_licencia: 'activa',
          fecha_activacion: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
          fecha_vencimiento: fecha_vencimiento || null,
          dias_gracia: 15,
          dias_restantes: fecha_vencimiento ? calcularDiasRestantes(fecha_vencimiento) : null,
          en_gracia: false,
          permanente: esPermanente(tipo_licencia),
          nit,
          nombre_comercial,
          razon_social,
          ciudad: ciudad || null,
          activa: true,
          permitir_acceso: true,
          mensaje: 'Licencia activada exitosamente',
          mostrar_alerta: false,
          tipo_alerta: null,
          modulos: modulos || [],
          modulos_version: modulos_version || null
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al activar licencia:', error);
      return {
        success: false,
        mensaje: 'Error al guardar la licencia: ' + error.message,
        licencia: null
      };
    } finally {
      client.release();
    }
  }
};

// ============================================================================
// EXPORTACION
// ============================================================================

const licenciaResolvers = {
  Query,
  Mutation
};

module.exports = licenciaResolvers;
