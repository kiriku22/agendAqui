/**
 * Resolvers para el módulo TRA (Tarjeta de Registro de Alojamiento)
 * MinCIT Colombia - Ley 2068 de 2020
 *
 * Incluye: configuración TRA, envío de reportes, prueba de conexión
 */

const TRAService = require('../services/TRAService');

// Función auxiliar para validar permisos de admin
function verificarAdmin(user, mensaje = 'Solo administradores pueden realizar esta acción') {
  if (!user || user.rol !== 'admin') {
    throw new Error(mensaje);
  }
}

const traResolvers = {
  Query: {
    // ============================================================================
    // CONFIGURACIÓN TRA
    // ============================================================================

    /**
     * Obtener configuración actual de TRA
     * Solo accesible por admin
     */
    configuracionTRA: async (_, __, { pool, user }) => {
      verificarAdmin(user);

      const result = await pool.query('SELECT * FROM configuracion_tra WHERE id = 1');

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    },

    // ============================================================================
    // REPORTES TRA
    // ============================================================================

    /**
     * Obtener reportes TRA por hospedaje
     */
    reportesTRAPorHospedaje: async (_, { hospedaje_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      const result = await pool.query(
        `SELECT r.*,
                row_to_json(h.*) as hospedaje_data,
                row_to_json(hu.*) as huesped_data
         FROM reportes_tra r
         LEFT JOIN hospedajes h ON r.hospedaje_id = h.id
         LEFT JOIN huespedes hu ON r.huesped_id = hu.id
         WHERE r.hospedaje_id = $1
         ORDER BY r.created_at DESC`,
        [hospedaje_id]
      );

      return result.rows;
    },

    /**
     * Obtener todos los reportes TRA pendientes o con error
     */
    reportesTRAPendientes: async (_, __, { pool, user }) => {
      verificarAdmin(user);

      const result = await pool.query(
        `SELECT r.*,
                row_to_json(h.*) as hospedaje_data,
                row_to_json(hu.*) as huesped_data
         FROM reportes_tra r
         LEFT JOIN hospedajes h ON r.hospedaje_id = h.id
         LEFT JOIN huespedes hu ON r.huesped_id = hu.id
         WHERE r.estado IN ('pendiente', 'error')
         ORDER BY r.created_at DESC
         LIMIT 100`
      );

      return result.rows;
    },
  },

  Mutation: {
    // ============================================================================
    // CONFIGURACIÓN TRA
    // ============================================================================

    /**
     * Actualizar configuración TRA
     * Patrón dinámico igual que configuracion.js
     */
    actualizarConfiguracionTRA: async (_, { input }, { pool, user }) => {
      verificarAdmin(user);

      // Construir SET dinámico solo con campos proporcionados
      const campos = [];
      const valores = [];
      let paramIndex = 1;

      const camposPermitidos = [
        'token', 'rnt', 'nombre_establecimiento',
        'tipo_acomodacion', 'endpoint', 'activo'
      ];

      for (const campo of camposPermitidos) {
        if (input[campo] !== undefined) {
          campos.push(`${campo} = $${paramIndex}`);
          valores.push(input[campo]);
          paramIndex++;
        }
      }

      if (campos.length === 0) {
        throw new Error('No se proporcionaron campos para actualizar');
      }

      const query = `
        UPDATE configuracion_tra
        SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `;

      const result = await pool.query(query, valores);

      // Limpiar cache del servicio TRA
      TRAService.clearCache();

      console.log('[TRA] Configuración actualizada por usuario:', user.usuario || user.id);

      return result.rows[0];
    },

    /**
     * Probar conexión con la API TRA de MinCIT
     */
    probarConexionTRA: async (_, __, { user }) => {
      verificarAdmin(user);

      const resultado = await TRAService.probarConexion();
      return resultado;
    },

    // ============================================================================
    // ENVÍO DE REPORTES TRA
    // ============================================================================

    /**
     * Enviar reporte TRA manualmente para un hospedaje
     */
    enviarTRA: async (_, { hospedaje_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      // 1. Obtener hospedaje con número de habitación (necesario para payload TRA)
      const hospedajeResult = await pool.query(
        `SELECT ho.*, hab.numero as habitacion_numero
         FROM hospedajes ho
         LEFT JOIN habitaciones hab ON ho.habitacion_id = hab.id
         WHERE ho.id = $1`,
        [hospedaje_id]
      );

      if (hospedajeResult.rows.length === 0) {
        throw new Error('Hospedaje no encontrado');
      }

      const hospedaje = hospedajeResult.rows[0];

      // 2. Obtener datos del huésped (nombre y apellido separados para API TRA)
      const huespedResult = await pool.query(
        `SELECT h.*, CONCAT(h.nombre, ' ', COALESCE(h.apellido, '')) as nombre_completo
         FROM huespedes h WHERE h.id = $1`,
        [hospedaje.huesped_id]
      );

      if (huespedResult.rows.length === 0) {
        throw new Error('Huésped no encontrado');
      }

      const huesped = huespedResult.rows[0];

      // 3. Parsear acompañantes del JSONB
      let acompanantes = [];
      try {
        acompanantes = typeof hospedaje.acompanantes === 'string'
          ? JSON.parse(hospedaje.acompanantes)
          : (hospedaje.acompanantes || []);
      } catch {
        acompanantes = [];
      }

      // 4. Crear o actualizar registro de reporte
      const reporteExistente = await pool.query(
        'SELECT id FROM reportes_tra WHERE hospedaje_id = $1 AND huesped_id = $2',
        [hospedaje_id, huesped.id]
      );

      let reporteId;
      if (reporteExistente.rows.length > 0) {
        reporteId = reporteExistente.rows[0].id;
      } else {
        const nuevoReporte = await pool.query(
          `INSERT INTO reportes_tra (hospedaje_id, huesped_id, estado, enviado_por)
           VALUES ($1, $2, 'pendiente', $3)
           RETURNING id`,
          [hospedaje_id, huesped.id, user.id]
        );
        reporteId = nuevoReporte.rows[0].id;
      }

      // 5. Intentar envío (flujo dos pasos: /one/ principal, /two/ acompañantes)
      try {
        const resultado = await TRAService.enviarRegistro(hospedaje, huesped, acompanantes);

        // 6. Actualizar reporte como exitoso
        const config = await TRAService.getConfig();
        const payloadPrincipal = TRAService.construirPayloadPrincipal(
          hospedaje, huesped, acompanantes.length, config
        );

        await pool.query(
          `UPDATE reportes_tra
           SET estado = 'enviado',
               fecha_envio = CURRENT_TIMESTAMP,
               codigo_confirmacion = $1,
               code_principal = $2,
               respuesta_api = $3,
               datos_enviados = $4,
               intentos = intentos + 1,
               errores = NULL,
               enviado_por = $5
           WHERE id = $6`,
          [
            String(resultado.code_principal || ''),
            resultado.code_principal,
            JSON.stringify(resultado),
            JSON.stringify(payloadPrincipal),
            user.id,
            reporteId,
          ]
        );

        // Actualizar estado TRA en hospedaje
        await pool.query(
          `UPDATE hospedajes SET tra_estado = 'enviado' WHERE id = $1`,
          [hospedaje_id]
        );

        const reporteActualizado = await pool.query(
          'SELECT * FROM reportes_tra WHERE id = $1',
          [reporteId]
        );

        return reporteActualizado.rows[0];
      } catch (error) {
        // 6b. Actualizar reporte como error
        const config = await TRAService.getConfig().catch(() => ({}));
        let payloadPrincipal = {};
        try {
          payloadPrincipal = TRAService.construirPayloadPrincipal(
            hospedaje, huesped, acompanantes.length, config
          );
        } catch { /* ignore */ }

        await pool.query(
          `UPDATE reportes_tra
           SET estado = 'error',
               errores = $1,
               datos_enviados = $2,
               intentos = intentos + 1,
               enviado_por = $3
           WHERE id = $4`,
          [error.message, JSON.stringify(payloadPrincipal), user.id, reporteId]
        );

        // Actualizar estado TRA en hospedaje
        await pool.query(
          `UPDATE hospedajes SET tra_estado = 'error' WHERE id = $1`,
          [hospedaje_id]
        );

        const reporteActualizado = await pool.query(
          'SELECT * FROM reportes_tra WHERE id = $1',
          [reporteId]
        );

        return reporteActualizado.rows[0];
      }
    },

    /**
     * Reintentar envío de un reporte TRA fallido
     */
    reintentarTRA: async (_, { reporte_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      // Obtener reporte existente
      const reporteResult = await pool.query(
        'SELECT * FROM reportes_tra WHERE id = $1',
        [reporte_id]
      );

      if (reporteResult.rows.length === 0) {
        throw new Error('Reporte TRA no encontrado');
      }

      const reporte = reporteResult.rows[0];

      if (reporte.estado === 'enviado') {
        throw new Error('Este reporte ya fue enviado exitosamente');
      }

      // Obtener datos del hospedaje con número de habitación
      const hospedajeResult = await pool.query(
        `SELECT ho.*, hab.numero as habitacion_numero
         FROM hospedajes ho
         LEFT JOIN habitaciones hab ON ho.habitacion_id = hab.id
         WHERE ho.id = $1`,
        [reporte.hospedaje_id]
      );

      const hospedaje = hospedajeResult.rows[0];

      // Obtener datos del huésped
      const huespedResult = await pool.query(
        `SELECT h.*, CONCAT(h.nombre, ' ', COALESCE(h.apellido, '')) as nombre_completo
         FROM huespedes h WHERE h.id = $1`,
        [reporte.huesped_id]
      );

      const huesped = huespedResult.rows[0];

      // Parsear acompañantes
      let acompanantes = [];
      try {
        acompanantes = typeof hospedaje.acompanantes === 'string'
          ? JSON.parse(hospedaje.acompanantes)
          : (hospedaje.acompanantes || []);
      } catch {
        acompanantes = [];
      }

      // Intentar envío (flujo dos pasos)
      try {
        const resultado = await TRAService.enviarRegistro(hospedaje, huesped, acompanantes);

        const config = await TRAService.getConfig();
        const payloadPrincipal = TRAService.construirPayloadPrincipal(
          hospedaje, huesped, acompanantes.length, config
        );

        await pool.query(
          `UPDATE reportes_tra
           SET estado = 'enviado',
               fecha_envio = CURRENT_TIMESTAMP,
               codigo_confirmacion = $1,
               code_principal = $2,
               respuesta_api = $3,
               datos_enviados = $4,
               intentos = intentos + 1,
               errores = NULL,
               enviado_por = $5
           WHERE id = $6`,
          [
            String(resultado.code_principal || ''),
            resultado.code_principal,
            JSON.stringify(resultado),
            JSON.stringify(payloadPrincipal),
            user.id,
            reporte_id,
          ]
        );

        await pool.query(
          `UPDATE hospedajes SET tra_estado = 'enviado' WHERE id = $1`,
          [reporte.hospedaje_id]
        );

        const reporteActualizado = await pool.query(
          'SELECT * FROM reportes_tra WHERE id = $1',
          [reporte_id]
        );

        return reporteActualizado.rows[0];
      } catch (error) {
        await pool.query(
          `UPDATE reportes_tra
           SET estado = 'error',
               errores = $1,
               intentos = intentos + 1,
               enviado_por = $2
           WHERE id = $3`,
          [error.message, user.id, reporte_id]
        );

        await pool.query(
          `UPDATE hospedajes SET tra_estado = 'error' WHERE id = $1`,
          [reporte.hospedaje_id]
        );

        const reporteActualizado = await pool.query(
          'SELECT * FROM reportes_tra WHERE id = $1',
          [reporte_id]
        );

        return reporteActualizado.rows[0];
      }
    },
  },

  // ============================================================================
  // TYPE RESOLVERS
  // ============================================================================

  ReporteTRA: {
    hospedaje: async (parent, _, { pool }) => {
      if (parent.hospedaje_data) return parent.hospedaje_data;
      const result = await pool.query(
        'SELECT * FROM hospedajes WHERE id = $1',
        [parent.hospedaje_id]
      );
      return result.rows[0] || null;
    },
    huesped: async (parent, _, { pool }) => {
      if (parent.huesped_data) return parent.huesped_data;
      const result = await pool.query(
        `SELECT h.*, CONCAT(h.nombre, ' ', COALESCE(h.apellido, '')) as nombre_completo
         FROM huespedes h WHERE h.id = $1`,
        [parent.huesped_id]
      );
      return result.rows[0] || null;
    },
  },
};

module.exports = traResolvers;
