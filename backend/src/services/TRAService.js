/**
 * TRAService - Integración con API TRA (Tarjeta de Registro de Alojamiento)
 * MinCIT Colombia - Resolución 409 de 2022
 *
 * API Real (Manual de Integración PMS Resolución 409):
 * - POST /one/ → Huésped principal → retorna { "code": N }
 * - POST /two/ → Huésped secundario/acompañante → usa "padre": N
 * - Auth: header "Authorization: token xxxxx"
 * - Token se obtiene de https://pms.mincit.gov.co/token/ con el RNT
 *
 * Modelo: Factufy es un PMS. Cada hotel-cliente configura su propio RNT + TOKEN.
 *
 * @module TRAService
 * @version 2.0.0
 */

const axios = require('axios');
const pool = require('../config/database');

class TRAService {
  constructor() {
    this.config = null;
  }

  // ===========================================================================
  // CONFIGURACIÓN
  // ===========================================================================

  /**
   * Obtener configuración TRA desde la base de datos (cacheada)
   */
  async getConfig() {
    if (this.config) {
      return this.config;
    }

    const result = await pool.query(
      'SELECT * FROM configuracion_tra WHERE id = 1'
    );

    if (result.rows.length === 0) {
      throw new Error('Configuración TRA no encontrada.');
    }

    this.config = result.rows[0];
    return this.config;
  }

  /**
   * Limpiar cache de configuración
   */
  clearCache() {
    this.config = null;
    console.log('[TRA] Cache de configuración limpiado');
  }

  /**
   * Verificar si TRA está activo y configurado
   */
  async isActivo() {
    try {
      const config = await this.getConfig();
      return config.activo && config.token && config.rnt;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // MAPEO DE DATOS (según Manual Resolución 409)
  // ===========================================================================

  /**
   * Mapear tipo de documento Factufy → formato API TRA MinCIT
   * Según el manual: "C.C", "Pasaporte", etc.
   */
  mapearTipoDocumento(tipoDocumento) {
    const mapeo = {
      'CC': 'C.C',              // Cédula de Ciudadanía
      'CE': 'C.E',              // Cédula de Extranjería
      'TI': 'T.I',              // Tarjeta de Identidad
      'NIT': 'NIT',             // NIT
      'Pasaporte': 'Pasaporte', // Pasaporte
      'Otro': 'Otro',           // Otro
    };
    return mapeo[tipoDocumento] || 'Otro';
  }

  /**
   * Formatear fecha a YYYY-MM-DD (formato requerido por TRA)
   */
  formatearFecha(fecha) {
    if (!fecha) return null;
    const d = new Date(fecha);
    return d.toISOString().split('T')[0];
  }

  // ===========================================================================
  // CONSTRUCCIÓN DE PAYLOADS (según Manual Resolución 409)
  // ===========================================================================

  /**
   * Construir payload para huésped PRINCIPAL → POST /one/
   *
   * NOTA: Los campos "cuidad_residencia" y "cuidad_procedencia" tienen un typo
   * intencional de la API del MinCIT ("cuidad" en vez de "ciudad").
   * Se deben enviar exactamente así.
   *
   * NOTA: "costo" y "numero_acompanantes" son STRINGS según la documentación.
   */
  construirPayloadPrincipal(hospedaje, huesped, numAcompanantes, config) {
    const costo = hospedaje.costo_alojamiento_tra ||
      Math.round(parseFloat(hospedaje.noches_previstas || 1) * parseFloat(hospedaje.precio_noche || 0));

    return {
      tipo_identificacion: this.mapearTipoDocumento(huesped.tipo_documento),
      numero_identificacion: huesped.numero_documento,
      nombres: huesped.nombre || '',
      apellidos: huesped.apellido || '',
      cuidad_residencia: huesped.lugar_residencia || '',     // Typo intencional de la API
      cuidad_procedencia: huesped.lugar_procedencia || '',   // Typo intencional de la API
      numero_habitacion: String(hospedaje.habitacion_numero || ''),
      motivo: huesped.motivo_viaje || 'Turismo',
      numero_acompanantes: String(numAcompanantes || 0),     // String según API
      check_in: this.formatearFecha(hospedaje.fecha_entrada),
      check_out: this.formatearFecha(hospedaje.fecha_salida_prevista),
      tipo_acomodacion: config.tipo_acomodacion || 'Hotel',
      costo: String(costo),                                  // String según API
      nombre_establecimiento: config.nombre_establecimiento || '',
      rnt_establecimiento: config.rnt,
    };
  }

  /**
   * Construir payload para huésped SECUNDARIO/acompañante → POST /two/
   *
   * Requiere el "code" retornado por /one/ como campo "padre".
   */
  construirPayloadSecundario(acompanante, hospedaje, codePrincipal) {
    return {
      tipo_identificacion: this.mapearTipoDocumento(acompanante.tipo_documento || 'Otro'),
      numero_identificacion: acompanante.numero_documento || '',
      nombres: acompanante.nombre || acompanante.nombres || '',
      apellidos: acompanante.apellido || acompanante.apellidos || '',
      cuidad_residencia: acompanante.lugar_residencia || acompanante.cuidad_residencia || '',
      cuidad_procedencia: acompanante.lugar_procedencia || acompanante.cuidad_procedencia || '',
      numero_habitacion: String(hospedaje.habitacion_numero || ''),
      check_in: this.formatearFecha(hospedaje.fecha_entrada),
      check_out: this.formatearFecha(hospedaje.fecha_salida_prevista),
      padre: codePrincipal,  // ID del huésped principal retornado por /one/
    };
  }

  // ===========================================================================
  // ENVÍO A MinCIT (Flujo de dos pasos según Resolución 409)
  // ===========================================================================

  /**
   * Enviar registro TRA completo al MinCIT
   *
   * Flujo:
   * 1. POST /one/ → Huésped principal → retorna { "code": N }
   * 2. POST /two/ → Cada acompañante con "padre": N
   *
   * @param {Object} hospedaje - Datos del hospedaje (debe incluir habitacion_numero)
   * @param {Object} huesped - Datos del huésped principal
   * @param {Array} acompanantes - Lista de acompañantes (del JSONB hospedaje.acompanantes)
   * @returns {Promise<Object>} { success, code_principal, acompanantes_results }
   */
  async enviarRegistro(hospedaje, huesped, acompanantes = []) {
    const config = await this.getConfig();

    if (!config.activo) {
      throw new Error('TRA no está activo. Active la integración TRA primero.');
    }

    if (!config.token || !config.rnt) {
      throw new Error('TRA no está configurado correctamente. Verifique TOKEN y RNT.');
    }

    if (!config.nombre_establecimiento) {
      throw new Error('Falta el nombre del establecimiento en la configuración TRA.');
    }

    const headers = {
      'Authorization': `token ${config.token}`,  // Minúscula según manual
      'Content-Type': 'application/json',
    };

    // =====================================================================
    // PASO 1: Enviar huésped principal a /one/
    // =====================================================================
    const payloadPrincipal = this.construirPayloadPrincipal(
      hospedaje, huesped, acompanantes.length, config
    );

    console.log('[TRA] PASO 1: Enviando huésped principal a /one/');
    console.log('[TRA] Documento:', huesped.numero_documento);
    console.log('[TRA] Payload:', JSON.stringify(payloadPrincipal, null, 2));

    const responsePrincipal = await axios.post(
      `${config.endpoint}/one/`,
      payloadPrincipal,
      { headers, timeout: 30000 }
    );

    const codePrincipal = responsePrincipal.data?.code;
    console.log('[TRA] Respuesta /one/ - code:', codePrincipal);

    if (!codePrincipal && codePrincipal !== 0) {
      console.warn('[TRA] Advertencia: /one/ no retornó "code" en la respuesta');
    }

    // =====================================================================
    // PASO 2: Enviar cada acompañante a /two/ (si hay code y acompañantes)
    // =====================================================================
    const acompanantesResults = [];

    if (codePrincipal != null && acompanantes.length > 0) {
      console.log(`[TRA] PASO 2: Enviando ${acompanantes.length} acompañante(s) a /two/`);

      for (let i = 0; i < acompanantes.length; i++) {
        const acomp = acompanantes[i];
        try {
          const payloadSec = this.construirPayloadSecundario(acomp, hospedaje, codePrincipal);
          console.log(`[TRA] Acompañante ${i + 1}:`, JSON.stringify(payloadSec, null, 2));

          const resSec = await axios.post(
            `${config.endpoint}/two/`,
            payloadSec,
            { headers, timeout: 30000 }
          );

          acompanantesResults.push({
            index: i,
            success: true,
            code: resSec.data?.code,
            nombre: acomp.nombre || acomp.nombres || `Acompañante ${i + 1}`,
          });
          console.log(`[TRA] Acompañante ${i + 1} enviado - code:`, resSec.data?.code);
        } catch (err) {
          console.error(`[TRA] Error acompañante ${i + 1}:`, err.message);
          acompanantesResults.push({
            index: i,
            success: false,
            error: err.response?.data?.message || err.message,
            nombre: acomp.nombre || acomp.nombres || `Acompañante ${i + 1}`,
          });
          // Continuar con los demás acompañantes aunque uno falle
        }
      }
    }

    // Actualizar estadísticas de envío exitoso
    await pool.query(
      `UPDATE configuracion_tra
       SET ultimo_envio_exitoso = CURRENT_TIMESTAMP,
           total_envios_exitosos = total_envios_exitosos + 1
       WHERE id = 1`
    );
    this.clearCache();

    return {
      success: true,
      code_principal: codePrincipal,
      status: responsePrincipal.status,
      data: responsePrincipal.data,
      acompanantes_results: acompanantesResults,
    };
  }

  // ===========================================================================
  // PRUEBA DE CONEXIÓN
  // ===========================================================================

  /**
   * Probar conexión con la API TRA
   *
   * NOTA: El Manual Resolución 409 no documenta un endpoint de validación.
   * Solo existen /one/ y /two/. Esta prueba verifica:
   * 1. Que los campos requeridos estén configurados
   * 2. Que el endpoint sea alcanzable
   */
  async probarConexion() {
    const config = await this.getConfig();

    if (!config.token) {
      return {
        success: false,
        message: 'No hay TOKEN configurado. Obtenga uno en pms.mincit.gov.co/token/',
      };
    }

    if (!config.rnt) {
      return {
        success: false,
        message: 'No hay RNT configurado. Ingrese su Registro Nacional de Turismo.',
      };
    }

    if (!config.nombre_establecimiento) {
      return {
        success: false,
        message: 'Falta el nombre del establecimiento. Configúrelo antes de continuar.',
      };
    }

    try {
      // Verificar que el endpoint sea alcanzable (HEAD request al dominio)
      await axios.head(config.endpoint, { timeout: 10000 });

      return {
        success: true,
        message: `Conexión verificada con ${config.endpoint}. RNT: ${config.rnt}. La validación completa del TOKEN solo se puede hacer con un envío real.`,
        data: {
          endpoint: config.endpoint,
          rnt: config.rnt,
          nombre_establecimiento: config.nombre_establecimiento,
          tipo_acomodacion: config.tipo_acomodacion,
        },
      };
    } catch (error) {
      const statusCode = error.response?.status;
      let message = 'Error de conexión con MinCIT';

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        message = 'No se puede conectar al servidor de MinCIT. Verifique su conexión a internet y el endpoint.';
      } else if (statusCode) {
        // Cualquier respuesta HTTP del servidor significa que es alcanzable
        return {
          success: true,
          message: `Servidor alcanzable (HTTP ${statusCode}). RNT: ${config.rnt}. La validación del TOKEN requiere un envío real.`,
          data: { endpoint: config.endpoint, rnt: config.rnt },
        };
      } else {
        message = error.message;
      }

      return {
        success: false,
        message,
        status: statusCode,
      };
    }
  }
}

module.exports = new TRAService();
