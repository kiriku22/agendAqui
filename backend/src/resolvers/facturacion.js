// ============================================================================
// RESOLVERS - FACTURACIÓN ELECTRÓNICA (FACTUS)
// ============================================================================

const pool = require('../config/database');
// FactusService removido - proyecto universitario (sin facturación electrónica DIAN)
// const FactusService = require('../services/FactusService');

const facturacionResolvers = {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  Query: {
    /**
     * Obtener configuración de Factus (sin exponer credenciales sensibles)
     */
    configuracionFactus: async (_, __, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const result = await pool.query(`
          SELECT
            id,
            endpoint,
            email,
            client_id,
            ambiente,
            email_facturacion,
            activo,
            iva_hospedaje,
            iva_consumos,
            iva_servicios,
            access_token,
            token_expiry,
            created_at,
            updated_at
          FROM configuracion_factus
          ORDER BY id DESC
          LIMIT 1
        `);

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener configuración Factus:', error);
        throw new Error('Error al obtener configuración de Factus');
      }
    },

    /**
     * Obtener rangos de numeración disponibles en Factus
     */
    factusNumberingRanges: async () => {
      throw new Error('Facturación electrónica no disponible en esta versión');
    },

    /**
     * Listar facturas electrónicas
     */
    facturasElectronicas: async (_, { limite = 50, factura_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        let query = `
          SELECT
            fe.*,
            f.numero as factura_numero,
            f.fecha as factura_fecha,
            f.total as factura_total
          FROM facturas_electronicas fe
          LEFT JOIN facturas f ON f.id = fe.factura_id
        `;

        const params = [];

        if (factura_id) {
          query += ` WHERE fe.factura_id = $1`;
          params.push(factura_id);
        }

        query += ` ORDER BY fe.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limite);

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al listar facturas electrónicas:', error);
        throw new Error('Error al listar facturas electrónicas');
      }
    },

    /**
     * Obtener factura electrónica por ID
     */
    facturaElectronica: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const result = await pool.query(
          `SELECT * FROM facturas_electronicas WHERE id = $1`,
          [id]
        );

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener factura electrónica:', error);
        throw new Error('Error al obtener factura electrónica');
      }
    },

    /**
     * Obtener factura electrónica por factura_id
     */
    facturaElectronicaPorFacturaId: async (_, { factura_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const result = await pool.query(
          `SELECT * FROM facturas_electronicas WHERE factura_id = $1`,
          [factura_id]
        );

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener factura electrónica:', error);
        throw new Error('Error al obtener factura electrónica');
      }
    },

    /**
     * Listar notas de crédito
     */
    notasCredito: async (_, { factura_electronica_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        let query = `SELECT * FROM notas_credito`;
        const params = [];

        if (factura_electronica_id) {
          query += ` WHERE factura_electronica_id = $1`;
          params.push(factura_electronica_id);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al listar notas de crédito:', error);
        throw new Error('Error al listar notas de crédito');
      }
    },

    /**
     * Obtener nota de crédito por ID
     */
    notaCredito: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const result = await pool.query(
          `SELECT * FROM notas_credito WHERE id = $1`,
          [id]
        );

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener nota de crédito:', error);
        throw new Error('Error al obtener nota de crédito');
      }
    },
  },

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  Mutation: {
    /**
     * Actualizar configuración de Factus
     */
    actualizarConfiguracionFactus: async (_, { input }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo administradores pueden modificar configuración
      if (user.rol !== 'admin' && user.rol !== 'gerente') {
        throw new Error('No tienes permisos para modificar la configuración de Factus');
      }

      try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Construir query dinámica solo con campos proporcionados
        if (input.endpoint !== undefined) {
          fields.push(`endpoint = $${paramIndex++}`);
          values.push(input.endpoint);
        }

        if (input.email !== undefined) {
          fields.push(`email = $${paramIndex++}`);
          values.push(input.email);
        }

        if (input.password !== undefined) {
          fields.push(`password = $${paramIndex++}`);
          values.push(input.password);
        }

        if (input.client_id !== undefined) {
          fields.push(`client_id = $${paramIndex++}`);
          values.push(input.client_id);
        }

        if (input.client_secret !== undefined) {
          fields.push(`client_secret = $${paramIndex++}`);
          values.push(input.client_secret);
        }

        if (input.ambiente !== undefined) {
          fields.push(`ambiente = $${paramIndex++}`);
          values.push(input.ambiente);
        }

        if (input.email_facturacion !== undefined) {
          fields.push(`email_facturacion = $${paramIndex++}`);
          values.push(input.email_facturacion);
        }

        if (input.activo !== undefined) {
          fields.push(`activo = $${paramIndex++}`);
          values.push(input.activo);
        }

        if (input.iva_hospedaje !== undefined) {
          fields.push(`iva_hospedaje = $${paramIndex++}`);
          values.push(input.iva_hospedaje);
        }

        if (input.iva_consumos !== undefined) {
          fields.push(`iva_consumos = $${paramIndex++}`);
          values.push(input.iva_consumos);
        }

        if (input.iva_servicios !== undefined) {
          fields.push(`iva_servicios = $${paramIndex++}`);
          values.push(input.iva_servicios);
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (fields.length === 1) {
          throw new Error('Debes proporcionar al menos un campo para actualizar');
        }

        const query = `
          UPDATE configuracion_factus
          SET ${fields.join(', ')}
          WHERE id = 1
          RETURNING
            id, endpoint, email, client_id, ambiente,
            email_facturacion, activo, iva_hospedaje,
            iva_consumos, iva_servicios, access_token,
            token_expiry, ultima_sincronizacion,
            created_at, updated_at
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
      } catch (error) {
        console.error('Error al actualizar configuración Factus:', error);
        throw new Error('Error al actualizar configuración de Factus');
      }
    },

    /**
     * Probar conexión con Factus
     */
    probarConexionFactus: async () => {
      return {
        success: false,
        message: 'Facturación electrónica no disponible en esta versión',
        endpoint: null,
        ambiente: null,
        token_obtenido: false,
        expires_in: null,
        error: 'Módulo deshabilitado',
      };
    },

    /**
     * Crear nota de crédito (anulación de factura electrónica)
     */
    crearNotaCredito: async () => {
      throw new Error('Notas de crédito electrónicas no disponibles en esta versión');
    },
  },

  // ==========================================================================
  // RESOLVERS DE TIPOS (Field Resolvers)
  // ==========================================================================

  FacturaElectronica: {
    // Mapear columnas de BD a campos GraphQL
    numero_factura_dian: (parent) => parent.numero_factura_electronica || `${parent.prefijo || ''}${parent.numero || ''}`,
    url_pdf: (parent) => parent.pdf_url,
    url_xml: (parent) => parent.xml_url,
    estado_dian: (parent) => parent.factus_status,
    fecha_envio: (parent) => parent.fecha_envio_factus || parent.fecha_emision,
    fecha_respuesta_dian: (parent) => parent.fecha_aprobacion_dian,
    errores_validacion: (parent) => parent.error_message ? { error: parent.error_message } : null,
    datos_cliente_snapshot: (parent) => ({
      id: parent.cliente_id,
      tipo_documento: parent.cliente_tipo_documento,
      numero_documento: parent.cliente_numero_documento,
      nombre: parent.cliente_nombre,
      email: parent.cliente_email,
      telefono: parent.cliente_telefono,
      direccion: parent.cliente_direccion,
    }),
    datos_factura_snapshot: (parent) => ({
      subtotal: parent.subtotal,
      total: parent.total,
    }),
    respuesta_factus: (parent) => parent.factus_response,

    /**
     * Resolver: factura
     * Obtiene la factura relacionada
     */
    factura: async (parent, _, { user }) => {
      if (!parent.factura_id) return null;

      try {
        const result = await pool.query(
          `SELECT * FROM facturas WHERE id = $1`,
          [parent.factura_id]
        );

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener factura:', error);
        return null;
      }
    },
  },

  Factura: {
    // Mapear numero_factura a numero (el campo GraphQL se llama 'numero')
    numero: (parent) => parent.numero_factura || parent.numero,
    prefijo: (parent) => parent.prefijo || null,
    // Computed field: prefijo + numero para display
    numero_factura_display: (parent) => {
      const prefijo = parent.prefijo || '';
      const numero = parent.numero_factura || parent.numero || '';
      return `${prefijo}${numero}`;
    },
  },

  NotaCredito: {
    /**
     * Resolver: factura_electronica
     * Obtiene la factura electrónica relacionada
     */
    factura_electronica: async (parent, _, { user }) => {
      if (!parent.factura_electronica_id) return null;

      try {
        const result = await pool.query(
          `SELECT * FROM facturas_electronicas WHERE id = $1`,
          [parent.factura_electronica_id]
        );

        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener factura electrónica:', error);
        return null;
      }
    },
  },
};

module.exports = facturacionResolvers;
