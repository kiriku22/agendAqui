// ============================================================================
// RESOLVERS - FACTUBOX (GESTIÓN DE FACTURAS ELECTRÓNICAS)
// ============================================================================

const pool = require('../config/database');
const FactusService = require('../services/FactusService');
const { agregarFacturaACola, construirDatosFactura } = require('../services/cola-impresion');

const factuboxResolvers = {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  Query: {
    /**
     * Listar facturas electrónicas con filtros para FactuBox
     * @param {String} fecha_inicio - Fecha inicio filtro (YYYY-MM-DD)
     * @param {String} fecha_fin - Fecha fin filtro (YYYY-MM-DD)
     * @param {String} busqueda - Término de búsqueda (número, cliente, CUFE)
     * @param {String} estado_dian - Estado DIAN (Aceptada, Rechazada, Pendiente, No Transmitida)
     * @param {Int} limit - Límite de resultados (default: 50)
     * @param {Int} offset - Offset para paginación (default: 0)
     */
    listarFacturasElectronicas: async (_, { fecha_inicio, fecha_fin, busqueda, estado_dian, limit = 50, offset = 0 }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Query base con JOINs para obtener datos del cliente
        // Prioridad: 1) cliente de factura, 2) cliente de venta_pos, 3) cliente del huesped, 4) datos guardados en fe
        let query = `
          SELECT
            fe.id,
            fe.factura_id,
            COALESCE(fe.prefijo, f.prefijo) as prefijo_factura,
            COALESCE(
              fe.numero,
              CASE
                WHEN fe.prefijo IS NOT NULL AND f.numero_factura LIKE fe.prefijo || '%'
                THEN CAST(SUBSTRING(f.numero_factura, LENGTH(fe.prefijo) + 1) AS BIGINT)
                ELSE NULL
              END
            ) as numero_secuencial,
            COALESCE(
              fe.numero_factura_electronica,
              fe.numero_factus,
              CONCAT(COALESCE(fe.prefijo, f.prefijo, ''), f.numero_factura)
            ) as numero_factura_dian,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura_interna,
            f.fecha as fecha_factura,
            f.total,
            fe.cufe,
            CASE
              WHEN fe.cufe IS NULL OR fe.cufe = '' THEN 'No Transmitida'
              WHEN fe.factus_status = 'Created' THEN 'No Transmitida'
              WHEN fe.factus_status = 'pending' OR fe.factus_status = 'Pendiente' THEN 'Pendiente'
              WHEN fe.factus_status = 'approved' THEN 'Aceptada'
              WHEN fe.factus_status = 'rejected' THEN 'Rechazada'
              ELSE 'No Transmitida'
            END as estado_dian,
            fe.fecha_envio_factus as fecha_envio,
            fe.pdf_url as url_pdf,
            fe.xml_url as url_xml,
            COALESCE(
              c.nombre,
              cp.nombre,
              ch.nombre,
              fe.cliente_nombre,
              'CONSUMIDOR FINAL'
            ) as cliente_nombre,
            COALESCE(
              c.numero_documento,
              cp.numero_documento,
              ch.numero_documento,
              h.numero_documento,
              fe.cliente_numero_documento,
              '222222222222'
            ) as cliente_documento
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN hospedajes ho ON ho.id = f.hospedaje_id
          LEFT JOIN huespedes h ON h.id = ho.huesped_id
          LEFT JOIN clientes ch ON ch.id = h.cliente_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
          LEFT JOIN clientes cp ON cp.id = vp.cliente_id
          WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        // Filtro por rango de fechas
        if (fecha_inicio) {
          paramCount++;
          query += ` AND f.fecha >= $${paramCount}::date`;
          params.push(fecha_inicio);
        }

        if (fecha_fin) {
          paramCount++;
          query += ` AND f.fecha::date <= $${paramCount}::date`;
          params.push(fecha_fin);
        }

        // Filtro por estado DIAN
        if (estado_dian && estado_dian !== 'todos') {
          // Mapear el estado DIAN a las condiciones correctas
          if (estado_dian === 'No Transmitida') {
            query += ` AND (fe.cufe IS NULL OR fe.cufe = '' OR fe.factus_status = 'Created')`;
          } else if (estado_dian === 'Pendiente') {
            query += ` AND (fe.factus_status = 'pending' OR fe.factus_status = 'Pendiente')`;
          } else if (estado_dian === 'Aceptada') {
            query += ` AND fe.factus_status = 'approved'`;
          } else if (estado_dian === 'Rechazada') {
            query += ` AND fe.factus_status = 'rejected'`;
          }
        }

        // Filtro de búsqueda (número factura, cliente, CUFE)
        if (busqueda && busqueda.trim()) {
          paramCount++;
          query += ` AND (
            CONCAT(COALESCE(f.prefijo, ''), f.numero_factura) ILIKE $${paramCount} OR
            f.numero_factura ILIKE $${paramCount} OR
            fe.numero_factura_electronica ILIKE $${paramCount} OR
            COALESCE(c.nombre, cp.nombre, fe.cliente_nombre) ILIKE $${paramCount} OR
            COALESCE(c.numero_documento, cp.numero_documento, h.numero_documento, fe.cliente_numero_documento) ILIKE $${paramCount} OR
            fe.cufe ILIKE $${paramCount}
          )`;
          params.push(`%${busqueda.trim()}%`);
        }

        // Contar total antes de aplicar limit/offset
        const countQuery = query.replace(
          /SELECT[\s\S]*?FROM/,
          'SELECT COUNT(*) FROM'
        );

        console.log('COUNT QUERY:', countQuery);
        console.log('PARAMS:', params);

        const countResult = await pool.query(countQuery, params);

        console.log('COUNT RESULT:', countResult.rows);

        if (!countResult.rows || countResult.rows.length === 0) {
          console.error('No rows returned from count query');
          return {
            facturas: [],
            total: 0
          };
        }

        const total = parseInt(countResult.rows[0].count);

        // Ordenar por fecha de factura DESC
        query += ` ORDER BY f.fecha DESC, fe.created_at DESC`;

        // Aplicar paginación
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        // Ejecutar query principal
        const result = await pool.query(query, params);

        return {
          facturas: result.rows,
          total
        };
      } catch (error) {
        console.error('Error al listar facturas electrónicas (FactuBox):', error);
        throw new Error('Error al listar facturas electrónicas');
      }
    },

    /**
     * Listar notas de crédito con filtros para FactuBox
     */
    listarNotasCredito: async (_, { fecha_inicio, fecha_fin, busqueda, limit = 50, offset = 0 }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        let query = `
          SELECT
            nc.id,
            nc.factura_electronica_id,
            nc.numero_nota_credito as numero_nota_dian,
            nc.fecha_emision,
            nc.total as valor,
            nc.motivo,
            -- Transformar factus_status a estado legible
            CASE
              WHEN nc.factus_status = 'approved' THEN 'Aceptada'
              WHEN nc.factus_status = 'rejected' THEN 'Rechazada'
              WHEN nc.factus_status = 'pending' AND nc.cufe IS NOT NULL THEN 'Pendiente'
              ELSE 'No Transmitida'
            END as estado_dian,
            nc.cufe,
            -- Construir URLs desde public_url si no hay pdf_url/xml_url directos
            COALESCE(nc.pdf_url, CASE WHEN nc.public_url IS NOT NULL THEN nc.public_url END) as url_pdf,
            COALESCE(nc.xml_url, CASE WHEN nc.public_url IS NOT NULL THEN nc.public_url END) as url_xml,
            COALESCE(c.nombre, nc.cliente_nombre, 'Cliente') as cliente_nombre
          FROM notas_credito nc
          INNER JOIN facturas_electronicas fe ON fe.id = nc.factura_electronica_id
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN hospedajes ho ON ho.id = f.hospedaje_id
          LEFT JOIN huespedes h ON h.id = ho.huesped_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        // Filtro por rango de fechas
        if (fecha_inicio) {
          paramCount++;
          query += ` AND nc.created_at >= $${paramCount}::date`;
          params.push(fecha_inicio);
        }

        if (fecha_fin) {
          paramCount++;
          query += ` AND nc.created_at::date <= $${paramCount}::date`;
          params.push(fecha_fin);
        }

        // Filtro de búsqueda
        if (busqueda && busqueda.trim()) {
          paramCount++;
          query += ` AND (
            nc.numero_nota_credito ILIKE $${paramCount} OR
            COALESCE(c.nombre, nc.cliente_nombre) ILIKE $${paramCount} OR
            nc.motivo ILIKE $${paramCount} OR
            nc.cufe ILIKE $${paramCount}
          )`;
          params.push(`%${busqueda.trim()}%`);
        }

        // Contar total
        const countQuery = query.replace(
          /SELECT[\s\S]*?FROM/,
          'SELECT COUNT(*) FROM'
        );
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Ordenar
        query += ` ORDER BY nc.created_at DESC`;

        // Paginación
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await pool.query(query, params);

        return {
          notas: result.rows,
          total
        };
      } catch (error) {
        console.error('Error al listar notas de crédito (FactuBox):', error);
        throw new Error('Error al listar notas de crédito');
      }
    },

    /**
     * Obtener factura electrónica completa con todos los datos para visualización
     */
    obtenerFacturaElectronicaCompleta: async (_, { factura_electronica_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const query = `
          SELECT
            -- Datos de la factura electrónica
            fe.*,
            f.numero_factura,
            f.prefijo as factura_prefijo,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura_display,
            f.fecha,
            f.fecha as fecha_emision,
            f.subtotal as factura_subtotal,
            f.total as factura_total,

            -- Estado DIAN calculado
            CASE
              WHEN fe.cufe IS NULL OR fe.cufe = '' THEN 'No Transmitida'
              WHEN fe.factus_status = 'Created' THEN 'No Transmitida'
              WHEN fe.factus_status = 'pending' OR fe.factus_status = 'Pendiente' THEN 'Pendiente'
              WHEN fe.factus_status = 'approved' THEN 'Aceptada'
              WHEN fe.factus_status = 'rejected' THEN 'Rechazada'
              ELSE 'No Transmitida'
            END as estado_dian,

            -- Datos del Emisor
            cf.nit as emisor_nit,
            cf.digito_verificacion as emisor_digito_verificacion,
            cf.razon_social as emisor_razon_social,
            cf.nombre_comercial as emisor_nombre_comercial,
            cf.direccion as emisor_direccion,
            cf.telefono as emisor_telefono,
            cf.email_facturacion as emisor_email,
            cf.codigo_municipio_dane as emisor_municipio_dane,
            cf.regimen_tributario as emisor_regimen_tributario,
            cf.responsabilidades_fiscales as emisor_responsabilidades_fiscales,

            -- Resolución DIAN
            cf.resolucion_dian,
            cf.prefijo_factura as resolucion_prefijo,
            cf.numero_inicial_factura as resolucion_numero_inicio,
            cf.numero_final_factura as resolucion_numero_fin,
            cf.fecha_inicio_resolucion::text as resolucion_fecha_inicio,
            cf.fecha_fin_resolucion::text as resolucion_fecha_fin,

            -- Logo
            cf.logo_url

          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN configuracion_factus cf ON cf.activo = true
          WHERE fe.id = $1
          LIMIT 1
        `;

        const result = await pool.query(query, [factura_electronica_id]);

        if (result.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener factura electrónica completa:', error);
        throw new Error('Error al obtener factura electrónica');
      }
    },

    /**
     * Listar facturas electrónicas elegibles para crear nota de crédito
     * Solo facturas con CUFE (transmitidas) y aprobadas
     */
    facturasElegiblesParaNC: async (_, { busqueda, limit = 50, offset = 0 }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        let query = `
          SELECT
            fe.id,
            fe.factura_id,
            COALESCE(fe.numero_factura_electronica, fe.numero_factus, CONCAT(COALESCE(f.prefijo, ''), f.numero_factura)) as numero_factura_dian,
            COALESCE(c.nombre, fe.cliente_nombre, 'CONSUMIDOR FINAL') as cliente_nombre,
            COALESCE(c.numero_documento, fe.cliente_numero_documento, '222222222222') as cliente_documento,
            f.fecha as fecha_factura,
            f.total,
            fe.cufe,
            fe.factus_id,
            fe.items_hospedaje,
            fe.items_consumos,
            -- Verificar si tiene NC total
            CASE WHEN EXISTS (
              SELECT 1 FROM notas_credito nc
              WHERE nc.factura_electronica_id = fe.id AND nc.tipo_nota = 'total'
            ) THEN true ELSE false END as tiene_nota_credito_total,
            -- Sumar total de NC anteriores
            COALESCE((
              SELECT SUM(nc.total)
              FROM notas_credito nc
              WHERE nc.factura_electronica_id = fe.id
            ), 0) as total_notas_credito
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE fe.cufe IS NOT NULL
            AND fe.cufe != ''
            AND fe.factus_status = 'approved'
        `;

        const params = [];
        let paramCount = 0;

        // Filtro de búsqueda
        if (busqueda && busqueda.trim()) {
          paramCount++;
          query += ` AND (
            CONCAT(COALESCE(f.prefijo, ''), f.numero_factura) ILIKE $${paramCount} OR
            fe.numero_factura_electronica ILIKE $${paramCount} OR
            COALESCE(c.nombre, fe.cliente_nombre) ILIKE $${paramCount} OR
            fe.cufe ILIKE $${paramCount}
          )`;
          params.push(`%${busqueda.trim()}%`);
        }

        // Contar total - query separada sin subqueries para evitar problemas con el regex
        let countQuery = `
          SELECT COUNT(*)
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE fe.cufe IS NOT NULL
            AND fe.cufe != ''
            AND fe.factus_status = 'approved'
        `;

        const countParams = [];
        if (busqueda && busqueda.trim()) {
          countQuery += ` AND (
            CONCAT(COALESCE(f.prefijo, ''), f.numero_factura) ILIKE $1 OR
            fe.numero_factura_electronica ILIKE $1 OR
            COALESCE(c.nombre, fe.cliente_nombre) ILIKE $1 OR
            fe.cufe ILIKE $1
          )`;
          countParams.push(`%${busqueda.trim()}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Ordenar por fecha DESC
        query += ` ORDER BY f.fecha DESC`;

        // Paginación
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await pool.query(query, params);

        return {
          facturas: result.rows,
          total
        };
      } catch (error) {
        console.error('Error al listar facturas elegibles para NC:', error);
        throw new Error('Error al listar facturas elegibles');
      }
    },

    /**
     * Obtener factura específica para crear nota de crédito
     */
    obtenerFacturaParaNC: async (_, { factura_electronica_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const query = `
          SELECT
            fe.id,
            fe.factura_id,
            COALESCE(fe.numero_factura_electronica, fe.numero_factus, CONCAT(COALESCE(f.prefijo, ''), f.numero_factura)) as numero_factura_dian,
            COALESCE(c.nombre, fe.cliente_nombre, 'CONSUMIDOR FINAL') as cliente_nombre,
            COALESCE(c.numero_documento, fe.cliente_numero_documento, '222222222222') as cliente_documento,
            f.fecha as fecha_factura,
            f.total,
            fe.cufe,
            fe.factus_id,
            fe.items_hospedaje,
            fe.items_consumos,
            -- Verificar si tiene NC total
            CASE WHEN EXISTS (
              SELECT 1 FROM notas_credito nc
              WHERE nc.factura_electronica_id = fe.id AND nc.tipo_nota = 'total'
            ) THEN true ELSE false END as tiene_nota_credito_total,
            -- Sumar total de NC anteriores
            COALESCE((
              SELECT SUM(nc.total)
              FROM notas_credito nc
              WHERE nc.factura_electronica_id = fe.id
            ), 0) as total_notas_credito
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE fe.id = $1
            AND fe.cufe IS NOT NULL
            AND fe.cufe != ''
            AND fe.factus_status = 'approved'
        `;

        const result = await pool.query(query, [factura_electronica_id]);

        if (result.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada o no elegible para NC');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener factura para NC:', error);
        throw new Error('Error al obtener factura');
      }
    },
  },

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  Mutation: {
    /**
     * Transmitir factura electrónica a Factus/DIAN
     * @param {Int} factura_electronica_id - ID de la factura electrónica
     */
    transmitirFacturaElectronica: async (_, { factura_electronica_id }, { user, pool: dbPool }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // 1. Obtener factura electrónica
        const feResult = await pool.query(
          `SELECT fe.*, f.numero_factura, f.fecha, f.total
           FROM facturas_electronicas fe
           INNER JOIN facturas f ON f.id = fe.factura_id
           WHERE fe.id = $1`,
          [factura_electronica_id]
        );

        if (feResult.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada');
        }

        const facturaElectronica = feResult.rows[0];

        // 2. Verificar que no haya sido transmitida
        if (facturaElectronica.cufe) {
          throw new Error('Esta factura ya fue transmitida a DIAN');
        }

        // 3. Verificar configuración de Factus
        const configResult = await pool.query(
          `SELECT * FROM configuracion_factus WHERE activo = true ORDER BY id DESC LIMIT 1`
        );

        if (configResult.rows.length === 0 || !configResult.rows[0].activo) {
          throw new Error('La facturación electrónica no está activa. Configure Factus primero.');
        }

        const config = configResult.rows[0];

        // 4. Obtener o construir snapshot de la factura (datos completos)
        let snapshot = facturaElectronica.datos_factura_snapshot;

        if (!snapshot) {
          // Construir snapshot dinámicamente desde los datos de la factura
          console.log('Construyendo snapshot dinámicamente para factura:', factura_electronica_id);

          // Obtener datos completos de la factura (incluyendo cliente del huésped para checkouts)
          const facturaCompleta = await pool.query(`
            SELECT
              f.*,
              -- Datos del cliente directo (para ventas POS)
              c.nombre as cliente_nombre,
              c.numero_documento as cliente_documento,
              c.tipo_documento as cliente_tipo_documento,
              c.email as cliente_email,
              c.telefono as cliente_telefono,
              c.direccion as cliente_direccion,
              COALESCE(c.codigo_municipio, '11001') as cliente_municipio,
              -- Datos del CLIENTE asociado al huésped (para checkouts)
              hc.nombre as huesped_cliente_nombre,
              hc.numero_documento as huesped_cliente_documento,
              hc.tipo_documento as huesped_cliente_tipo_documento,
              hc.email as huesped_cliente_email,
              hc.telefono as huesped_cliente_telefono,
              hc.direccion as huesped_cliente_direccion,
              COALESCE(hc.codigo_municipio, '11001') as huesped_cliente_municipio
            FROM facturas f
            LEFT JOIN clientes c ON c.id = f.cliente_id
            LEFT JOIN hospedajes ho ON ho.id = f.hospedaje_id
            LEFT JOIN huespedes h ON h.id = ho.huesped_id
            LEFT JOIN clientes hc ON hc.id = h.cliente_id
            WHERE f.id = $1
          `, [facturaElectronica.factura_id]);

          if (facturaCompleta.rows.length === 0) {
            throw new Error('No se encontró la factura original');
          }

          const factura = facturaCompleta.rows[0];

          // Obtener items de la factura (detalle_venta_pos o consumos según tipo)
          let items = [];
          if (factura.tipo_factura === 'venta_pos') {
            const itemsResult = await pool.query(`
              SELECT
                dvp.nombre_item as descripcion,
                dvp.cantidad,
                dvp.precio_unitario,
                dvp.subtotal,
                dvp.iva_porcentaje,
                dvp.iva_monto,
                dvp.total,
                i.codigo
              FROM detalle_venta_pos dvp
              LEFT JOIN items_inventario i ON i.id = dvp.item_inventario_id
              INNER JOIN ventas_pos vp ON vp.id = dvp.venta_pos_id
              WHERE vp.factura_id = $1
            `, [factura.id]);
            items = itemsResult.rows;
          } else if (factura.hospedaje_id) {
            // Factura de checkout/hospedaje
            console.log('[FactuBox] Obteniendo items para hospedaje ID:', factura.hospedaje_id);

            // 1. Obtener datos del hospedaje (noches de habitación)
            const hospedajeResult = await pool.query(`
              SELECT
                h.id,
                h.precio_noche,
                COALESCE(h.noches_reales, h.noches_previstas, 1) as noches,
                hab.numero as habitacion_numero,
                hab.tipo as habitacion_tipo
              FROM hospedajes h
              LEFT JOIN habitaciones hab ON hab.id = h.habitacion_id
              WHERE h.id = $1
            `, [factura.hospedaje_id]);

            if (hospedajeResult.rows.length > 0) {
              const hosp = hospedajeResult.rows[0];
              const precioNoche = parseFloat(hosp.precio_noche || 0);
              const noches = parseInt(hosp.noches || 1);
              const subtotalHospedaje = precioNoche * noches;

              // Obtener IVA de configuración
              const configIva = await pool.query(
                'SELECT iva_hospedaje FROM configuracion_factus WHERE activo = true LIMIT 1'
              );
              const ivaPorcentaje = parseFloat(configIva.rows[0]?.iva_hospedaje || 19);
              const ivaMonto = subtotalHospedaje * (ivaPorcentaje / 100);

              // Agregar hospedaje como primer item
              items.push({
                descripcion: `Hospedaje Hab. ${hosp.habitacion_numero || 'N/A'} (${hosp.habitacion_tipo || 'Estándar'}) - ${noches} noche(s)`,
                codigo: 'HOSP',
                cantidad: noches,
                precio_unitario: precioNoche,
                subtotal: subtotalHospedaje,
                iva_porcentaje: ivaPorcentaje,
                iva_monto: ivaMonto,
                total: subtotalHospedaje + ivaMonto
              });
            }

            // 2. Obtener consumos de habitación
            const consumosResult = await pool.query(`
              SELECT
                ch.descripcion,
                ch.cantidad,
                ch.precio_unitario,
                ch.precio_total as subtotal,
                COALESCE(sh.codigo, 'CONS') as codigo
              FROM consumos_habitacion ch
              LEFT JOIN servicios_hotel sh ON sh.id = ch.servicio_id
              WHERE ch.hospedaje_id = $1
            `, [factura.hospedaje_id]);

            // Obtener IVA de consumos de configuración
            const configIvaConsumos = await pool.query(
              'SELECT iva_consumos FROM configuracion_factus WHERE activo = true LIMIT 1'
            );
            const ivaPorcentajeConsumos = parseFloat(configIvaConsumos.rows[0]?.iva_consumos || 19);

            // Agregar consumos como items adicionales
            for (const consumo of consumosResult.rows) {
              const subtotal = parseFloat(consumo.subtotal || 0);
              const ivaMonto = subtotal * (ivaPorcentajeConsumos / 100);

              items.push({
                descripcion: consumo.descripcion || 'Consumo',
                codigo: consumo.codigo,
                cantidad: parseFloat(consumo.cantidad || 1),
                precio_unitario: parseFloat(consumo.precio_unitario || 0),
                subtotal: subtotal,
                iva_porcentaje: ivaPorcentajeConsumos,
                iva_monto: ivaMonto,
                total: subtotal + ivaMonto
              });
            }

            console.log('[FactuBox] Items de hospedaje:', items.length);
          }

          // Determinar si es factura de hospedaje (usar datos del CLIENTE del huésped) o POS (usar datos del cliente directo)
          const esHospedaje = !!factura.hospedaje_id;

          // Construir datos del cliente según el tipo de factura
          let datosCliente;
          if (esHospedaje && factura.huesped_cliente_nombre) {
            // Usar datos del CLIENTE asociado al huésped para checkouts
            console.log('[FactuBox] Usando datos del CLIENTE del huésped para checkout');
            datosCliente = {
              nombre: factura.huesped_cliente_nombre || facturaElectronica.cliente_nombre || 'CONSUMIDOR FINAL',
              tipo_documento: factura.huesped_cliente_tipo_documento || facturaElectronica.cliente_tipo_documento || 'CC',
              numero_documento: factura.huesped_cliente_documento || facturaElectronica.cliente_numero_documento || '222222222222',
              email: factura.huesped_cliente_email || facturaElectronica.cliente_email || config.email_facturacion,
              telefono: factura.huesped_cliente_telefono || facturaElectronica.cliente_telefono || '',
              direccion: factura.huesped_cliente_direccion || facturaElectronica.cliente_direccion || 'No especificada',
              municipio: factura.huesped_cliente_municipio || facturaElectronica.cliente_codigo_municipio_dane || '11001'
            };
          } else {
            // Usar datos del cliente directo para ventas POS
            datosCliente = {
              nombre: factura.cliente_nombre || facturaElectronica.cliente_nombre || 'CONSUMIDOR FINAL',
              tipo_documento: factura.cliente_tipo_documento || facturaElectronica.cliente_tipo_documento || 'CC',
              numero_documento: factura.cliente_documento || facturaElectronica.cliente_numero_documento || '222222222222',
              email: factura.cliente_email || facturaElectronica.cliente_email || config.email_facturacion,
              telefono: factura.cliente_telefono || facturaElectronica.cliente_telefono || '',
              direccion: factura.cliente_direccion || facturaElectronica.cliente_direccion || 'No especificada',
              municipio: factura.cliente_municipio || facturaElectronica.cliente_codigo_municipio_dane || '11001'
            };
          }

          // Construir snapshot
          snapshot = {
            factura: {
              numero: (factura.prefijo || '') + factura.numero_factura,
              fecha: factura.fecha || factura.created_at,
              subtotal: parseFloat(factura.subtotal || 0),
              impuestos: parseFloat(factura.iva || 0),
              descuentos: parseFloat(factura.descuento || 0),
              total: parseFloat(factura.total || 0),
              tipo: factura.tipo_factura,
              notas: factura.notas || ''
            },
            cliente: datosCliente,
            items: items.map(item => ({
              descripcion: item.descripcion || 'Producto',
              codigo: item.codigo || 'PROD',
              cantidad: parseFloat(item.cantidad || 1),
              precio_unitario: parseFloat(item.precio_unitario || 0),
              subtotal: parseFloat(item.subtotal || 0),
              iva_porcentaje: parseFloat(item.iva_porcentaje || 0),
              iva_monto: parseFloat(item.iva_monto || 0),
              total: parseFloat(item.total || 0)
            })),
            metodos_pago: []
          };

          // Obtener métodos de pago (según tipo de factura)
          let pagosResult;
          if (factura.tipo_factura === 'venta_pos') {
            // Pagos de ventas POS
            pagosResult = await pool.query(`
              SELECT mp.nombre, vpp.monto
              FROM venta_pos_pagos vpp
              INNER JOIN metodos_pago mp ON mp.id = vpp.metodo_pago_id
              INNER JOIN ventas_pos vp ON vp.id = vpp.venta_pos_id
              WHERE vp.factura_id = $1
            `, [factura.id]);
          } else {
            // Pagos de facturas de hospedaje/checkout
            pagosResult = await pool.query(`
              SELECT mp.nombre, fmp.monto
              FROM factura_metodos_pago fmp
              INNER JOIN metodos_pago mp ON mp.id = fmp.metodo_pago_id
              WHERE fmp.factura_id = $1
            `, [factura.id]);
          }

          snapshot.metodos_pago = pagosResult.rows.map(p => ({
            metodo: p.nombre,
            monto: parseFloat(p.monto)
          }));

          // Si no hay métodos de pago registrados, usar efectivo por defecto
          if (snapshot.metodos_pago.length === 0) {
            console.log('[FactuBox] Sin métodos de pago registrados, usando efectivo por defecto');
            snapshot.metodos_pago.push({
              metodo: 'Efectivo',
              monto: parseFloat(factura.total || 0)
            });
          }

          console.log('Snapshot construido:', JSON.stringify(snapshot, null, 2));
        }

        // 5. Usar servicio de Factus (singleton)
        // FactusService es una instancia singleton, no una clase

        // 6. Transmitir factura a Factus
        console.log(`Transmitiendo factura #${facturaElectronica.numero_factura} a Factus...`);

        const respuestaFactus = await FactusService.enviarFacturaPOS(snapshot);

        // 7. Actualizar registro con respuesta
        // Solo guardar fecha_aprobacion_dian si el estado es 'approved'
        const estadoFinal = respuestaFactus.estado || 'pending';
        const esAprobada = estadoFinal === 'approved';

        // Extraer prefijo y número del numero_dian de Factus
        const numeroDian = respuestaFactus.numero_dian || null;
        let prefijoDian = null;
        let numeroDianSolo = null;
        if (numeroDian) {
          // El número viene como "SEPC990000021", extraer prefijo (letras) y número (dígitos)
          const match = numeroDian.match(/^([A-Za-z]*)(\d+)$/);
          if (match) {
            prefijoDian = match[1] || null;
            numeroDianSolo = match[2];
          }
        }

        const updateQuery = `
          UPDATE facturas_electronicas
          SET
            cufe = $1,
            numero_factura_electronica = $2,
            numero_factus = $2,
            prefijo = COALESCE($11, prefijo),
            numero = COALESCE($12, numero),
            factus_status = $3,
            pdf_url = $4,
            xml_url = $5,
            public_url = $9,
            factus_id = $10,
            fecha_envio_factus = NOW(),
            fecha_aprobacion_dian = CASE WHEN $8 THEN NOW() ELSE fecha_aprobacion_dian END,
            factus_response = $6,
            updated_at = NOW()
          WHERE id = $7
          RETURNING *
        `;

        const feUpdated = await pool.query(updateQuery, [
          respuestaFactus.cufe || null,
          respuestaFactus.numero_dian || null,
          estadoFinal,
          respuestaFactus.url_pdf || null,
          respuestaFactus.url_xml || null,
          JSON.stringify(respuestaFactus),
          factura_electronica_id,
          esAprobada,  // $8 - boolean para el CASE
          respuestaFactus.public_url || null,  // $9 - URL pública de Factus
          respuestaFactus.factus_id || null,   // $10 - ID interno de Factus (para billing_reference en NC)
          prefijoDian,     // $11 - prefijo extraído del número DIAN
          numeroDianSolo ? parseInt(numeroDianSolo, 10) : null   // $12 - número sin prefijo
        ]);

        // Actualizar factura local con número asignado por Factus
        if (numeroDian && feUpdated.rows.length > 0) {
          const facturaId = feUpdated.rows[0].factura_id;
          await pool.query(
            `UPDATE facturas SET numero_factura = COALESCE($1, numero_factura), prefijo = COALESCE($2, prefijo) WHERE id = $3`,
            [numeroDianSolo, prefijoDian, facturaId]
          );
          console.log(`[FactuBox] Factura #${facturaId} actualizada con número Factus: ${prefijoDian}${numeroDianSolo}`);
        }

        // 8. Retornar respuesta
        // Mapear estado interno a estado legible para el usuario
        const estadoLegible = estadoFinal === 'approved' ? 'Aceptada' : 'Pendiente';
        return {
          success: true,
          message: estadoFinal === 'approved'
            ? 'Factura transmitida y aceptada por DIAN'
            : 'Factura transmitida exitosamente (pendiente confirmación DIAN)',
          cufe: respuestaFactus.cufe,
          numero_dian: respuestaFactus.numero_dian,
          estado_dian: estadoLegible,
          url_pdf: respuestaFactus.url_pdf,
          url_xml: respuestaFactus.url_xml,
          errores: respuestaFactus.errores || []
        };

      } catch (error) {
        console.error('Error al transmitir factura electrónica:', error);

        // Si es un error de Factus, retornar detalles
        if (error.response) {
          return {
            success: false,
            message: `Error de Factus: ${error.response.data?.message || error.message}`,
            cufe: null,
            numero_dian: null,
            estado_dian: 'Rechazada',
            url_pdf: null,
            url_xml: null,
            errores: error.response.data?.errores || [error.message]
          };
        }

        // Error genérico
        return {
          success: false,
          message: error.message || 'Error al transmitir factura',
          cufe: null,
          numero_dian: null,
          estado_dian: 'Error',
          url_pdf: null,
          url_xml: null,
          errores: [error.message]
        };
      }
    },

    /**
     * Retransmitir factura rechazada
     */
    retransmitirFacturaRechazada: async (_, { factura_electronica_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // 1. Obtener factura electrónica
        const feResult = await pool.query(
          `SELECT * FROM facturas_electronicas WHERE id = $1`,
          [factura_electronica_id]
        );

        if (feResult.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada');
        }

        const facturaElectronica = feResult.rows[0];

        // 2. Verificar que esté rechazada
        if (facturaElectronica.factus_status !== 'rejected' && facturaElectronica.factus_status !== 'error') {
          throw new Error('Solo se pueden retransmitir facturas rechazadas o con error');
        }

        // 3. Resetear campos para retransmitir
        await pool.query(
          `UPDATE facturas_electronicas
           SET cufe = NULL, numero_factura_electronica = NULL, fecha_envio_factus = NULL, fecha_aprobacion_dian = NULL
           WHERE id = $1`,
          [factura_electronica_id]
        );

        // 4. Llamar a transmitirFacturaElectronica
        return await factuboxResolvers.Mutation.transmitirFacturaElectronica(
          _,
          { factura_electronica_id },
          { user }
        );

      } catch (error) {
        console.error('Error al retransmitir factura:', error);
        return {
          success: false,
          message: error.message || 'Error al retransmitir factura',
          cufe: null,
          numero_dian: null,
          estado_dian: 'Error',
          url_pdf: null,
          url_xml: null,
          errores: [error.message]
        };
      }
    },

    /**
     * Reimprimir factura electrónica (obtener PDF nuevamente)
     * @param {Int} factura_electronica_id - ID de la factura electrónica
     */
    reimprimirFactura: async (_, { factura_electronica_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // 1. Obtener factura electrónica
        const feResult = await pool.query(
          `SELECT fe.*, f.numero_factura
           FROM facturas_electronicas fe
           INNER JOIN facturas f ON f.id = fe.factura_id
           WHERE fe.id = $1`,
          [factura_electronica_id]
        );

        if (feResult.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada');
        }

        const facturaElectronica = feResult.rows[0];

        // 2. Verificar que haya sido transmitida
        if (!facturaElectronica.cufe) {
          throw new Error('Esta factura no ha sido transmitida a DIAN. Transmítala primero.');
        }

        // 3. Verificar que tenga URL de PDF
        if (!facturaElectronica.pdf_url) {
          throw new Error('Esta factura no tiene PDF disponible');
        }

        // 4. Retornar URL del PDF
        return {
          success: true,
          message: 'PDF disponible para descarga',
          url_pdf: facturaElectronica.pdf_url,
          url_xml: facturaElectronica.xml_url,
          numero_factura: facturaElectronica.numero_factura,
          cufe: facturaElectronica.cufe
        };

      } catch (error) {
        console.error('Error al reimprimir factura:', error);
        throw new Error(error.message || 'Error al reimprimir factura');
      }
    },

    /**
     * Imprimir factura en impresora térmica (agrega a cola de impresión)
     * @param {Int} factura_id - ID de la factura a imprimir
     */
    imprimirFacturaTermica: async (_, { factura_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // 1. Obtener factura con todos sus datos
        const facturaResult = await pool.query(
          `SELECT f.*,
                  CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, '')) as cliente_nombre,
                  c.tipo_documento as cliente_tipo_documento,
                  c.numero_documento as cliente_numero_documento
           FROM facturas f
           LEFT JOIN clientes c ON f.cliente_id = c.id
           WHERE f.id = $1`,
          [factura_id]
        );

        if (facturaResult.rows.length === 0) {
          throw new Error('Factura no encontrada');
        }

        const factura = facturaResult.rows[0];

        // 2. Obtener detalles de la factura
        let detalles = [];

        // Si es factura de hospedaje
        let hospedajeInfo = null;
        if (factura.hospedaje_id) {
          // Obtener hospedaje y consumos
          const hospResult = await pool.query(
            `SELECT h.*, hab.numero as habitacion_numero, hab.tipo as habitacion_tipo
             FROM hospedajes h
             JOIN habitaciones hab ON h.habitacion_id = hab.id
             WHERE h.id = $1`,
            [factura.hospedaje_id]
          );

          if (hospResult.rows[0]) {
            const hosp = hospResult.rows[0];
            const noches = hosp.noches_reales || 1;

            // Guardar info de hospedaje para impresión
            hospedajeInfo = {
              habitacion_numero: hosp.habitacion_numero,
              habitacion_tipo: hosp.habitacion_tipo,
              noches: noches,
              precio_noche: parseFloat(hosp.precio_noche),
              fecha_checkin: hosp.fecha_entrada || hosp.fecha_checkin,
              fecha_checkout: hosp.fecha_salida_real || hosp.fecha_checkout
            };

            detalles.push({
              descripcion: `Hospedaje Hab. ${hosp.habitacion_numero} (${noches} noche${noches > 1 ? 's' : ''})`,
              cantidad: noches,
              precio_unitario: parseFloat(hosp.precio_noche) || 0,
              subtotal: (parseFloat(hosp.precio_noche) || 0) * noches
            });

            // Obtener consumos
            const consumosResult = await pool.query(
              `SELECT descripcion, cantidad, precio_unitario, precio_total
               FROM consumos_habitacion
               WHERE hospedaje_id = $1 AND facturado = true`,
              [factura.hospedaje_id]
            );

            consumosResult.rows.forEach(c => {
              detalles.push({
                descripcion: c.descripcion || 'Consumo',
                cantidad: parseInt(c.cantidad) || 1,
                precio_unitario: parseFloat(c.precio_unitario) || 0,
                subtotal: parseFloat(c.precio_total) || 0
              });
            });
          }
        }

        // Si es factura de venta POS
        if (factura.venta_pos_id) {
          const detallesPOSResult = await pool.query(
            `SELECT nombre_item, cantidad, precio_unitario, total
             FROM detalle_venta_pos
             WHERE venta_pos_id = $1`,
            [factura.venta_pos_id]
          );

          detallesPOSResult.rows.forEach(d => {
            detalles.push({
              descripcion: d.nombre_item || 'Item',
              cantidad: parseInt(d.cantidad) || 1,
              precio_unitario: parseFloat(d.precio_unitario) || 0,
              subtotal: parseFloat(d.total) || 0
            });
          });
        }

        // Si no hay detalles (factura simple), crear uno genérico
        if (detalles.length === 0) {
          detalles.push({
            descripcion: 'Venta',
            cantidad: 1,
            precio_unitario: parseFloat(factura.total) || 0,
            subtotal: parseFloat(factura.total) || 0
          });
        }

        // 3. Obtener métodos de pago
        const metodosPagoResult = await pool.query(
          `SELECT mp.nombre, fmp.monto, fmp.referencia
           FROM factura_metodos_pago fmp
           JOIN metodos_pago mp ON fmp.metodo_pago_id = mp.id
           WHERE fmp.factura_id = $1`,
          [factura_id]
        );

        // 4. Obtener factura electrónica con datos completos de resolución
        const feResult = await pool.query(
          `SELECT fe.cufe, fe.numero_factura_electronica, fe.pdf_url, fe.xml_url,
                  fe.factus_status, cf.resolucion_dian as numero_resolucion,
                  cf.prefijo, cf.fecha_inicio_resolucion as fecha_vigencia_desde,
                  cf.fecha_fin_resolucion as fecha_vigencia_hasta
           FROM facturas_electronicas fe
           LEFT JOIN configuracion_factus cf ON cf.id = (SELECT id FROM configuracion_factus WHERE activo = true ORDER BY id DESC LIMIT 1)
           WHERE fe.factura_id = $1`,
          [factura_id]
        );
        const facturaElectronica = feResult.rows[0] || null;

        // 4b. Obtener datos del hotel para el header del recibo
        const datosHotelResult = await pool.query('SELECT * FROM datos_hotel LIMIT 1');
        const datosHotel = datosHotelResult.rows[0];

        // 5. Construir datos para impresión
        const datosImpresion = construirDatosFactura(
          factura,
          detalles,
          metodosPagoResult.rows,
          facturaElectronica,
          {
            cliente: factura.cliente_nombre ? {
              nombre: factura.cliente_nombre.trim(),
              tipo_documento: factura.cliente_tipo_documento || 'CC',
              numero_documento: factura.cliente_numero_documento
            } : null,
            hospedaje: hospedajeInfo,
            configuracion: datosHotel ? {
              nombre_negocio: datosHotel.nombre_comercial,
              nit: datosHotel.nit,
              direccion: datosHotel.direccion,
              ciudad: datosHotel.ciudad,
              telefono: datosHotel.telefono || datosHotel.celular
            } : null
          }
        );

        // 6. Agregar a cola de impresión (prioridad 3 = reimpresión manual)
        const trabajoId = await agregarFacturaACola(pool, factura_id, datosImpresion, 3);

        if (trabajoId) {
          return {
            success: true,
            message: 'Factura enviada a la cola de impresión',
            trabajo_id: trabajoId
          };
        } else {
          return {
            success: false,
            message: 'Error al agregar a la cola de impresión',
            trabajo_id: null
          };
        }

      } catch (error) {
        console.error('Error al imprimir factura térmica:', error);
        throw new Error(error.message || 'Error al imprimir factura');
      }
    },

    /**
     * Crear y transmitir nota de crédito desde FactuBox
     * @param {Object} input - Datos de la nota de crédito
     */
    crearNotaCreditoFactuBox: async (_, { input }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const { factura_electronica_id, tipo_nota, motivo, items } = input;

      try {
        // 1. Validar que la factura electrónica existe y tiene CUFE
        const feResult = await pool.query(`
          SELECT fe.*, f.numero_factura, f.prefijo as factura_prefijo, f.total as factura_total
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          WHERE fe.id = $1
        `, [factura_electronica_id]);

        if (feResult.rows.length === 0) {
          throw new Error('Factura electrónica no encontrada');
        }

        const facturaElectronica = feResult.rows[0];

        if (!facturaElectronica.cufe || !facturaElectronica.factus_id) {
          throw new Error('La factura debe estar transmitida a DIAN para crear una nota de crédito');
        }

        if (facturaElectronica.factus_status !== 'approved') {
          throw new Error('Solo se pueden crear notas de crédito para facturas aprobadas por DIAN');
        }

        // 2. Si es NC total, verificar que no exista una
        if (tipo_nota === 'total') {
          const ncTotalResult = await pool.query(`
            SELECT id FROM notas_credito
            WHERE factura_electronica_id = $1 AND tipo_nota = 'total'
          `, [factura_electronica_id]);

          if (ncTotalResult.rows.length > 0) {
            throw new Error('Ya existe una nota de crédito total para esta factura');
          }
        }

        // 3. Calcular totales de la NC
        let subtotal = 0;
        let totalImpuestos = 0;

        for (const item of items) {
          const itemSubtotal = item.cantidad * item.precio_unitario;
          const itemIva = itemSubtotal * ((item.iva_porcentaje || 0) / 100);
          subtotal += itemSubtotal;
          totalImpuestos += itemIva;
        }

        const totalNC = subtotal + totalImpuestos;

        // 4. Validar que el total NC no exceda lo disponible
        const ncAnterioresResult = await pool.query(`
          SELECT COALESCE(SUM(total), 0) as total_anterior
          FROM notas_credito
          WHERE factura_electronica_id = $1
        `, [factura_electronica_id]);

        const totalNCAnterior = parseFloat(ncAnterioresResult.rows[0].total_anterior);
        const disponible = parseFloat(facturaElectronica.factura_total) - totalNCAnterior;

        if (totalNC > disponible + 0.01) { // Tolerancia de centavos
          throw new Error(`El total de la nota de crédito ($${totalNC.toFixed(2)}) excede el monto disponible ($${disponible.toFixed(2)})`);
        }

        // 5. Generar número de nota de crédito
        const fechaHoy = new Date();
        const fechaStr = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '');

        const consecutivoResult = await pool.query(`
          SELECT COUNT(*) + 1 as siguiente
          FROM notas_credito
          WHERE DATE(created_at) = CURRENT_DATE
        `);

        const consecutivo = String(consecutivoResult.rows[0].siguiente).padStart(4, '0');
        const numeroNotaCredito = `NC-${fechaStr}-${consecutivo}`;

        // 6. Crear registro de NC en estado pending
        const insertResult = await pool.query(`
          INSERT INTO notas_credito (
            factura_id,
            factura_electronica_id,
            numero_nota_credito,
            tipo_nota,
            motivo,
            subtotal,
            impuestos,
            total,
            items,
            factus_status,
            cliente_nombre,
            cliente_numero_documento,
            cliente_tipo_documento,
            created_by,
            fecha_emision,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending',
            $10, $11, $12, $13, NOW(), NOW(), NOW()
          )
          RETURNING id
        `, [
          facturaElectronica.factura_id,
          factura_electronica_id,
          numeroNotaCredito,
          tipo_nota,
          motivo,
          subtotal,
          totalImpuestos,
          totalNC,
          JSON.stringify(items),
          facturaElectronica.cliente_nombre,
          facturaElectronica.cliente_numero_documento,
          facturaElectronica.cliente_tipo_documento,
          user.id
        ]);

        const notaCreditoId = insertResult.rows[0].id;

        // 7. Preparar items para Factus
        const itemsFactus = items.map((item, index) => ({
          code_reference: item.codigo || `NC-ITEM-${index + 1}`,
          name: item.descripcion,
          quantity: item.cantidad,
          price: item.precio_unitario,
          iva: item.iva_porcentaje || 0
        }));

        // 8. Llamar a FactusService para transmitir
        console.log(`[FactuBox] Transmitiendo NC ${numeroNotaCredito} a Factus...`);

        const notaCreditoData = {
          numero_nota_credito: numeroNotaCredito,
          motivo: motivo
        };

        const respuestaFactus = await FactusService.enviarNotaCredito(
          notaCreditoData,
          facturaElectronica,
          itemsFactus
        );

        // 9. Actualizar registro con respuesta de Factus
        // La respuesta de Factus viene en formato: { data: { credit_note: {...} }, status: "Created" }
        const creditNote = respuestaFactus.data?.credit_note || respuestaFactus.credit_note || {};
        const factusStatus = respuestaFactus.status; // "Created", "Validation error", etc.

        // Para NC, status=1 en credit_note significa aprobada
        const esAprobada = creditNote.status === 1 || factusStatus === 'Created';
        const estado = esAprobada ? 'approved' : 'pending';

        // Para NC se usa CUDE (no CUFE), pero también guardamos el CUFE de la factura referenciada
        const cude = creditNote.cude || null;
        const cufeRef = creditNote.cufe || facturaElectronica.cufe || null;
        const numeroNotaDian = creditNote.number || numeroNotaCredito;

        console.log(`[FactuBox] Respuesta Factus NC - Status: ${factusStatus}, CUDE: ${cude}, Número DIAN: ${numeroNotaDian}`);

        await pool.query(`
          UPDATE notas_credito
          SET
            cufe = $1,
            factus_id = $2,
            factus_status = $3,
            pdf_url = $4,
            xml_url = $5,
            public_url = $6,
            fecha_envio_factus = NOW(),
            factus_response = $7,
            updated_at = NOW()
          WHERE id = $8
        `, [
          cude || cufeRef, // Guardar CUDE o CUFE de referencia
          creditNote.id?.toString() || null,
          estado,
          null, // pdf_url - no viene en respuesta de Factus para NC, se genera dinámicamente
          null, // xml_url - igual
          creditNote.public_url || null,
          JSON.stringify(respuestaFactus),
          notaCreditoId
        ]);

        // 10. Retornar respuesta
        const estadoLegible = estado === 'approved' ? 'Aceptada' : 'Pendiente';

        return {
          success: true,
          message: estado === 'approved'
            ? 'Nota de crédito creada y aceptada por DIAN'
            : 'Nota de crédito creada y transmitida (pendiente confirmación DIAN)',
          nota_credito_id: notaCreditoId,
          cufe: cude || cufeRef,
          numero_nota_dian: numeroNotaDian,
          estado_dian: estadoLegible,
          url_pdf: creditNote.public_url ? `${creditNote.public_url}?output=pdf` : null,
          url_xml: creditNote.public_url ? `${creditNote.public_url}?output=xml` : null,
          errores: creditNote.errors || []
        };

      } catch (error) {
        console.error('Error al crear nota de crédito:', error);

        return {
          success: false,
          message: error.message || 'Error al crear nota de crédito',
          nota_credito_id: null,
          cufe: null,
          numero_nota_dian: null,
          estado_dian: 'Error',
          url_pdf: null,
          url_xml: null,
          errores: [error.message]
        };
      }
    },

    /**
     * Transmitir nota de crédito pendiente a DIAN
     * @param {Int} nota_credito_id - ID de la nota de crédito
     */
    transmitirNotaCredito: async (_, { nota_credito_id }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // 1. Obtener nota de crédito
        const ncResult = await pool.query(`
          SELECT nc.*, fe.cufe as fe_cufe, fe.factus_id as fe_factus_id,
                 fe.cliente_nombre, fe.cliente_numero_documento, fe.cliente_tipo_documento,
                 fe.cliente_email, fe.cliente_telefono, fe.cliente_direccion,
                 fe.cliente_codigo_municipio_dane
          FROM notas_credito nc
          INNER JOIN facturas_electronicas fe ON fe.id = nc.factura_electronica_id
          WHERE nc.id = $1
        `, [nota_credito_id]);

        if (ncResult.rows.length === 0) {
          throw new Error('Nota de crédito no encontrada');
        }

        const notaCredito = ncResult.rows[0];

        // 2. Verificar que esté en estado pendiente
        if (notaCredito.cufe) {
          throw new Error('Esta nota de crédito ya fue transmitida');
        }

        // 3. Preparar datos para Factus
        const items = typeof notaCredito.items === 'string'
          ? JSON.parse(notaCredito.items)
          : notaCredito.items;

        const itemsFactus = items.map((item, index) => ({
          code_reference: item.codigo || `NC-ITEM-${index + 1}`,
          name: item.descripcion,
          quantity: item.cantidad,
          price: item.precio_unitario,
          iva: item.iva_porcentaje || 0
        }));

        // 4. Construir objeto de factura electrónica para el servicio
        const facturaElectronica = {
          cufe: notaCredito.fe_cufe,
          factus_id: notaCredito.fe_factus_id,
          cliente_nombre: notaCredito.cliente_nombre,
          cliente_numero_documento: notaCredito.cliente_numero_documento,
          cliente_tipo_documento: notaCredito.cliente_tipo_documento,
          cliente_email: notaCredito.cliente_email,
          cliente_telefono: notaCredito.cliente_telefono,
          cliente_direccion: notaCredito.cliente_direccion,
          cliente_codigo_municipio_dane: notaCredito.cliente_codigo_municipio_dane
        };

        const notaCreditoData = {
          numero_nota_credito: notaCredito.numero_nota_credito,
          motivo: notaCredito.motivo
        };

        // 5. Transmitir a Factus
        console.log(`[FactuBox] Transmitiendo NC pendiente ${notaCredito.numero_nota_credito} a Factus...`);

        const respuestaFactus = await FactusService.enviarNotaCredito(
          notaCreditoData,
          facturaElectronica,
          itemsFactus
        );

        // 6. Actualizar registro
        const data = respuestaFactus.data || respuestaFactus;
        const estado = data.status === 1 || data.credit_note?.status === 1 ? 'approved' : 'pending';
        const cufe = data.cufe || data.credit_note?.cufe || null;

        await pool.query(`
          UPDATE notas_credito
          SET
            cufe = $1,
            factus_id = $2,
            factus_status = $3,
            pdf_url = $4,
            xml_url = $5,
            public_url = $6,
            fecha_envio_factus = NOW(),
            factus_response = $7,
            updated_at = NOW()
          WHERE id = $8
        `, [
          cufe,
          data.id || data.credit_note?.id || null,
          estado,
          data.pdf_url || data.credit_note?.pdf_url || null,
          data.xml_url || data.credit_note?.xml_url || null,
          data.public_url || data.credit_note?.public_url || null,
          JSON.stringify(respuestaFactus),
          nota_credito_id
        ]);

        // 7. Retornar respuesta
        const estadoLegible = estado === 'approved' ? 'Aceptada' : 'Pendiente';

        return {
          success: true,
          message: estado === 'approved'
            ? 'Nota de crédito transmitida y aceptada por DIAN'
            : 'Nota de crédito transmitida (pendiente confirmación DIAN)',
          nota_credito_id: nota_credito_id,
          cufe: cufe,
          numero_nota_dian: notaCredito.numero_nota_credito,
          estado_dian: estadoLegible,
          url_pdf: data.pdf_url || data.credit_note?.pdf_url || null,
          url_xml: data.xml_url || data.credit_note?.xml_url || null,
          errores: []
        };

      } catch (error) {
        console.error('Error al transmitir nota de crédito:', error);

        return {
          success: false,
          message: error.message || 'Error al transmitir nota de crédito',
          nota_credito_id: nota_credito_id,
          cufe: null,
          numero_nota_dian: null,
          estado_dian: 'Error',
          url_pdf: null,
          url_xml: null,
          errores: [error.message]
        };
      }
    },

    /**
     * Transmitir múltiples facturas electrónicas en lote a DIAN
     * @param {[Int!]!} factura_electronica_ids - Array de IDs de facturas electrónicas
     */
    transmitirFacturasLote: async (_, { factura_electronica_ids }, { user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const resultados = [];
      const timestamp = new Date();
      let cantidadExitosa = 0;
      let cantidadFallida = 0;

      // 1. Registrar inicio del lote en la tabla de auditoría
      const loteResult = await pool.query(
        `INSERT INTO lotes_transmision
         (usuario_id, cantidad_total, cantidad_exitosa, cantidad_fallida, facturas_ids, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          user.id,
          factura_electronica_ids.length,
          0,
          0,
          factura_electronica_ids,
          JSON.stringify({ inicio: timestamp }),
          timestamp,
          timestamp
        ]
      );

      const loteId = loteResult.rows[0].id;

      // 2. Procesar cada factura SECUENCIALMENTE (no paralelo)
      for (const facturaId of factura_electronica_ids) {
        try {
          // Reutilizar lógica de transmisión individual
          const resultado = await factuboxResolvers.Mutation.transmitirFacturaElectronica(
            _,
            { factura_electronica_id: facturaId },
            { user, pool }
          );

          if (resultado.success) {
            cantidadExitosa++;
          } else {
            cantidadFallida++;
          }

          resultados.push({
            factura_electronica_id: facturaId,
            success: resultado.success,
            message: resultado.message,
            cufe: resultado.cufe,
            numero_dian: resultado.numero_dian,
            estado_dian: resultado.estado_dian,
            url_pdf: resultado.url_pdf,
            url_xml: resultado.url_xml,
            errores: resultado.errores || []
          });

          // Pequeña pausa entre transmisiones para evitar rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          cantidadFallida++;
          resultados.push({
            factura_electronica_id: facturaId,
            success: false,
            message: error.message || 'Error desconocido',
            cufe: null,
            numero_dian: null,
            estado_dian: 'Error',
            url_pdf: null,
            url_xml: null,
            errores: [error.message]
          });
        }
      }

      // 3. Actualizar registro del lote con resultados finales
      await pool.query(
        `UPDATE lotes_transmision
         SET cantidad_exitosa = $1,
             cantidad_fallida = $2,
             metadata = $3,
             updated_at = $4
         WHERE id = $5`,
        [
          cantidadExitosa,
          cantidadFallida,
          JSON.stringify({
            inicio: timestamp,
            fin: new Date(),
            resultados: resultados.map(r => ({
              id: r.factura_electronica_id,
              success: r.success,
              message: r.message
            }))
          }),
          new Date(),
          loteId
        ]
      );

      return resultados;
    },
  },
};

// ============================================================================
// FUNCIÓN REUTILIZABLE: TRANSMISIÓN AUTOMÁTICA DE FACTURAS POS
// ============================================================================

/**
 * Transmite automáticamente una factura POS a Factus/DIAN.
 * Se llama DESPUÉS del COMMIT de la venta POS.
 * NUNCA lanza excepciones — retorna null si la auto-transmisión no aplica o falla.
 *
 * @param {Object} dbPool - Pool de conexión PostgreSQL
 * @param {number} facturaId - ID del registro en tabla facturas
 * @returns {Promise<Object|null>} Resultado de la transmisión o null
 */
async function transmitirFacturaPOSAutomaticamente(dbPool, facturaId) {
  try {
    // 1. Verificar si transmisión automática está habilitada
    const resolucionResult = await dbPool.query(
      `SELECT transmision_automatica FROM resoluciones_dian
       WHERE tipo_documento = 'factura' AND activo = true LIMIT 1`
    );
    if (!resolucionResult.rows[0]?.transmision_automatica) {
      return null; // No habilitada, no hacer nada
    }

    // 2. Verificar si Factus está activo
    const configResult = await dbPool.query(
      `SELECT * FROM configuracion_factus WHERE activo = true ORDER BY id DESC LIMIT 1`
    );
    if (!configResult.rows[0]?.activo) {
      return null; // Factus no activo
    }
    const config = configResult.rows[0];

    console.log(`[Auto-TX] Iniciando transmisión automática para factura #${facturaId}`);

    // 3. Crear registro en facturas_electronicas (sin CUFE aún)
    const feInsert = await dbPool.query(`
      INSERT INTO facturas_electronicas (
        factura_id, subtotal, total_impuestos, total,
        factus_status, fecha_emision
      )
      SELECT
        f.id, f.subtotal, f.iva, f.total,
        'pending', NOW()
      FROM facturas f WHERE f.id = $1
      ON CONFLICT (factura_id) DO UPDATE SET
        factus_status = 'pending',
        updated_at = NOW()
      RETURNING id
    `, [facturaId]);

    if (feInsert.rows.length === 0) {
      console.error('[Auto-TX] No se pudo crear registro facturas_electronicas');
      return { success: false, message: 'No se pudo crear registro de factura electrónica', errores: [] };
    }
    const facturaElectronicaId = feInsert.rows[0].id;

    // 4. Construir snapshot (misma lógica que transmitirFacturaElectronica)
    const facturaCompleta = await dbPool.query(`
      SELECT
        f.*,
        c.nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        c.tipo_documento as cliente_tipo_documento,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        COALESCE(c.codigo_municipio, '11001') as cliente_municipio
      FROM facturas f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = $1
    `, [facturaId]);

    if (facturaCompleta.rows.length === 0) {
      throw new Error('Factura no encontrada');
    }
    const factura = facturaCompleta.rows[0];

    // Obtener items de detalle_venta_pos
    const itemsResult = await dbPool.query(`
      SELECT
        dvp.nombre_item as descripcion,
        dvp.cantidad,
        dvp.precio_unitario,
        dvp.subtotal,
        dvp.iva_porcentaje,
        dvp.iva_monto,
        dvp.total,
        i.codigo
      FROM detalle_venta_pos dvp
      LEFT JOIN items_inventario i ON i.id = dvp.item_inventario_id
      INNER JOIN ventas_pos vp ON vp.id = dvp.venta_pos_id
      WHERE vp.factura_id = $1
    `, [facturaId]);

    // Construir datos del cliente
    const datosCliente = {
      nombre: factura.cliente_nombre || 'CONSUMIDOR FINAL',
      tipo_documento: factura.cliente_tipo_documento || 'CC',
      numero_documento: factura.cliente_documento || '222222222222',
      email: factura.cliente_email || config.email_facturacion,
      telefono: factura.cliente_telefono || '',
      direccion: factura.cliente_direccion || 'No especificada',
      municipio: factura.cliente_municipio || '11001'
    };

    // Construir snapshot
    const snapshot = {
      factura: {
        numero: (factura.prefijo || '') + factura.numero_factura,
        fecha: factura.fecha || factura.created_at,
        subtotal: parseFloat(factura.subtotal || 0),
        impuestos: parseFloat(factura.iva || 0),
        descuentos: parseFloat(factura.descuento || 0),
        total: parseFloat(factura.total || 0),
        tipo: factura.tipo_factura,
        notas: factura.notas || ''
      },
      cliente: datosCliente,
      items: itemsResult.rows.map(item => ({
        descripcion: item.descripcion || 'Producto',
        codigo: item.codigo || 'PROD',
        cantidad: parseFloat(item.cantidad || 1),
        precio_unitario: parseFloat(item.precio_unitario || 0),
        subtotal: parseFloat(item.subtotal || 0),
        iva_porcentaje: parseFloat(item.iva_porcentaje || 0),
        iva_monto: parseFloat(item.iva_monto || 0),
        total: parseFloat(item.total || 0)
      })),
      metodos_pago: []
    };

    // Obtener métodos de pago
    const pagosResult = await dbPool.query(`
      SELECT mp.nombre, vpp.monto
      FROM venta_pos_pagos vpp
      INNER JOIN metodos_pago mp ON mp.id = vpp.metodo_pago_id
      INNER JOIN ventas_pos vp ON vp.id = vpp.venta_pos_id
      WHERE vp.factura_id = $1
    `, [facturaId]);

    snapshot.metodos_pago = pagosResult.rows.map(p => ({
      metodo: p.nombre,
      monto: parseFloat(p.monto)
    }));

    if (snapshot.metodos_pago.length === 0) {
      snapshot.metodos_pago.push({
        metodo: 'Efectivo',
        monto: parseFloat(factura.total || 0)
      });
    }

    console.log('[Auto-TX] Snapshot construido, transmitiendo a Factus...');

    // 5. Transmitir a Factus
    const respuestaFactus = await FactusService.enviarFacturaPOS(snapshot);

    // 6. Actualizar facturas_electronicas con la respuesta
    const estadoFinal = respuestaFactus.estado || 'pending';
    const esAprobada = estadoFinal === 'approved';

    const numeroDian = respuestaFactus.numero_dian || null;
    let prefijoDian = null;
    let numeroDianSolo = null;
    if (numeroDian) {
      const match = numeroDian.match(/^([A-Za-z]*)(\d+)$/);
      if (match) {
        prefijoDian = match[1] || null;
        numeroDianSolo = match[2];
      }
    }

    await dbPool.query(`
      UPDATE facturas_electronicas SET
        cufe = $1,
        numero_factura_electronica = $2,
        numero_factus = $2,
        prefijo = COALESCE($8, prefijo),
        numero = COALESCE($9, numero),
        factus_status = $3,
        pdf_url = $4,
        xml_url = $5,
        public_url = $10,
        factus_id = $11,
        fecha_envio_factus = NOW(),
        fecha_aprobacion_dian = CASE WHEN $7 THEN NOW() ELSE fecha_aprobacion_dian END,
        factus_response = $6,
        cliente_nombre = $12,
        cliente_numero_documento = $13,
        cliente_tipo_documento = $14,
        items_consumos = $15,
        updated_at = NOW()
      WHERE id = $16
    `, [
      respuestaFactus.cufe || null,                    // $1
      respuestaFactus.numero_dian || null,              // $2
      estadoFinal,                                      // $3
      respuestaFactus.url_pdf || null,                  // $4
      respuestaFactus.url_xml || null,                  // $5
      JSON.stringify(respuestaFactus),                  // $6
      esAprobada,                                       // $7
      prefijoDian,                                      // $8
      numeroDianSolo ? parseInt(numeroDianSolo, 10) : null, // $9
      respuestaFactus.public_url || null,               // $10
      respuestaFactus.factus_id || null,                // $11
      datosCliente.nombre,                              // $12
      datosCliente.numero_documento,                    // $13
      datosCliente.tipo_documento,                      // $14
      JSON.stringify(snapshot.items),                    // $15 - items como JSON
      facturaElectronicaId                              // $16
    ]);

    // Actualizar factura local con número asignado por Factus
    if (numeroDian) {
      await dbPool.query(
        `UPDATE facturas SET numero_factura = COALESCE($1, numero_factura), prefijo = COALESCE($2, prefijo) WHERE id = $3`,
        [numeroDianSolo, prefijoDian, facturaId]
      );
      console.log(`[Auto-TX] Factura #${facturaId} actualizada con número Factus: ${prefijoDian}${numeroDianSolo}`);
    }

    const estadoLegible = estadoFinal === 'approved' ? 'Aceptada' : 'Pendiente';
    console.log(`[Auto-TX] Transmisión completada: ${estadoLegible}`);

    return {
      success: true,
      message: estadoFinal === 'approved'
        ? 'Factura transmitida y aceptada por DIAN'
        : 'Factura transmitida (pendiente confirmación DIAN)',
      cufe: respuestaFactus.cufe,
      numero_dian: respuestaFactus.numero_dian,
      estado_dian: estadoLegible,
      url_pdf: respuestaFactus.url_pdf,
      url_xml: respuestaFactus.url_xml,
      errores: []
    };

  } catch (error) {
    console.error('[Auto-TX] Error en transmisión automática:', error.message);

    // Intentar guardar el error en facturas_electronicas si ya existe el registro
    try {
      await dbPool.query(`
        UPDATE facturas_electronicas SET
          factus_status = 'error',
          error_message = $1,
          updated_at = NOW()
        WHERE factura_id = $2 AND cufe IS NULL
      `, [error.message, facturaId]);
    } catch (dbError) {
      console.error('[Auto-TX] Error guardando estado de error:', dbError.message);
    }

    return {
      success: false,
      message: error.message || 'Error en transmisión automática',
      cufe: null,
      numero_dian: null,
      estado_dian: 'Error',
      url_pdf: null,
      url_xml: null,
      errores: [error.message]
    };
  }
}

module.exports = factuboxResolvers;
module.exports.transmitirFacturaPOSAutomaticamente = transmitirFacturaPOSAutomaticamente;
