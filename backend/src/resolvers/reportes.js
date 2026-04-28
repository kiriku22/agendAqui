/**
 * Resolvers para Reportes y Análisis
 * Genera reportes de ocupación, ingresos, huéspedes, reservas e inventario
 */

const reportesResolvers = {
  Query: {
    /**
     * REPORTE DE OCUPACIÓN
     * Analiza el % de ocupación de habitaciones por día y por tipo
     */
    reporteOcupacion: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. OCUPACIÓN POR DÍA
        // ================================================================
        // Genera una serie de fechas y cuenta habitaciones en cada estado
        const queryOcupacionDia = `
          WITH fecha_serie AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha
          ),
          total_habitaciones AS (
            SELECT COUNT(*) as total FROM habitaciones WHERE activa = true
          )
          SELECT
            fs.fecha,
            th.total as total_habitaciones,
            COUNT(DISTINCT h.habitacion_id) FILTER (
              WHERE h.estado = 'activo'
                AND h.fecha_entrada::date <= fs.fecha
                AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
            )::integer as ocupadas,
            (th.total - COUNT(DISTINCT h.habitacion_id) FILTER (
              WHERE h.estado = 'activo'
                AND h.fecha_entrada::date <= fs.fecha
                AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
            ))::integer as disponibles,
            0 as limpieza,
            0 as mantenimiento,
            CASE
              WHEN th.total > 0 THEN
                (COUNT(DISTINCT h.habitacion_id) FILTER (
                  WHERE h.estado = 'activo'
                    AND h.fecha_entrada::date <= fs.fecha
                    AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
                )::float / th.total::float * 100)
              ELSE 0
            END as porcentaje_ocupacion
          FROM fecha_serie fs
          CROSS JOIN total_habitaciones th
          LEFT JOIN hospedajes h ON (
            h.fecha_entrada::date <= fs.fecha
            AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
            AND h.estado = 'activo'
          )
          GROUP BY fs.fecha, th.total
          ORDER BY fs.fecha;
        `;

        const resultDia = await client.query(queryOcupacionDia, [fecha_desde, fecha_hasta]);

        // ================================================================
        // 2. OCUPACIÓN POR TIPO DE HABITACIÓN
        // ================================================================
        const queryOcupacionTipo = `
          WITH fecha_serie AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha
          ),
          dias_totales AS (
            SELECT COUNT(*) as dias FROM fecha_serie
          )
          SELECT
            hab.tipo,
            COUNT(DISTINCT hab.id)::integer as total,
            (COUNT(DISTINCT CASE
              WHEN h.estado = 'activo'
                AND h.fecha_entrada::date <= fs.fecha
                AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
              THEN hab.id
            END)::float / dt.dias)::float as ocupadas_promedio,
            (COUNT(DISTINCT hab.id)::float - (COUNT(DISTINCT CASE
              WHEN h.estado = 'activo'
                AND h.fecha_entrada::date <= fs.fecha
                AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
              THEN hab.id
            END)::float / dt.dias))::float as disponibles_promedio,
            CASE
              WHEN COUNT(DISTINCT hab.id) > 0 THEN
                ((COUNT(DISTINCT CASE
                  WHEN h.estado = 'activo'
                    AND h.fecha_entrada::date <= fs.fecha
                    AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
                  THEN hab.id
                END)::float / dt.dias) / COUNT(DISTINCT hab.id)::float * 100)
              ELSE 0
            END as porcentaje_ocupacion,
            COALESCE(SUM(h_comp.precio_total_hospedaje), 0)::float as ingresos_generados
          FROM habitaciones hab
          CROSS JOIN dias_totales dt
          LEFT JOIN fecha_serie fs ON true
          LEFT JOIN hospedajes h ON (
            hab.id = h.habitacion_id
            AND h.fecha_entrada::date <= fs.fecha
            AND (h.fecha_salida_real IS NULL OR h.fecha_salida_real::date >= fs.fecha)
            AND h.estado = 'activo'
          )
          LEFT JOIN hospedajes h_comp ON (
            hab.id = h_comp.habitacion_id
            AND h_comp.fecha_salida_real::date >= $1::date
            AND h_comp.fecha_salida_real::date <= $2::date
            AND h_comp.estado = 'finalizado'
          )
          WHERE hab.activa = true
          GROUP BY hab.tipo, dt.dias
          ORDER BY porcentaje_ocupacion DESC;
        `;

        const resultTipo = await client.query(queryOcupacionTipo, [fecha_desde, fecha_hasta]);

        // ================================================================
        // 3. CALCULAR MÉTRICAS AGREGADAS
        // ================================================================
        const ocupacionPorDia = resultDia.rows;
        const ocupacionPorTipo = resultTipo.rows;

        // Promedio de ocupación en el período
        const porcentajeOcupacionPromedio =
          ocupacionPorDia.length > 0
            ? ocupacionPorDia.reduce((sum, dia) => sum + parseFloat(dia.porcentaje_ocupacion), 0) /
              ocupacionPorDia.length
            : 0;

        // Total de noches vendidas
        const totalNochesVendidas = ocupacionPorDia.reduce(
          (sum, dia) => sum + parseInt(dia.ocupadas),
          0
        );

        // Total habitaciones promedio
        const totalHabitacionesPromedio =
          ocupacionPorDia.length > 0 ? parseInt(ocupacionPorDia[0].total_habitaciones) : 0;

        // Calcular días del período
        const fechaInicio = new Date(fecha_desde);
        const fechaFin = new Date(fecha_hasta);
        const dias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;

        return {
          fecha_desde,
          fecha_hasta,
          dias,
          porcentaje_ocupacion_promedio: porcentajeOcupacionPromedio,
          ocupacion_por_dia: ocupacionPorDia,
          ocupacion_por_tipo: ocupacionPorTipo,
          total_noches_vendidas: totalNochesVendidas,
          total_habitaciones_promedio: totalHabitacionesPromedio,
        };
      } catch (error) {
        console.error('Error generando reporte de ocupación:', error);
        throw new Error('Error al generar el reporte de ocupación');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE INGRESOS
     * Analiza ingresos por hospedajes + consumos, desglosado por día y tipo
     */
    reporteIngresos: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. INGRESOS POR DÍA
        // ================================================================
        // Suma ingresos de hospedajes y consumos por fecha de check-out
        const queryIngresosDia = `
          WITH fecha_serie AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha
          )
          SELECT
            fs.fecha,
            COALESCE(SUM(h.precio_total_hospedaje), 0)::float as ingresos_hospedajes,
            COALESCE(SUM(c.precio_total), 0)::float as ingresos_consumos,
            (COALESCE(SUM(h.precio_total_hospedaje), 0) + COALESCE(SUM(c.precio_total), 0))::float as total,
            COUNT(DISTINCT h.id)::integer as num_checkouts
          FROM fecha_serie fs
          LEFT JOIN hospedajes h ON (
            h.fecha_salida_real::date = fs.fecha
            AND h.estado = 'finalizado'
          )
          LEFT JOIN consumos_habitacion c ON (
            h.id = c.hospedaje_id
            AND c.facturado = true
          )
          GROUP BY fs.fecha
          ORDER BY fs.fecha;
        `;

        const resultDia = await client.query(queryIngresosDia, [fecha_desde, fecha_hasta]);

        // ================================================================
        // 2. INGRESOS POR TIPO DE HABITACIÓN
        // ================================================================
        const queryIngresosTipo = `
          SELECT
            hab.tipo,
            COALESCE(SUM(h.precio_total_hospedaje), 0)::float as ingresos_hospedajes,
            COALESCE(SUM(c.precio_total), 0)::float as ingresos_consumos,
            (COALESCE(SUM(h.precio_total_hospedaje), 0) + COALESCE(SUM(c.precio_total), 0))::float as total,
            COUNT(DISTINCT h.id)::integer as num_hospedajes,
            CASE
              WHEN COUNT(DISTINCT h.id) > 0
              THEN (COALESCE(SUM(h.precio_total_hospedaje), 0) / COUNT(DISTINCT h.id))::float
              ELSE 0
            END as precio_promedio_noche
          FROM habitaciones hab
          LEFT JOIN hospedajes h ON (
            hab.id = h.habitacion_id
            AND h.fecha_salida_real::date >= $1::date
            AND h.fecha_salida_real::date <= $2::date
            AND h.estado = 'finalizado'
          )
          LEFT JOIN consumos_habitacion c ON (
            h.id = c.hospedaje_id
            AND c.facturado = true
          )
          WHERE hab.activa = true
          GROUP BY hab.tipo
          ORDER BY total DESC;
        `;

        const resultTipo = await client.query(queryIngresosTipo, [fecha_desde, fecha_hasta]);

        // ================================================================
        // 3. CALCULAR TOTALES Y MÉTRICAS
        // ================================================================
        const ingresosPorDia = resultDia.rows;
        const ingresosPorTipo = resultTipo.rows;

        // Totales generales
        const totalIngresos = ingresosPorDia.reduce((sum, dia) => sum + parseFloat(dia.total), 0);
        const ingresosHospedajes = ingresosPorDia.reduce(
          (sum, dia) => sum + parseFloat(dia.ingresos_hospedajes),
          0
        );
        const ingresosConsumos = ingresosPorDia.reduce(
          (sum, dia) => sum + parseFloat(dia.ingresos_consumos),
          0
        );

        // Porcentajes de composición
        const porcentajeHospedajes =
          totalIngresos > 0 ? (ingresosHospedajes / totalIngresos) * 100 : 0;
        const porcentajeConsumos =
          totalIngresos > 0 ? (ingresosConsumos / totalIngresos) * 100 : 0;

        // Promedio diario
        const dias = ingresosPorDia.length;
        const promedioDiario = dias > 0 ? totalIngresos / dias : 0;

        // Número de facturas y ticket promedio
        const queryFacturas = `
          SELECT
            COUNT(*)::integer as num_facturas,
            CASE
              WHEN COUNT(*) > 0 THEN (SUM(total)::float / COUNT(*))
              ELSE 0
            END as ticket_promedio
          FROM facturas
          WHERE fecha::date >= $1::date
            AND fecha::date <= $2::date;
        `;

        const resultFacturas = await client.query(queryFacturas, [fecha_desde, fecha_hasta]);
        const { num_facturas, ticket_promedio } = resultFacturas.rows[0];

        return {
          fecha_desde,
          fecha_hasta,
          total_ingresos: totalIngresos,
          ingresos_hospedajes: ingresosHospedajes,
          ingresos_consumos: ingresosConsumos,
          porcentaje_hospedajes: porcentajeHospedajes,
          porcentaje_consumos: porcentajeConsumos,
          promedio_diario: promedioDiario,
          ingresos_por_dia: ingresosPorDia,
          ingresos_por_tipo: ingresosPorTipo,
          num_facturas: parseInt(num_facturas),
          ticket_promedio: parseFloat(ticket_promedio),
        };
      } catch (error) {
        console.error('Error generando reporte de ingresos:', error);
        throw new Error('Error al generar el reporte de ingresos');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE HUÉSPEDES
     * Analiza huéspedes nuevos, recurrentes y frecuentes
     */
    reporteHuespedes: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // Huéspedes únicos en el período
        const queryTotalHuespedes = `
          SELECT COUNT(DISTINCT huesped_id) as total_huespedes
          FROM hospedajes
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date;
        `;

        const resultTotal = await client.query(queryTotalHuespedes, [fecha_desde, fecha_hasta]);
        const total_huespedes = parseInt(resultTotal.rows[0].total_huespedes);

        // Huéspedes nuevos (primera vez en el período)
        const queryNuevos = `
          SELECT COUNT(DISTINCT h.huesped_id) as huespedes_nuevos
          FROM hospedajes h
          WHERE h.fecha_entrada::date >= $1::date
            AND h.fecha_entrada::date <= $2::date
            AND NOT EXISTS (
              SELECT 1 FROM hospedajes h2
              WHERE h2.huesped_id = h.huesped_id
                AND h2.fecha_entrada::date < $1::date
            );
        `;

        const resultNuevos = await client.query(queryNuevos, [fecha_desde, fecha_hasta]);
        const huespedes_nuevos = parseInt(resultNuevos.rows[0].huespedes_nuevos);

        // Huéspedes recurrentes
        const huespedes_recurrentes = total_huespedes - huespedes_nuevos;

        // TOP 10 huéspedes frecuentes
        const queryFrecuentes = `
          SELECT
            h.huesped_id,
            CONCAT(hue.nombre, ' ', COALESCE(hue.apellido, '')) as nombre_completo,
            hue.email,
            hue.telefono,
            COUNT(DISTINCT h.id)::integer as num_hospedajes,
            COALESCE(SUM(h.precio_total_hospedaje + COALESCE(c.total_consumos, 0)), 0)::float as total_gastado,
            MAX(h.fecha_entrada)::date as ultima_visita
          FROM hospedajes h
          INNER JOIN huespedes hue ON h.huesped_id = hue.id
          LEFT JOIN (
            SELECT hospedaje_id, SUM(precio_total) as total_consumos
            FROM consumos_habitacion
            WHERE facturado = true
            GROUP BY hospedaje_id
          ) c ON h.id = c.hospedaje_id
          WHERE h.fecha_entrada::date >= $1::date
            AND h.fecha_entrada::date <= $2::date
          GROUP BY h.huesped_id, hue.nombre, hue.apellido, hue.email, hue.telefono
          ORDER BY num_hospedajes DESC, total_gastado DESC
          LIMIT 10;
        `;

        const resultFrecuentes = await client.query(queryFrecuentes, [fecha_desde, fecha_hasta]);

        // Promedio de estancia en días
        const queryEstancia = `
          SELECT
            AVG(EXTRACT(DAY FROM (COALESCE(fecha_salida_real, fecha_salida_prevista) - fecha_entrada)))::float as promedio_dias
          FROM hospedajes
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
            AND estado = 'finalizado';
        `;

        const resultEstancia = await client.query(queryEstancia, [fecha_desde, fecha_hasta]);
        const promedio_estancia_dias = parseFloat(resultEstancia.rows[0].promedio_dias) || 0;

        // Porcentajes
        const porcentaje_nuevos = total_huespedes > 0 ? (huespedes_nuevos / total_huespedes) * 100 : 0;
        const porcentaje_recurrentes = total_huespedes > 0 ? (huespedes_recurrentes / total_huespedes) * 100 : 0;

        return {
          fecha_desde,
          fecha_hasta,
          total_huespedes,
          huespedes_nuevos,
          huespedes_recurrentes,
          huespedes_frecuentes: resultFrecuentes.rows,
          promedio_estancia_dias,
          porcentaje_nuevos,
          porcentaje_recurrentes,
        };
      } catch (error) {
        console.error('Error generando reporte de huéspedes:', error);
        throw new Error('Error al generar el reporte de huéspedes');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE RESERVAS
     * Analiza reservas por canal, estado y tasas de conversión
     */
    reporteReservas: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // Totales por estado
        const queryTotales = `
          SELECT
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'confirmada')::integer as confirmadas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas,
            COUNT(*) FILTER (WHERE estado = 'no_show')::integer as no_show,
            COALESCE(SUM(anticipo), 0)::float as anticipo_total,
            COALESCE(SUM(saldo_pendiente), 0)::float as saldo_pendiente_total
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date;
        `;

        const resultTotales = await client.query(queryTotales, [fecha_desde, fecha_hasta]);
        const {
          total_reservas,
          confirmadas,
          canceladas,
          no_show,
          anticipo_total,
          saldo_pendiente_total
        } = resultTotales.rows[0];

        // Tasas
        const tasa_cancelacion = total_reservas > 0 ? (canceladas / total_reservas) * 100 : 0;
        const tasa_no_show = total_reservas > 0 ? (no_show / total_reservas) * 100 : 0;

        // Reservas por canal
        const queryCanal = `
          SELECT
            canal_reserva as canal,
            COUNT(*)::integer as total,
            COUNT(*) FILTER (WHERE estado = 'confirmada')::integer as confirmadas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas,
            CASE
              WHEN COUNT(*) > 0
              THEN (COUNT(*) FILTER (WHERE estado = 'cancelada')::float / COUNT(*) * 100)
              ELSE 0
            END as tasa_cancelacion,
            COALESCE(SUM(precio_total), 0)::float as ingresos_totales
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY canal_reserva
          ORDER BY total DESC;
        `;

        const resultCanal = await client.query(queryCanal, [fecha_desde, fecha_hasta]);

        // Reservas por estado
        const queryEstado = `
          SELECT
            estado,
            COUNT(*)::integer as cantidad,
            (COUNT(*)::float / $3::float * 100) as porcentaje
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY estado
          ORDER BY cantidad DESC;
        `;

        const resultEstado = await client.query(queryEstado, [
          fecha_desde,
          fecha_hasta,
          total_reservas || 1
        ]);

        return {
          fecha_desde,
          fecha_hasta,
          total_reservas: parseInt(total_reservas),
          confirmadas: parseInt(confirmadas),
          canceladas: parseInt(canceladas),
          no_show: parseInt(no_show),
          tasa_cancelacion,
          tasa_no_show,
          anticipo_total: parseFloat(anticipo_total),
          saldo_pendiente_total: parseFloat(saldo_pendiente_total),
          reservas_por_canal: resultCanal.rows,
          reservas_por_estado: resultEstado.rows,
        };
      } catch (error) {
        console.error('Error generando reporte de reservas:', error);
        throw new Error('Error al generar el reporte de reservas');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE INVENTARIO
     * Analiza stock, movimientos y productos más consumidos
     */
    reporteInventario: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // Items bajo stock (solo productos, no servicios)
        const queryBajoStock = `
          SELECT
            i.id,
            i.codigo,
            i.nombre,
            i.tipo,
            i.stock_actual,
            i.stock_minimo,
            (i.stock_minimo - i.stock_actual) as diferencia,
            c.nombre as categoria_nombre
          FROM items_inventario i
          LEFT JOIN categorias_inventario c ON i.categoria_id = c.id
          WHERE i.activo = true
            AND i.tipo = 'producto'
            AND i.stock_actual <= i.stock_minimo
          ORDER BY diferencia DESC;
        `;

        const resultBajoStock = await client.query(queryBajoStock);

        // Resumen de movimientos por tipo
        const queryMovimientos = `
          SELECT
            tipo_movimiento,
            SUM(cantidad)::integer as cantidad_total,
            COUNT(*)::integer as num_movimientos
          FROM movimientos_inventario
          WHERE fecha_movimiento::date >= $1::date
            AND fecha_movimiento::date <= $2::date
          GROUP BY tipo_movimiento
          ORDER BY cantidad_total DESC;
        `;

        const resultMovimientos = await client.query(queryMovimientos, [fecha_desde, fecha_hasta]);

        // Total items activos
        const queryTotalItems = `
          SELECT COUNT(*)::integer as total FROM items_inventario WHERE activo = true;
        `;

        const resultTotal = await client.query(queryTotalItems);
        const total_items_activos = parseInt(resultTotal.rows[0].total);

        // Valor del inventario actual
        const queryValor = `
          SELECT
            COALESCE(SUM(stock_actual * precio_base), 0)::float as valor_total
          FROM items_inventario
          WHERE activo = true AND tipo = 'producto';
        `;

        const resultValor = await client.query(queryValor);
        const valor_inventario_actual = parseFloat(resultValor.rows[0].valor_total);

        // Productos más consumidos en el período
        const queryMasConsumidos = `
          SELECT
            i.id as item_id,
            i.codigo,
            i.nombre,
            i.tipo,
            SUM(ch.cantidad)::integer as cantidad_consumida,
            COUNT(DISTINCT ch.id)::integer as veces_consumido,
            c.nombre as categoria_nombre
          FROM consumos_habitacion ch
          INNER JOIN items_inventario i ON ch.item_inventario_id = i.id
          LEFT JOIN categorias_inventario c ON i.categoria_id = c.id
          INNER JOIN hospedajes h ON ch.hospedaje_id = h.id
          WHERE h.fecha_entrada::date >= $1::date
            AND h.fecha_entrada::date <= $2::date
            AND ch.facturado = true
          GROUP BY i.id, i.codigo, i.nombre, i.tipo, c.nombre
          ORDER BY cantidad_consumida DESC
          LIMIT 10;
        `;

        const resultConsumidos = await client.query(queryMasConsumidos, [fecha_desde, fecha_hasta]);

        return {
          fecha_desde,
          fecha_hasta,
          items_bajo_stock: resultBajoStock.rows,
          movimientos_resumen: resultMovimientos.rows,
          total_items_activos,
          total_items_bajo_stock: resultBajoStock.rows.length,
          valor_inventario_actual,
          productos_mas_consumidos: resultConsumidos.rows,
        };
      } catch (error) {
        console.error('Error generando reporte de inventario:', error);
        throw new Error('Error al generar el reporte de inventario');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE MÉTODOS DE PAGO
     * Analiza los pagos recibidos por método de pago
     */
    reporteMetodosPago: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. DETALLE POR MÉTODO DE PAGO
        // ================================================================
        const queryDetallePorMetodo = `
          SELECT
            mp.id as metodo_pago_id,
            mp.nombre as metodo_nombre,
            mp.codigo_dian,
            COALESCE(SUM(fmp.monto), 0) as total,
            COUNT(DISTINCT fmp.id)::integer as num_transacciones,
            CASE
              WHEN COUNT(DISTINCT fmp.id) > 0
              THEN COALESCE(SUM(fmp.monto), 0) / COUNT(DISTINCT fmp.id)
              ELSE 0
            END as ticket_promedio,
            0.0 as porcentaje
          FROM metodos_pago mp
          LEFT JOIN factura_metodos_pago fmp ON fmp.metodo_pago_id = mp.id
          LEFT JOIN facturas f ON f.id = fmp.factura_id
          WHERE mp.activo = true
            AND (f.fecha BETWEEN $1 AND $2 OR f.fecha IS NULL)
          GROUP BY mp.id, mp.nombre, mp.codigo_dian
          ORDER BY total DESC;
        `;

        const resultDetalle = await client.query(queryDetallePorMetodo, [fecha_desde, fecha_hasta]);

        // Calcular porcentajes
        const totalGeneral = resultDetalle.rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);
        const detalle_por_metodo = resultDetalle.rows.map(row => ({
          ...row,
          total: parseFloat(row.total || 0),
          ticket_promedio: parseFloat(row.ticket_promedio || 0),
          porcentaje: totalGeneral > 0 ? (parseFloat(row.total || 0) / totalGeneral * 100) : 0
        }));

        // ================================================================
        // 2. TENDENCIA DIARIA POR MÉTODO
        // ================================================================
        const queryTendenciaDiaria = `
          WITH fecha_serie AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha
          )
          SELECT
            fs.fecha,
            mp.nombre as metodo_nombre,
            COALESCE(SUM(fmp.monto), 0) as total
          FROM fecha_serie fs
          CROSS JOIN metodos_pago mp
          LEFT JOIN facturas f ON f.fecha::date = fs.fecha
          LEFT JOIN factura_metodos_pago fmp ON fmp.factura_id = f.id AND fmp.metodo_pago_id = mp.id
          WHERE mp.activo = true
          GROUP BY fs.fecha, mp.id, mp.nombre
          ORDER BY fs.fecha, mp.nombre;
        `;

        const resultTendencia = await client.query(queryTendenciaDiaria, [fecha_desde, fecha_hasta]);
        const tendencia_diaria = resultTendencia.rows.map(row => ({
          ...row,
          total: parseFloat(row.total || 0)
        }));

        // ================================================================
        // 3. RESUMEN GENERAL
        // ================================================================
        const total_transacciones = detalle_por_metodo.reduce((sum, m) => sum + m.num_transacciones, 0);
        const total_recaudado = detalle_por_metodo.reduce((sum, m) => sum + m.total, 0);
        const ticket_promedio_global = total_transacciones > 0 ? total_recaudado / total_transacciones : 0;

        // Método más usado (más transacciones)
        const metodoMasUsado = detalle_por_metodo.reduce((max, m) =>
          m.num_transacciones > (max?.num_transacciones || 0) ? m : max
        , null);

        // Método con mayor recaudo
        const metodoMayorRecaudo = detalle_por_metodo.reduce((max, m) =>
          m.total > (max?.total || 0) ? m : max
        , null);

        const resumen = {
          total_recaudado,
          total_transacciones,
          ticket_promedio_global,
          metodo_mas_usado: metodoMasUsado?.metodo_nombre || null,
          metodo_mayor_recaudo: metodoMayorRecaudo?.metodo_nombre || null
        };

        // ================================================================
        // RETORNAR RESULTADO
        // ================================================================
        return {
          fecha_desde,
          fecha_hasta,
          resumen,
          detalle_por_metodo,
          tendencia_diaria
        };

      } catch (error) {
        console.error('Error generando reporte de métodos de pago:', error);
        throw new Error('Error al generar el reporte de métodos de pago');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE CIERRE DE CAJA DIARIO (Night Audit)
     * Genera el cierre de caja para una fecha específica
     */
    reporteCierreCaja: async (_, { fecha }, { pool, user }) => {
      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. RESUMEN GENERAL DEL DÍA
        // ================================================================
        const queryResumen = `
          WITH facturas_del_dia AS (
            SELECT
              f.id,
              f.numero_factura,
              f.fecha,
              f.total,
              f.hospedaje_id,
              h.noches_reales,
              h.precio_noche
            FROM facturas f
            LEFT JOIN hospedajes h ON h.id = f.hospedaje_id
            WHERE f.fecha::date = $1::date
              AND f.estado != 'anulada'
          ),
          consumos_facturados AS (
            SELECT
              f.id as factura_id,
              COALESCE(SUM(c.precio_total), 0) as total_consumos
            FROM facturas_del_dia f
            LEFT JOIN consumos_habitacion c ON c.hospedaje_id = f.hospedaje_id AND c.facturado = true
            GROUP BY f.id
          ),
          ingresos_calculados AS (
            SELECT
              f.id,
              f.hospedaje_id,
              CASE
                WHEN f.hospedaje_id IS NOT NULL THEN (f.noches_reales * f.precio_noche)
                ELSE 0
              END as ingreso_hospedaje,
              COALESCE(cf.total_consumos, 0) as ingreso_consumos,
              f.total
            FROM facturas_del_dia f
            LEFT JOIN consumos_facturados cf ON cf.factura_id = f.id
          )
          SELECT
            COUNT(DISTINCT CASE WHEN hospedaje_id IS NOT NULL THEN hospedaje_id END)::integer as num_checkouts,
            COUNT(*)::integer as num_facturas,
            COALESCE(SUM(ingreso_hospedaje), 0) as ingresos_hospedaje,
            COALESCE(SUM(ingreso_consumos), 0) as ingresos_consumos,
            COALESCE(SUM(total), 0) as total_ingresos
          FROM ingresos_calculados;
        `;

        const resumenResult = await client.query(queryResumen, [fecha]);
        const resumenData = resumenResult.rows[0];

        // ================================================================
        // 2. PAGOS RECIBIDOS POR MÉTODO DE PAGO
        // ================================================================
        const queryPagosPorMetodo = `
          SELECT
            mp.id as metodo_pago_id,
            mp.nombre as metodo_nombre,
            COALESCE(SUM(fmp.monto), 0) as total,
            COUNT(fmp.id)::integer as num_transacciones
          FROM metodos_pago mp
          LEFT JOIN factura_metodos_pago fmp ON fmp.metodo_pago_id = mp.id
          LEFT JOIN facturas f ON f.id = fmp.factura_id
          WHERE mp.activo = true
            AND (f.fecha::date = $1::date OR f.fecha IS NULL)
            AND (f.estado != 'anulada' OR f.estado IS NULL)
          GROUP BY mp.id, mp.nombre
          ORDER BY total DESC;
        `;

        const pagosResult = await client.query(queryPagosPorMetodo, [fecha]);
        const pagos_por_metodo = pagosResult.rows.map(row => ({
          metodo_pago_id: row.metodo_pago_id,
          metodo_nombre: row.metodo_nombre,
          total: parseFloat(row.total || 0),
          num_transacciones: parseInt(row.num_transacciones || 0)
        }));

        const total_pagos_recibidos = pagos_por_metodo.reduce((sum, p) => sum + p.total, 0);

        // ================================================================
        // 3. LISTADO DE FACTURAS DEL DÍA
        // ================================================================
        const queryFacturas = `
          SELECT
            f.id as factura_id,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura,
            COALESCE(c.nombre, 'Cliente General') as cliente_nombre,
            TO_CHAR(f.fecha, 'HH24:MI') as hora,
            f.total::float,
            COALESCE(STRING_AGG(mp.nombre, ', '), '') as metodos_pago,
            CASE
              WHEN f.estado = 'anulada' THEN 'Anulada'
              ELSE 'Pagada'
            END as estado
          FROM facturas f
          LEFT JOIN clientes c ON c.id = f.cliente_id
          LEFT JOIN factura_metodos_pago fmp ON fmp.factura_id = f.id
          LEFT JOIN metodos_pago mp ON mp.id = fmp.metodo_pago_id
          WHERE f.fecha::date = $1::date
          GROUP BY f.id, f.prefijo, f.numero_factura, c.nombre, f.fecha, f.total, f.estado
          ORDER BY f.fecha DESC;
        `;

        const facturasResult = await client.query(queryFacturas, [fecha]);
        const facturas_del_dia = facturasResult.rows.map(row => ({
          factura_id: row.factura_id,
          numero_factura: row.numero_factura,
          cliente_nombre: row.cliente_nombre,
          hora: row.hora,
          total: parseFloat(row.total || 0),
          metodos_pago: row.metodos_pago || '',
          estado: row.estado
        }));

        // ================================================================
        // 4. CALCULAR SALDO PENDIENTE
        // ================================================================
        // Saldo pendiente = Total ingresos - Total pagos recibidos
        const saldo_pendiente = parseFloat(resumenData.total_ingresos) - total_pagos_recibidos;

        // ================================================================
        // 5. CONSTRUIR RESUMEN FINAL
        // ================================================================
        const resumen = {
          total_ingresos: parseFloat(resumenData.total_ingresos || 0),
          ingresos_hospedaje: parseFloat(resumenData.ingresos_hospedaje || 0),
          ingresos_consumos: parseFloat(resumenData.ingresos_consumos || 0),
          total_pagos_recibidos,
          saldo_pendiente,
          num_checkouts: resumenData.num_checkouts,
          num_facturas: resumenData.num_facturas
        };

        // ================================================================
        // RETORNAR RESULTADO
        // ================================================================
        return {
          fecha,
          resumen,
          pagos_por_metodo,
          facturas_del_dia
        };

      } catch (error) {
        console.error('Error generando reporte de cierre de caja:', error);
        throw new Error('Error al generar el reporte de cierre de caja');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE ADR Y REVPAR (Indicadores Hoteleros)
     * ADR = Average Daily Rate (Tarifa Promedio Diaria)
     * RevPAR = Revenue Per Available Room (Ingreso por Habitación Disponible)
     * Occupancy Rate = Tasa de Ocupación
     */
    reporteADRRevPAR: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. TENDENCIA DIARIA DE ADR, RevPAR Y OCUPACIÓN
        // ================================================================
        const queryTendenciaDiaria = `
          WITH serie_fechas AS (
            SELECT generate_series(
              $1::date,
              $2::date,
              '1 day'::interval
            )::date as fecha
          ),
          habitaciones_disponibles AS (
            SELECT COUNT(*)::integer as total_habitaciones
            FROM habitaciones
            WHERE activa = true
          ),
          hospedajes_por_dia AS (
            SELECT
              sf.fecha,
              COUNT(DISTINCT h.habitacion_id)::integer as habitaciones_ocupadas,
              SUM(h.noches_reales)::integer as noches_vendidas,
              SUM(h.noches_reales * h.precio_noche) as ingresos
            FROM serie_fechas sf
            LEFT JOIN hospedajes h ON (
              h.fecha_entrada <= sf.fecha
              AND (h.fecha_salida_real >= sf.fecha OR (h.fecha_salida_real IS NULL AND h.fecha_salida_prevista >= sf.fecha))
              AND h.estado IN ('activo', 'finalizado')
            )
            GROUP BY sf.fecha
          )
          SELECT
            hd.fecha,
            CASE
              WHEN hd.noches_vendidas > 0 THEN ROUND((hd.ingresos / hd.noches_vendidas)::numeric, 2)
              ELSE 0
            END as adr,
            CASE
              WHEN hab.total_habitaciones > 0 THEN ROUND((hd.ingresos / hab.total_habitaciones)::numeric, 2)
              ELSE 0
            END as rev_par,
            CASE
              WHEN hab.total_habitaciones > 0 THEN ROUND((hd.habitaciones_ocupadas::numeric / hab.total_habitaciones * 100), 2)
              ELSE 0
            END as occupancy_rate,
            hd.habitaciones_ocupadas,
            COALESCE(hd.noches_vendidas, 0) as noches_vendidas,
            COALESCE(hd.ingresos, 0) as ingresos
          FROM hospedajes_por_dia hd
          CROSS JOIN habitaciones_disponibles hab
          ORDER BY hd.fecha;
        `;

        const tendenciaResult = await client.query(queryTendenciaDiaria, [fecha_desde, fecha_hasta]);
        const tendencia_diaria = tendenciaResult.rows.map(row => ({
          ...row,
          adr: parseFloat(row.adr || 0),
          rev_par: parseFloat(row.rev_par || 0),
          occupancy_rate: parseFloat(row.occupancy_rate || 0),
          ingresos: parseFloat(row.ingresos || 0)
        }));

        // ================================================================
        // 2. PROMEDIOS POR TIPO DE HABITACIÓN
        // ================================================================
        const queryPromediosPorTipo = `
          WITH habitaciones_por_tipo AS (
            SELECT tipo, COUNT(*)::integer as total_habitaciones
            FROM habitaciones
            WHERE activa = true
            GROUP BY tipo
          ),
          hospedajes_por_tipo AS (
            SELECT
              hab.tipo,
              COUNT(h.id)::integer as num_hospedajes,
              SUM(h.noches_reales)::integer as noches_vendidas,
              SUM(h.noches_reales * h.precio_noche) as ingresos_totales,
              AVG(h.noches_reales * h.precio_noche) as ingreso_promedio
            FROM hospedajes h
            INNER JOIN habitaciones hab ON hab.id = h.habitacion_id
            WHERE h.fecha_entrada BETWEEN $1 AND $2
              AND h.estado IN ('activo', 'finalizado')
            GROUP BY hab.tipo
          )
          SELECT
            ht.tipo,
            CASE
              WHEN hp.noches_vendidas > 0 THEN ROUND((hp.ingresos_totales / hp.noches_vendidas)::numeric, 2)
              ELSE 0
            END as adr,
            CASE
              WHEN ht.total_habitaciones > 0 THEN ROUND((COALESCE(hp.ingresos_totales, 0) / ht.total_habitaciones)::numeric, 2)
              ELSE 0
            END as rev_par,
            CASE
              WHEN ht.total_habitaciones > 0 AND hp.num_hospedajes > 0
              THEN ROUND((hp.num_hospedajes::numeric / ht.total_habitaciones * 100), 2)
              ELSE 0
            END as occupancy_rate,
            ht.total_habitaciones,
            COALESCE(hp.num_hospedajes::numeric / NULLIF((DATE($2) - DATE($1) + 1), 0), 0) as habitaciones_vendidas,
            COALESCE(hp.ingresos_totales, 0) as ingresos_totales
          FROM habitaciones_por_tipo ht
          LEFT JOIN hospedajes_por_tipo hp ON hp.tipo = ht.tipo
          ORDER BY ingresos_totales DESC;
        `;

        const promediosResult = await client.query(queryPromediosPorTipo, [fecha_desde, fecha_hasta]);
        const promedios_por_tipo = promediosResult.rows.map(row => ({
          ...row,
          adr: parseFloat(row.adr || 0),
          rev_par: parseFloat(row.rev_par || 0),
          occupancy_rate: parseFloat(row.occupancy_rate || 0),
          habitaciones_vendidas: parseFloat(row.habitaciones_vendidas || 0),
          ingresos_totales: parseFloat(row.ingresos_totales || 0)
        }));

        // ================================================================
        // 3. RESUMEN GLOBAL DEL PERÍODO
        // ================================================================
        const queryResumen = `
          WITH datos_periodo AS (
            SELECT
              COUNT(DISTINCT h.id)::integer as num_checkouts,
              SUM(h.noches_reales)::integer as total_noches_vendidas,
              SUM(h.noches_reales * h.precio_noche) as ingresos_totales_hospedaje
            FROM hospedajes h
            WHERE h.fecha_entrada BETWEEN $1 AND $2
              AND h.estado IN ('activo', 'finalizado')
          ),
          habitaciones_disponibles AS (
            SELECT COUNT(*)::integer as total_habitaciones
            FROM habitaciones
            WHERE activa = true
          ),
          dias_periodo AS (
            SELECT (DATE($2) - DATE($1) + 1) as num_dias
          )
          SELECT
            dp.num_checkouts,
            dp.total_noches_vendidas,
            dp.ingresos_totales_hospedaje,
            hab.total_habitaciones,
            dias.num_dias,
            CASE
              WHEN dp.total_noches_vendidas > 0 THEN ROUND((dp.ingresos_totales_hospedaje / dp.total_noches_vendidas)::numeric, 2)
              ELSE 0
            END as adr_global,
            CASE
              WHEN hab.total_habitaciones > 0 AND dias.num_dias > 0
              THEN ROUND((dp.ingresos_totales_hospedaje / (hab.total_habitaciones * dias.num_dias))::numeric, 2)
              ELSE 0
            END as rev_par_global,
            CASE
              WHEN hab.total_habitaciones > 0 AND dias.num_dias > 0
              THEN ROUND((dp.total_noches_vendidas::numeric / (hab.total_habitaciones * dias.num_dias) * 100), 2)
              ELSE 0
            END as occupancy_rate_global
          FROM datos_periodo dp
          CROSS JOIN habitaciones_disponibles hab
          CROSS JOIN dias_periodo dias;
        `;

        const resumenResult = await client.query(queryResumen, [fecha_desde, fecha_hasta]);
        const resumenData = resumenResult.rows[0];

        const resumen = {
          adr_global: parseFloat(resumenData.adr_global || 0),
          rev_par_global: parseFloat(resumenData.rev_par_global || 0),
          occupancy_rate_global: parseFloat(resumenData.occupancy_rate_global || 0),
          total_habitaciones_promedio: parseFloat(resumenData.total_habitaciones || 0),
          total_noches_vendidas: resumenData.total_noches_vendidas || 0,
          ingresos_totales_hospedaje: parseFloat(resumenData.ingresos_totales_hospedaje || 0),
          num_checkouts: resumenData.num_checkouts || 0
        };

        // ================================================================
        // RETORNAR RESULTADO
        // ================================================================
        return {
          fecha_desde,
          fecha_hasta,
          resumen,
          tendencia_diaria,
          promedios_por_tipo
        };

      } catch (error) {
        console.error('Error generando reporte ADR y RevPAR:', error);
        throw new Error('Error al generar el reporte ADR y RevPAR');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE COMPARATIVO DE PERÍODOS
     * Compara métricas entre dos períodos (ej: este mes vs mes anterior)
     */
    reporteComparativo: async (_, { fecha_desde_actual, fecha_hasta_actual, fecha_desde_anterior, fecha_hasta_anterior }, { pool, user }) => {
      // Debug: ver qué usuario llega
      console.log('📊 reporteComparativo - user:', user ? { id: user.id, usuario: user.usuario, rol: user.rol } : 'NULL');

      // Validar rol (solo admin y gerente)
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        console.log('❌ Acceso denegado. User:', user, 'Rol:', user?.rol);
        throw new Error('No autorizado para acceder a reportes');
      }

      const client = await pool.connect();

      try {
        // Función auxiliar para obtener métricas de un período
        const obtenerMetricasPeriodo = async (fechaDesde, fechaHasta) => {
          const queryMetricas = `
            WITH datos_hospedajes AS (
              SELECT
                COUNT(DISTINCT h.id)::integer as num_checkouts,
                COALESCE(SUM(h.noches_reales), 0)::integer as noches_vendidas,
                COALESCE(SUM(h.noches_reales * h.precio_noche), 0) as ingresos_hospedaje
              FROM hospedajes h
              WHERE h.fecha_entrada BETWEEN $1 AND $2
                AND h.estado IN ('activo', 'finalizado')
            ),
            datos_consumos AS (
              SELECT COALESCE(SUM(c.precio_total), 0) as ingresos_consumos
              FROM consumos_habitacion c
              INNER JOIN hospedajes h ON h.id = c.hospedaje_id
              WHERE h.fecha_entrada BETWEEN $1 AND $2
                AND c.facturado = true
            ),
            datos_reservas AS (
              SELECT COUNT(*)::integer as num_reservas
              FROM reservas r
              WHERE r.created_at BETWEEN $1 AND $2
            ),
            datos_facturas AS (
              SELECT
                COUNT(*)::integer as num_facturas,
                COALESCE(AVG(total), 0) as ticket_promedio
              FROM facturas f
              WHERE f.fecha BETWEEN $1 AND $2
                AND f.estado != 'anulada'
            ),
            habitaciones_totales AS (
              SELECT COUNT(*)::integer as total_habitaciones
              FROM habitaciones
              WHERE activa = true
            ),
            dias_periodo AS (
              SELECT (DATE($2) - DATE($1) + 1) as num_dias
            )
            SELECT
              dh.num_checkouts,
              dh.noches_vendidas,
              dh.ingresos_hospedaje,
              dc.ingresos_consumos,
              (dh.ingresos_hospedaje + dc.ingresos_consumos) as ingresos_totales,
              dr.num_reservas,
              df.ticket_promedio,
              CASE
                WHEN dh.noches_vendidas > 0 THEN ROUND((dh.ingresos_hospedaje / dh.noches_vendidas)::numeric, 2)
                ELSE 0
              END as adr,
              CASE
                WHEN ht.total_habitaciones > 0 AND dp.num_dias > 0
                THEN ROUND((dh.ingresos_hospedaje / (ht.total_habitaciones * dp.num_dias))::numeric, 2)
                ELSE 0
              END as rev_par,
              CASE
                WHEN ht.total_habitaciones > 0 AND dp.num_dias > 0
                THEN ROUND((dh.noches_vendidas::numeric / (ht.total_habitaciones * dp.num_dias) * 100), 2)
                ELSE 0
              END as ocupacion_promedio
            FROM datos_hospedajes dh
            CROSS JOIN datos_consumos dc
            CROSS JOIN datos_reservas dr
            CROSS JOIN datos_facturas df
            CROSS JOIN habitaciones_totales ht
            CROSS JOIN dias_periodo dp;
          `;

          const result = await client.query(queryMetricas, [fechaDesde, fechaHasta]);
          console.log('📊 Query resultados:', result.rows.length, 'filas para período:', fechaDesde, '-', fechaHasta);

          // Si no hay datos, retornar valores por defecto
          if (!result.rows || result.rows.length === 0) {
            console.log('⚠️ Sin datos para el período:', fechaDesde, '-', fechaHasta);
            return {
              ingresos_totales: 0,
              ingresos_hospedaje: 0,
              ingresos_consumos: 0,
              ocupacion_promedio: 0,
              adr: 0,
              rev_par: 0,
              num_checkouts: 0,
              num_reservas: 0,
              noches_vendidas: 0,
              ticket_promedio: 0
            };
          }

          const data = result.rows[0];

          return {
            ingresos_totales: parseFloat(data.ingresos_totales || 0),
            ingresos_hospedaje: parseFloat(data.ingresos_hospedaje || 0),
            ingresos_consumos: parseFloat(data.ingresos_consumos || 0),
            ocupacion_promedio: parseFloat(data.ocupacion_promedio || 0),
            adr: parseFloat(data.adr || 0),
            rev_par: parseFloat(data.rev_par || 0),
            num_checkouts: data.num_checkouts || 0,
            num_reservas: data.num_reservas || 0,
            noches_vendidas: data.noches_vendidas || 0,
            ticket_promedio: parseFloat(data.ticket_promedio || 0)
          };
        };

        // Obtener métricas de ambos períodos
        const metricas_actual = await obtenerMetricasPeriodo(fecha_desde_actual, fecha_hasta_actual);
        const metricas_anterior = await obtenerMetricasPeriodo(fecha_desde_anterior, fecha_hasta_anterior);

        // Calcular días de cada período
        const diasActual = Math.ceil((new Date(fecha_hasta_actual) - new Date(fecha_desde_actual)) / (1000 * 60 * 60 * 24)) + 1;
        const diasAnterior = Math.ceil((new Date(fecha_hasta_anterior) - new Date(fecha_desde_anterior)) / (1000 * 60 * 60 * 24)) + 1;

        // Función para calcular variación
        const calcularVariacion = (actual, anterior) => {
          const variacion_absoluta = actual - anterior;
          const variacion_porcentual = anterior !== 0 ? ((actual - anterior) / anterior) * 100 : (actual > 0 ? 100 : 0);
          const tendencia = variacion_absoluta > 0 ? 'up' : (variacion_absoluta < 0 ? 'down' : 'stable');
          return { variacion_absoluta, variacion_porcentual, tendencia };
        };

        // Generar comparaciones
        const comparaciones = [
          {
            metrica: 'Ingresos Totales',
            periodo_actual: metricas_actual.ingresos_totales,
            periodo_anterior: metricas_anterior.ingresos_totales,
            ...calcularVariacion(metricas_actual.ingresos_totales, metricas_anterior.ingresos_totales)
          },
          {
            metrica: 'Ingresos Hospedaje',
            periodo_actual: metricas_actual.ingresos_hospedaje,
            periodo_anterior: metricas_anterior.ingresos_hospedaje,
            ...calcularVariacion(metricas_actual.ingresos_hospedaje, metricas_anterior.ingresos_hospedaje)
          },
          {
            metrica: 'Ingresos Consumos',
            periodo_actual: metricas_actual.ingresos_consumos,
            periodo_anterior: metricas_anterior.ingresos_consumos,
            ...calcularVariacion(metricas_actual.ingresos_consumos, metricas_anterior.ingresos_consumos)
          },
          {
            metrica: 'Ocupación %',
            periodo_actual: metricas_actual.ocupacion_promedio,
            periodo_anterior: metricas_anterior.ocupacion_promedio,
            ...calcularVariacion(metricas_actual.ocupacion_promedio, metricas_anterior.ocupacion_promedio)
          },
          {
            metrica: 'ADR',
            periodo_actual: metricas_actual.adr,
            periodo_anterior: metricas_anterior.adr,
            ...calcularVariacion(metricas_actual.adr, metricas_anterior.adr)
          },
          {
            metrica: 'RevPAR',
            periodo_actual: metricas_actual.rev_par,
            periodo_anterior: metricas_anterior.rev_par,
            ...calcularVariacion(metricas_actual.rev_par, metricas_anterior.rev_par)
          },
          {
            metrica: 'Check-outs',
            periodo_actual: metricas_actual.num_checkouts,
            periodo_anterior: metricas_anterior.num_checkouts,
            ...calcularVariacion(metricas_actual.num_checkouts, metricas_anterior.num_checkouts)
          },
          {
            metrica: 'Reservas',
            periodo_actual: metricas_actual.num_reservas,
            periodo_anterior: metricas_anterior.num_reservas,
            ...calcularVariacion(metricas_actual.num_reservas, metricas_anterior.num_reservas)
          },
          {
            metrica: 'Noches Vendidas',
            periodo_actual: metricas_actual.noches_vendidas,
            periodo_anterior: metricas_anterior.noches_vendidas,
            ...calcularVariacion(metricas_actual.noches_vendidas, metricas_anterior.noches_vendidas)
          },
          {
            metrica: 'Ticket Promedio',
            periodo_actual: metricas_actual.ticket_promedio,
            periodo_anterior: metricas_anterior.ticket_promedio,
            ...calcularVariacion(metricas_actual.ticket_promedio, metricas_anterior.ticket_promedio)
          }
        ];

        // Retornar resultado
        return {
          periodo_actual: {
            fecha_desde: fecha_desde_actual,
            fecha_hasta: fecha_hasta_actual,
            dias: diasActual,
            etiqueta: 'Período Actual'
          },
          periodo_anterior: {
            fecha_desde: fecha_desde_anterior,
            fecha_hasta: fecha_hasta_anterior,
            dias: diasAnterior,
            etiqueta: 'Período Anterior'
          },
          metricas_actual,
          metricas_anterior,
          comparaciones
        };

      } catch (error) {
        console.error('❌ Error generando reporte comparativo:', error.message);
        console.error('Stack:', error.stack);
        throw new Error(`Error al generar el reporte comparativo: ${error.message}`);
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE FUENTES DE RESERVA (CANALES)
     * Analiza el performance de cada canal de reserva
     */
    reporteFuentesReserva: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // Mapeo de canales a nombres y colores
        const canalInfo = {
          'directo': { nombre: 'Directo (Recepción)', color: '#10b981' },
          'booking': { nombre: 'Booking.com', color: '#003580' },
          'airbnb': { nombre: 'Airbnb', color: '#ff5a5f' },
          'expedia': { nombre: 'Expedia', color: '#ffc000' },
          'telefono': { nombre: 'Teléfono', color: '#3b82f6' },
          'web': { nombre: 'Web Propia', color: '#8b5cf6' },
          'walk_in': { nombre: 'Walk-in', color: '#06b6d4' }
        };

        // Estadísticas por canal
        const queryCanales = `
          SELECT
            COALESCE(r.canal_reserva, 'directo') as canal,
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE r.estado = 'confirmada')::integer as confirmadas,
            COUNT(*) FILTER (WHERE r.estado = 'cancelada')::integer as canceladas,
            COUNT(*) FILTER (WHERE r.estado = 'no_show')::integer as no_show,
            COALESCE(SUM(r.precio_total), 0)::float as ingresos_totales,
            COALESCE(AVG(r.precio_total), 0)::float as ingresos_promedio,
            COALESCE(SUM(
              CASE
                WHEN r.fecha_salida IS NOT NULL AND r.fecha_entrada IS NOT NULL
                THEN (r.fecha_salida::date - r.fecha_entrada::date)
                ELSE 1
              END
            ), 0)::integer as noches_totales,
            cr.comision_pct
          FROM reservas r
          LEFT JOIN canales_reserva cr ON cr.codigo = r.canal_reserva
          WHERE r.fecha_entrada::date >= $1::date
            AND r.fecha_entrada::date <= $2::date
          GROUP BY COALESCE(r.canal_reserva, 'directo'), cr.comision_pct
          ORDER BY total_reservas DESC;
        `;

        const resultCanales = await client.query(queryCanales, [fecha_desde, fecha_hasta]);

        // Procesar canales con información adicional
        const canales = resultCanales.rows.map(row => {
          const info = canalInfo[row.canal] || { nombre: row.canal, color: '#6b7280' };
          const comision_pct = row.comision_pct || 0;
          const comision_estimada = row.ingresos_totales * (comision_pct / 100);

          return {
            canal: row.canal,
            canal_nombre: info.nombre,
            color: info.color,
            total_reservas: row.total_reservas,
            confirmadas: row.confirmadas,
            canceladas: row.canceladas,
            no_show: row.no_show,
            tasa_confirmacion: row.total_reservas > 0
              ? (row.confirmadas / row.total_reservas) * 100
              : 0,
            tasa_cancelacion: row.total_reservas > 0
              ? (row.canceladas / row.total_reservas) * 100
              : 0,
            ingresos_totales: row.ingresos_totales,
            ingresos_promedio: row.ingresos_promedio,
            comision_pct: comision_pct,
            comision_estimada: comision_estimada,
            noches_totales: row.noches_totales
          };
        });

        // Calcular totales
        const totalReservas = canales.reduce((sum, c) => sum + c.total_reservas, 0);
        const totalConfirmadas = canales.reduce((sum, c) => sum + c.confirmadas, 0);
        const totalCanceladas = canales.reduce((sum, c) => sum + c.canceladas, 0);
        const totalNoShow = canales.reduce((sum, c) => sum + c.no_show, 0);
        const ingresosTotales = canales.reduce((sum, c) => sum + c.ingresos_totales, 0);
        const comisionesEstimadas = canales.reduce((sum, c) => sum + c.comision_estimada, 0);

        // Canal principal
        const canalPrincipal = canales.length > 0 ? canales[0].canal_nombre : 'N/A';

        // Calcular porcentaje directo vs OTAs
        const reservasDirectas = canales
          .filter(c => ['directo', 'telefono', 'web', 'walk_in'].includes(c.canal))
          .reduce((sum, c) => sum + c.total_reservas, 0);
        const reservasOTAs = canales
          .filter(c => ['booking', 'airbnb', 'expedia'].includes(c.canal))
          .reduce((sum, c) => sum + c.total_reservas, 0);

        const pctDirecto = totalReservas > 0 ? (reservasDirectas / totalReservas) * 100 : 0;
        const pctOTAs = totalReservas > 0 ? (reservasOTAs / totalReservas) * 100 : 0;

        // Tendencia diaria por canal
        const queryTendencia = `
          SELECT
            fecha_entrada::date as fecha,
            COUNT(*) FILTER (WHERE COALESCE(canal_reserva, 'directo') = 'directo')::integer as directo,
            COUNT(*) FILTER (WHERE canal_reserva = 'booking')::integer as booking,
            COUNT(*) FILTER (WHERE canal_reserva = 'airbnb')::integer as airbnb,
            COUNT(*) FILTER (WHERE canal_reserva = 'expedia')::integer as expedia,
            COUNT(*) FILTER (WHERE canal_reserva = 'telefono')::integer as telefono,
            COUNT(*) FILTER (WHERE canal_reserva = 'web')::integer as web,
            COUNT(*) FILTER (WHERE canal_reserva = 'walk_in')::integer as walk_in,
            COUNT(*) FILTER (WHERE canal_reserva NOT IN ('directo', 'booking', 'airbnb', 'expedia', 'telefono', 'web', 'walk_in'))::integer as otros
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY fecha_entrada::date
          ORDER BY fecha;
        `;

        const resultTendencia = await client.query(queryTendencia, [fecha_desde, fecha_hasta]);

        return {
          fecha_desde,
          fecha_hasta,
          resumen: {
            total_reservas: totalReservas,
            total_confirmadas: totalConfirmadas,
            total_canceladas: totalCanceladas,
            total_noshow: totalNoShow,
            ingresos_totales: ingresosTotales,
            canal_principal: canalPrincipal,
            pct_directo: pctDirecto,
            pct_otas: pctOTAs,
            comisiones_estimadas: comisionesEstimadas
          },
          canales,
          tendencia_diaria: resultTendencia.rows
        };

      } catch (error) {
        console.error('Error generando reporte de fuentes de reserva:', error);
        throw new Error('Error al generar el reporte de fuentes de reserva');
      } finally {
        client.release();
      }
    },

    /**
     * REPORTE DE ANÁLISIS DE CANCELACIONES
     * Analiza patrones de cancelación, no-show y tasas por canal
     */
    reporteCancelaciones: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      // Validar rol
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      // Validar fechas
      if (new Date(fecha_desde) > new Date(fecha_hasta)) {
        throw new Error('La fecha inicial no puede ser mayor a la fecha final');
      }

      const client = await pool.connect();

      try {
        // Mapeo de canales a nombres
        const canalNombres = {
          'directo': 'Directo (Recepción)',
          'booking': 'Booking.com',
          'airbnb': 'Airbnb',
          'expedia': 'Expedia',
          'telefono': 'Teléfono',
          'web': 'Web Propia',
          'walk_in': 'Walk-in'
        };

        // Nombres de días de la semana
        const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Resumen general
        const queryResumen = `
          SELECT
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as total_canceladas,
            COUNT(*) FILTER (WHERE estado = 'no_show')::integer as total_noshow,
            COUNT(*) FILTER (WHERE estado IN ('confirmada', 'en_curso', 'finalizada'))::integer as total_completadas,
            COALESCE(SUM(precio_total) FILTER (WHERE estado IN ('cancelada', 'no_show')), 0)::float as ingresos_perdidos,
            COALESCE(SUM(anticipo) FILTER (WHERE estado IN ('cancelada', 'no_show')), 0)::float as anticipos_perdidos,
            COALESCE(AVG(
              CASE
                WHEN estado = 'cancelada' AND cancelled_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (cancelled_at - created_at)) / 86400
                ELSE NULL
              END
            ), 0)::float as lead_time_promedio
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date;
        `;

        const resultResumen = await client.query(queryResumen, [fecha_desde, fecha_hasta]);
        const resumenRow = resultResumen.rows[0];

        const totalReservas = resumenRow.total_reservas || 0;
        const totalCanceladas = resumenRow.total_canceladas || 0;
        const totalNoshow = resumenRow.total_noshow || 0;
        const totalCompletadas = resumenRow.total_completadas || 0;

        const resumen = {
          total_reservas: totalReservas,
          total_canceladas: totalCanceladas,
          total_noshow: totalNoshow,
          total_completadas: totalCompletadas,
          tasa_cancelacion: totalReservas > 0 ? (totalCanceladas / totalReservas) * 100 : 0,
          tasa_noshow: totalReservas > 0 ? (totalNoshow / totalReservas) * 100 : 0,
          tasa_completitud: totalReservas > 0 ? (totalCompletadas / totalReservas) * 100 : 0,
          ingresos_perdidos: resumenRow.ingresos_perdidos,
          anticipos_perdidos: resumenRow.anticipos_perdidos,
          lead_time_promedio: resumenRow.lead_time_promedio
        };

        // Por canal
        const queryPorCanal = `
          SELECT
            COALESCE(canal_reserva, 'directo') as canal,
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas,
            COUNT(*) FILTER (WHERE estado = 'no_show')::integer as noshow,
            COALESCE(SUM(precio_total) FILTER (WHERE estado IN ('cancelada', 'no_show')), 0)::float as ingresos_perdidos
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY COALESCE(canal_reserva, 'directo')
          ORDER BY canceladas DESC;
        `;

        const resultPorCanal = await client.query(queryPorCanal, [fecha_desde, fecha_hasta]);

        const porCanal = resultPorCanal.rows.map(row => ({
          canal: row.canal,
          canal_nombre: canalNombres[row.canal] || row.canal,
          total_reservas: row.total_reservas,
          canceladas: row.canceladas,
          noshow: row.noshow,
          tasa_cancelacion: row.total_reservas > 0 ? (row.canceladas / row.total_reservas) * 100 : 0,
          tasa_noshow: row.total_reservas > 0 ? (row.noshow / row.total_reservas) * 100 : 0,
          ingresos_perdidos: row.ingresos_perdidos
        }));

        // Por día de la semana (basado en fecha_entrada)
        const queryPorDia = `
          SELECT
            EXTRACT(DOW FROM fecha_entrada)::integer as dia_semana,
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY EXTRACT(DOW FROM fecha_entrada)
          ORDER BY dia_semana;
        `;

        const resultPorDia = await client.query(queryPorDia, [fecha_desde, fecha_hasta]);

        const porDiaSemana = resultPorDia.rows.map(row => ({
          dia_semana: row.dia_semana,
          dia_nombre: diasNombres[row.dia_semana],
          total_reservas: row.total_reservas,
          canceladas: row.canceladas,
          tasa_cancelacion: row.total_reservas > 0 ? (row.canceladas / row.total_reservas) * 100 : 0
        }));

        // Por anticipación (días entre reserva y llegada)
        const queryPorAnticipacion = `
          SELECT
            CASE
              WHEN (fecha_entrada::date - created_at::date) <= 1 THEN '0-1'
              WHEN (fecha_entrada::date - created_at::date) <= 7 THEN '2-7'
              WHEN (fecha_entrada::date - created_at::date) <= 14 THEN '8-14'
              WHEN (fecha_entrada::date - created_at::date) <= 30 THEN '15-30'
              ELSE '31+'
            END as rango,
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY
            fecha_entrada::date,
            created_at::date
          ORDER BY
            CASE
              WHEN (fecha_entrada::date - created_at::date) <= 1 THEN 1
              WHEN (fecha_entrada::date - created_at::date) <= 7 THEN 2
              WHEN (fecha_entrada::date - created_at::date) <= 14 THEN 3
              WHEN (fecha_entrada::date - created_at::date) <= 30 THEN 4
              ELSE 5
            END;
        `;

        const resultPorAnticipacion = await client.query(queryPorAnticipacion, [fecha_desde, fecha_hasta]);

        const descripcionesAnticipacion = {
          '0-1': 'Mismo día o día anterior',
          '2-7': '2 a 7 días antes',
          '8-14': '1 a 2 semanas antes',
          '15-30': '2 a 4 semanas antes',
          '31+': 'Más de 1 mes antes'
        };

        const porAnticipacion = resultPorAnticipacion.rows.map(row => ({
          rango: row.rango,
          total_reservas: row.total_reservas,
          canceladas: row.canceladas,
          tasa_cancelacion: row.total_reservas > 0 ? (row.canceladas / row.total_reservas) * 100 : 0,
          descripcion: descripcionesAnticipacion[row.rango] || row.rango
        }));

        // Tendencia diaria
        const queryTendencia = `
          SELECT
            fecha_entrada::date as fecha,
            COUNT(*)::integer as total_reservas,
            COUNT(*) FILTER (WHERE estado = 'cancelada')::integer as canceladas,
            COUNT(*) FILTER (WHERE estado = 'no_show')::integer as noshow
          FROM reservas
          WHERE fecha_entrada::date >= $1::date
            AND fecha_entrada::date <= $2::date
          GROUP BY fecha_entrada::date
          ORDER BY fecha;
        `;

        const resultTendencia = await client.query(queryTendencia, [fecha_desde, fecha_hasta]);

        const tendencia = resultTendencia.rows.map(row => ({
          fecha: row.fecha,
          total_reservas: row.total_reservas,
          canceladas: row.canceladas,
          noshow: row.noshow,
          tasa_cancelacion: row.total_reservas > 0 ? (row.canceladas / row.total_reservas) * 100 : 0
        }));

        return {
          fecha_desde,
          fecha_hasta,
          resumen,
          por_canal: porCanal,
          por_dia_semana: porDiaSemana,
          por_anticipacion: porAnticipacion,
          tendencia
        };

      } catch (error) {
        console.error('Error generando reporte de cancelaciones:', error);
        throw new Error('Error al generar el reporte de cancelaciones');
      } finally {
        client.release();
      }
    },

    // ========================================================================
    // REPORTE LIBRO DE VENTAS DIAN
    // ========================================================================
    reporteLibroVentas: async (_, { fecha_desde, fecha_hasta }, { pool, user }) => {
      if (!user || (user.rol !== 'admin' && user.rol !== 'gerente')) {
        throw new Error('No autorizado. Se requiere rol de administrador o gerente.');
      }

      const client = await pool.connect();

      try {
        // ================================================================
        // 1. LISTADO DE FACTURAS ELECTRÓNICAS
        // ================================================================
        const queryFacturas = `
          SELECT
            fe.id as factura_electronica_id,
            COALESCE(fe.numero_factura_electronica, fe.numero_factus, CONCAT(COALESCE(f.prefijo, ''), f.numero_factura)) as numero_factura_dian,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura_interna,
            COALESCE(fe.fecha_emision, f.fecha, f.created_at) as fecha_factura,
            fe.cufe,
            'FV' as tipo_documento,
            COALESCE(c.nombre, 'Consumidor Final') as cliente_nombre,
            COALESCE(td.codigo_interno, 'CC') as cliente_tipo_documento,
            COALESCE(c.numero_documento, '222222222222') as cliente_numero_documento,
            f.subtotal::float as base_gravable,
            (f.total - f.subtotal)::float as iva,
            f.total::float as total,
            COALESCE(fe.factus_status, 'No Transmitida') as estado_dian,
            fe.fecha_envio_factus as fecha_envio
          FROM facturas_electronicas fe
          INNER JOIN facturas f ON f.id = fe.factura_id
          LEFT JOIN clientes c ON c.id = f.cliente_id
          LEFT JOIN tipos_documento_dian td ON td.codigo_dian = c.tipo_documento_dian
          WHERE f.fecha::date BETWEEN $1::date AND $2::date
            AND f.estado != 'anulada'
          ORDER BY f.fecha DESC;
        `;

        const facturasResult = await client.query(queryFacturas, [fecha_desde, fecha_hasta]);

        // Mapeo de estados factus_status a nombres amigables
        const mapearEstadoDian = (factusStatus) => {
          const mapeo = {
            'approved': 'Aceptada',
            'Created': 'Aceptada',
            'rejected': 'Rechazada',
            'error': 'Rechazada',
            'pending': 'Pendiente',
            'No Transmitida': 'No Transmitida'
          };
          return mapeo[factusStatus] || 'No Transmitida';
        };

        const facturas = facturasResult.rows.map(row => ({
          factura_electronica_id: row.factura_electronica_id,
          numero_factura_dian: row.numero_factura_dian,
          numero_factura_interna: row.numero_factura_interna,
          fecha_factura: row.fecha_factura,
          cufe: row.cufe,
          tipo_documento: row.tipo_documento,
          cliente_nombre: row.cliente_nombre,
          cliente_tipo_documento: row.cliente_tipo_documento,
          cliente_numero_documento: row.cliente_numero_documento,
          base_gravable: parseFloat(row.base_gravable || 0),
          iva: parseFloat(row.iva || 0),
          total: parseFloat(row.total || 0),
          estado_dian: mapearEstadoDian(row.estado_dian),
          fecha_envio: row.fecha_envio
        }));

        // ================================================================
        // 2. RESUMEN GENERAL
        // ================================================================
        const total_facturas = facturas.length;
        const total_facturas_aceptadas = facturas.filter(f => f.estado_dian === 'Aceptada').length;
        const total_facturas_rechazadas = facturas.filter(f => f.estado_dian === 'Rechazada').length;
        const total_facturas_pendientes = facturas.filter(f => f.estado_dian === 'Pendiente').length;
        const total_facturas_no_transmitidas = facturas.filter(f => f.estado_dian === 'No Transmitida').length;

        const base_gravable_total = facturas.reduce((sum, f) => sum + f.base_gravable, 0);
        const iva_total = facturas.reduce((sum, f) => sum + f.iva, 0);
        const gran_total = facturas.reduce((sum, f) => sum + f.total, 0);

        const resumen = {
          total_facturas,
          total_facturas_aceptadas,
          total_facturas_rechazadas,
          total_facturas_pendientes,
          total_facturas_no_transmitidas,
          base_gravable_total,
          iva_total,
          gran_total
        };

        // ================================================================
        // 3. AGRUPACIÓN POR ESTADO DIAN
        // ================================================================
        const estadosMap = {};
        facturas.forEach(f => {
          if (!estadosMap[f.estado_dian]) {
            estadosMap[f.estado_dian] = {
              estado_dian: f.estado_dian,
              cantidad: 0,
              base_gravable: 0,
              iva: 0,
              total: 0
            };
          }
          estadosMap[f.estado_dian].cantidad++;
          estadosMap[f.estado_dian].base_gravable += f.base_gravable;
          estadosMap[f.estado_dian].iva += f.iva;
          estadosMap[f.estado_dian].total += f.total;
        });

        const por_estado = Object.values(estadosMap);

        return {
          fecha_desde,
          fecha_hasta,
          resumen,
          facturas,
          por_estado
        };

      } catch (error) {
        console.error('Error generando reporte libro de ventas:', error);
        throw new Error('Error al generar el reporte libro de ventas');
      } finally {
        client.release();
      }
    },

    // ================================================================
    // REPORTE DE IVA
    // ================================================================
    reporteIVA: async (_, { fechaDesde, fechaHasta }, { user, pool }) => {
      // Validar autorización
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      if (!fechaDesde || !fechaHasta) {
        throw new Error('Debe especificar fechas de inicio y fin');
      }

      const client = await pool.connect();
      try {
        // ================================================================
        // 1. OBTENER CONFIGURACIÓN DE TARIFAS IVA
        // ================================================================
        const configResult = await client.query(`
          SELECT
            COALESCE(iva_hospedaje, 19) as iva_hospedaje,
            COALESCE(iva_consumos, 19) as iva_consumos,
            COALESCE(iva_servicios, 19) as iva_servicios
          FROM parametros_generales
          LIMIT 1
        `);

        const tarifas = configResult.rows[0] || { iva_hospedaje: 19, iva_consumos: 19, iva_servicios: 19 };

        // ================================================================
        // 2. CONSULTA DE FACTURAS CON DESGLOSE DE IVA
        // ================================================================
        const queryFacturas = `
          SELECT
            f.id as factura_id,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura,
            f.fecha,
            COALESCE(ch.nombre, cp.nombre, 'Consumidor Final') as cliente_nombre,
            COALESCE(ch.numero_documento, cp.numero_documento, '') as cliente_documento,
            COALESCE(f.subtotal, 0) as base_gravable,
            COALESCE(f.iva, 0) as iva_generado,
            COALESCE(f.total, 0) as total,
            CASE
              WHEN f.hospedaje_id IS NOT NULL THEN 'Hospedaje'
              WHEN vp.id IS NOT NULL THEN 'POS'
              ELSE 'Otro'
            END as categoria,
            CASE
              WHEN f.hospedaje_id IS NOT NULL THEN $3
              WHEN vp.id IS NOT NULL THEN $4
              ELSE $5
            END as tarifa_iva
          FROM facturas f
          LEFT JOIN hospedajes h ON h.id = f.hospedaje_id
          LEFT JOIN huespedes hu ON hu.id = h.huesped_id
          LEFT JOIN clientes ch ON ch.id = hu.cliente_id
          LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
          LEFT JOIN clientes cp ON cp.id = vp.cliente_id
          WHERE f.fecha >= $1::date AND f.fecha <= $2::date
            AND f.estado != 'anulada'
          ORDER BY f.fecha DESC
        `;

        const facturasResult = await client.query(queryFacturas, [
          fechaDesde,
          fechaHasta,
          tarifas.iva_hospedaje,
          tarifas.iva_consumos,
          tarifas.iva_servicios
        ]);

        const detalles = facturasResult.rows.map(row => ({
          factura_id: row.factura_id,
          numero_factura: row.numero_factura || `FAC-${row.factura_id}`,
          fecha: row.fecha ? new Date(row.fecha).toISOString() : '',
          cliente_nombre: row.cliente_nombre,
          cliente_documento: row.cliente_documento,
          base_gravable: parseFloat(row.base_gravable) || 0,
          tarifa_iva: parseFloat(row.tarifa_iva) || 19,
          iva_generado: parseFloat(row.iva_generado) || 0,
          total: parseFloat(row.total) || 0,
          categoria: row.categoria
        }));

        // ================================================================
        // 3. CALCULAR RESUMEN
        // ================================================================
        let ivaHospedaje = 0, ivaConsumos = 0, ivaServicios = 0;
        let baseGravableTotal = 0, baseExentaTotal = 0, ivaTotal = 0, granTotal = 0;

        detalles.forEach(d => {
          baseGravableTotal += d.base_gravable;
          ivaTotal += d.iva_generado;
          granTotal += d.total;

          if (d.categoria === 'Hospedaje') {
            ivaHospedaje += d.iva_generado;
          } else if (d.categoria === 'POS') {
            ivaConsumos += d.iva_generado;
          } else {
            ivaServicios += d.iva_generado;
          }
        });

        const resumen = {
          total_facturas: detalles.length,
          base_gravable_total: baseGravableTotal,
          base_exenta_total: baseExentaTotal,
          iva_hospedaje: ivaHospedaje,
          iva_consumos: ivaConsumos,
          iva_servicios: ivaServicios,
          iva_total: ivaTotal,
          gran_total: granTotal
        };

        // ================================================================
        // 4. AGRUPACIÓN POR TARIFA
        // ================================================================
        const tarifasMap = {};
        detalles.forEach(d => {
          const tarifa = d.tarifa_iva;
          if (!tarifasMap[tarifa]) {
            tarifasMap[tarifa] = {
              tarifa: tarifa,
              base_gravable: 0,
              iva_generado: 0,
              cantidad: 0
            };
          }
          tarifasMap[tarifa].base_gravable += d.base_gravable;
          tarifasMap[tarifa].iva_generado += d.iva_generado;
          tarifasMap[tarifa].cantidad++;
        });

        const por_tarifa = Object.values(tarifasMap).sort((a, b) => b.tarifa - a.tarifa);

        // ================================================================
        // 5. AGRUPACIÓN POR CATEGORÍA
        // ================================================================
        const categoriasMap = {};
        detalles.forEach(d => {
          if (!categoriasMap[d.categoria]) {
            categoriasMap[d.categoria] = {
              categoria: d.categoria,
              base_gravable: 0,
              iva: 0,
              cantidad: 0
            };
          }
          categoriasMap[d.categoria].base_gravable += d.base_gravable;
          categoriasMap[d.categoria].iva += d.iva_generado;
          categoriasMap[d.categoria].cantidad++;
        });

        const por_categoria = Object.values(categoriasMap);

        return {
          resumen,
          detalles,
          por_tarifa,
          por_categoria
        };

      } catch (error) {
        console.error('Error generando reporte IVA:', error);
        throw new Error('Error al generar el reporte de IVA');
      } finally {
        client.release();
      }
    },

    // ================================================================
    // REPORTE DE ICA
    // ================================================================
    reporteICA: async (_, { fechaDesde, fechaHasta }, { user, pool }) => {
      // Validar autorización
      if (!user || !['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No autorizado para acceder a reportes');
      }

      if (!fechaDesde || !fechaHasta) {
        throw new Error('Debe especificar fechas de inicio y fin');
      }

      const client = await pool.connect();
      try {
        // ================================================================
        // 1. OBTENER CONFIGURACIÓN DE ICA
        // ================================================================
        const configResult = await client.query(`
          SELECT
            COALESCE(aplica_ica, false) as aplica_ica,
            COALESCE(porcentaje_ica, 0.966) as porcentaje_ica
          FROM parametros_generales
          LIMIT 1
        `);

        const config = configResult.rows[0] || { aplica_ica: false, porcentaje_ica: 0.966 };
        const tarifaICA = parseFloat(config.porcentaje_ica);
        const aplicaICA = config.aplica_ica;

        // ================================================================
        // 2. CONSULTA DE FACTURAS CON CÁLCULO DE ICA
        // ================================================================
        const queryFacturas = `
          SELECT
            f.id as factura_id,
            COALESCE(f.prefijo, '') || f.numero_factura as numero_factura,
            f.fecha,
            COALESCE(ch.nombre, cp.nombre, 'Consumidor Final') as cliente_nombre,
            COALESCE(f.total, 0) as ingresos,
            COALESCE(f.total, 0) * ($3 / 100) as ica_calculado
          FROM facturas f
          LEFT JOIN hospedajes h ON h.id = f.hospedaje_id
          LEFT JOIN huespedes hu ON hu.id = h.huesped_id
          LEFT JOIN clientes ch ON ch.id = hu.cliente_id
          LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
          LEFT JOIN clientes cp ON cp.id = vp.cliente_id
          WHERE f.fecha >= $1::date AND f.fecha <= $2::date
            AND f.estado != 'anulada'
          ORDER BY f.fecha DESC
        `;

        const facturasResult = await client.query(queryFacturas, [
          fechaDesde,
          fechaHasta,
          tarifaICA
        ]);

        const detalles = facturasResult.rows.map(row => ({
          factura_id: row.factura_id,
          numero_factura: row.numero_factura || `FAC-${row.factura_id}`,
          fecha: row.fecha ? new Date(row.fecha).toISOString() : '',
          cliente_nombre: row.cliente_nombre,
          ingresos: parseFloat(row.ingresos) || 0,
          ica_calculado: parseFloat(row.ica_calculado) || 0
        }));

        // ================================================================
        // 3. CALCULAR RESUMEN
        // ================================================================
        let ingresosBrutosTotal = 0;
        let icaTotal = 0;

        detalles.forEach(d => {
          ingresosBrutosTotal += d.ingresos;
          icaTotal += d.ica_calculado;
        });

        const resumen = {
          ingresos_brutos_total: ingresosBrutosTotal,
          tarifa_ica: tarifaICA,
          ica_total: icaTotal,
          total_facturas: detalles.length,
          aplica_ica: aplicaICA
        };

        // ================================================================
        // 4. AGRUPACIÓN POR MES
        // ================================================================
        const mesesMap = {};
        detalles.forEach(d => {
          if (!d.fecha) return;
          const fecha = new Date(d.fecha);
          const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          const mesNombre = fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });

          if (!mesesMap[mesKey]) {
            mesesMap[mesKey] = {
              mes: mesNombre,
              ingresos: 0,
              ica: 0,
              cantidad: 0
            };
          }
          mesesMap[mesKey].ingresos += d.ingresos;
          mesesMap[mesKey].ica += d.ica_calculado;
          mesesMap[mesKey].cantidad++;
        });

        const por_mes = Object.values(mesesMap).sort((a, b) => {
          // Ordenar cronológicamente
          return Object.keys(mesesMap).indexOf(
            Object.keys(mesesMap).find(k => mesesMap[k] === a)
          ) - Object.keys(mesesMap).indexOf(
            Object.keys(mesesMap).find(k => mesesMap[k] === b)
          );
        });

        return {
          resumen,
          detalles,
          por_mes
        };

      } catch (error) {
        console.error('Error generando reporte ICA:', error);
        throw new Error('Error al generar el reporte de ICA');
      } finally {
        client.release();
      }
    },
  },
};

module.exports = reportesResolvers;
