/**
 * Resolvers para Calendario Unificado
 * Combina reservas y hospedajes Walk-In en una sola vista
 * @updated 2025-12-15
 */

const calendarioResolvers = {
  Query: {
    /**
     * Obtiene eventos del calendario (reservas + hospedajes walk-in)
     * @param {Date} fecha_desde - Fecha inicio del rango
     * @param {Date} fecha_hasta - Fecha fin del rango
     * @param {Int} habitacion_id - Filtrar por habitación específica
     */
    eventosCalendario: async (_, { fecha_desde, fecha_hasta, habitacion_id }, { pool }) => {
      try {
        let params = [];
        let paramIndex = 1;

        // Construir condiciones WHERE dinámicamente
        let whereReservas = "r.estado != 'cancelada'";
        let whereHospedajes = "h.estado = 'activo' AND h.reserva_id IS NULL";

        // Filtro por rango de fechas
        if (fecha_desde && fecha_hasta) {
          whereReservas += ` AND r.fecha_entrada <= $${paramIndex + 1} AND r.fecha_salida >= $${paramIndex}`;
          whereHospedajes += ` AND h.fecha_entrada::date <= $${paramIndex + 1} AND h.fecha_salida_prevista >= $${paramIndex}`;
          params.push(fecha_desde, fecha_hasta);
          paramIndex += 2;
        }

        // Filtro por habitación
        if (habitacion_id) {
          whereReservas += ` AND r.habitacion_id = $${paramIndex}`;
          whereHospedajes += ` AND h.habitacion_id = $${paramIndex}`;
          params.push(habitacion_id);
        }

        const query = `
          -- Reservas (no canceladas)
          SELECT
            r.id,
            'reserva' as tipo,
            r.codigo,
            r.habitacion_id,
            r.fecha_entrada::timestamp as fecha_entrada,
            r.fecha_salida as fecha_salida,
            r.estado::text as estado,
            TRUE::boolean as es_reserva,
            FALSE::boolean as es_walkin,
            r.noches,
            NULL::int as num_adultos,
            NULL::int as num_ninos,
            r.precio_noche,
            r.precio_total,
            r.anticipo,
            r.saldo_pendiente,
            NULL::int as noches_previstas,
            r.canal_reserva,
            r.observaciones,
            r.notas_especiales,
            r.created_at,
            r.confirmed_at,
            r.cancelled_at,
            r.motivo_cancelacion,
            NULL::int as reserva_id,
            r.huesped_id
          FROM reservas r
          WHERE ${whereReservas}

          UNION ALL

          -- Hospedajes Walk-In (sin reserva asociada)
          SELECT
            h.id,
            'hospedaje' as tipo,
            h.codigo,
            h.habitacion_id,
            h.fecha_entrada as fecha_entrada,
            h.fecha_salida_prevista as fecha_salida,
            'ocupada' as estado,
            FALSE::boolean as es_reserva,
            TRUE::boolean as es_walkin,
            h.noches_previstas as noches,
            NULL::int as num_adultos,
            NULL::int as num_ninos,
            h.precio_noche,
            (h.precio_noche * h.noches_previstas) as precio_total,
            NULL::decimal as anticipo,
            NULL::decimal as saldo_pendiente,
            h.noches_previstas,
            NULL::text as canal_reserva,
            h.observaciones,
            h.notas_especiales,
            h.created_at,
            NULL::timestamp as confirmed_at,
            NULL::timestamp as cancelled_at,
            NULL::text as motivo_cancelacion,
            h.reserva_id,
            h.huesped_id
          FROM hospedajes h
          WHERE ${whereHospedajes}

          ORDER BY fecha_entrada
        `;

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener eventos del calendario:', error);
        throw new Error('Error al obtener eventos del calendario');
      }
    }
  },

  // Field resolvers para CalendarioEvento
  CalendarioEvento: {
    /**
     * Mapear es_walkin (minúsculas de PostgreSQL) a es_walkIn (camelCase de GraphQL)
     */
    es_walkIn: (parent) => {
      return parent.es_walkin;
    },

    /**
     * Resolver para obtener la habitación asociada al evento
     */
    habitacion: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1',
          [parent.habitacion_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener habitación del evento:', error);
        return null;
      }
    },

    /**
     * Resolver para obtener el huésped asociado al evento
     */
    huesped: async (parent, _, { pool }) => {
      try {
        if (!parent.huesped_id) return null;

        const result = await pool.query(
          `SELECT h.*,
                  CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as nombre_completo
           FROM huespedes h
           LEFT JOIN clientes c ON h.cliente_id = c.id
           WHERE h.id = $1`,
          [parent.huesped_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener huésped del evento:', error);
        return null;
      }
    }
  }
};

module.exports = calendarioResolvers;
