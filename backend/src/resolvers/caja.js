// =====================================================
// RESOLVER: CAJA - Sistema de Turnos de Caja
// Gestión de apertura/cierre de caja y movimientos
// =====================================================

const bcrypt = require('bcrypt');
const { agregarCierreACola, construirDatosCierre } = require('../services/cola-impresion');

const cajaResolvers = {
  // =====================================================
  // QUERIES
  // =====================================================
  Query: {
    // Obtener todas las cajas
    cajas: async (_, { activa }, { pool }) => {
      const query = activa !== undefined
        ? 'SELECT * FROM cajas WHERE activa = $1 ORDER BY codigo'
        : 'SELECT * FROM cajas ORDER BY codigo';

      const params = activa !== undefined ? [activa] : [];
      const result = await pool.query(query, params);
      return result.rows;
    },

    // Obtener caja por ID
    caja: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM cajas WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Obtener turnos abiertos
    turnosAbiertos: async (_, __, { pool }) => {
      const result = await pool.query(`
        SELECT * FROM turnos_caja
        WHERE estado = 'abierto'
        ORDER BY fecha_apertura DESC
      `);
      return result.rows;
    },

    // Obtener turno actual de una caja
    turnoActual: async (_, { caja_id }, { pool }) => {
      const result = await pool.query(`
        SELECT * FROM turnos_caja
        WHERE caja_id = $1 AND estado = 'abierto'
        ORDER BY fecha_apertura DESC
        LIMIT 1
      `, [caja_id]);
      return result.rows[0];
    },

    // Listar turnos con filtros
    turnosCaja: async (_, { fecha_desde, fecha_hasta, usuario_id }, { pool }) => {
      let query = 'SELECT * FROM turnos_caja WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (fecha_desde) {
        query += ` AND DATE(fecha_apertura) >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        query += ` AND DATE(fecha_apertura) <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      if (usuario_id) {
        query += ` AND usuario_id = $${paramCount}`;
        params.push(usuario_id);
        paramCount++;
      }

      query += ' ORDER BY fecha_apertura DESC';

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Obtener turno por ID
    turnoCaja: async (_, { id }, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Obtener resumen de turno
    resumenTurnoCaja: async (_, { turno_caja_id }, { pool }) => {
      // Obtener información del turno
      const turnoResult = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [turno_caja_id]
      );
      const turno = turnoResult.rows[0];

      if (!turno) {
        throw new Error('Turno no encontrado');
      }

      // Contar ventas y calcular total
      const ventasResult = await pool.query(`
        SELECT
          COUNT(*) as num_ventas,
          COALESCE(SUM(total), 0) as total_ventas
        FROM ventas_pos
        WHERE turno_caja_id = $1 AND estado_pago != 'anulado'
      `, [turno_caja_id]);

      // Calcular ingresos y egresos manuales (excluyendo fondo_inicial que ya está en monto_inicial)
      const movimientosResult = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND concepto != 'fondo_inicial' THEN monto ELSE 0 END), 0) as total_ingresos,
          COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos
        FROM movimientos_caja
        WHERE turno_caja_id = $1
      `, [turno_caja_id]);

      // Obtener ventas en EFECTIVO del turno (solo efectivo cuenta para el arqueo físico)
      const ventasEfectivoResult = await pool.query(`
        SELECT COALESCE(SUM(vpp.monto), 0) as total_efectivo
        FROM venta_pos_pagos vpp
        JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
        JOIN metodos_pago mp ON vpp.metodo_pago_id = mp.id
        WHERE vp.turno_caja_id = $1
          AND vp.estado_pago != 'anulado'
          AND LOWER(mp.nombre) = 'efectivo'
      `, [turno_caja_id]);

      const totalVentasEfectivo = parseFloat(ventasEfectivoResult.rows[0].total_efectivo) || 0;

      // Calcular efectivo esperado = base + ventas efectivo + ingresos manuales - egresos manuales
      const efectivo_esperado = parseFloat(turno.monto_inicial) +
        totalVentasEfectivo +
        parseFloat(movimientosResult.rows[0].total_ingresos) -
        parseFloat(movimientosResult.rows[0].total_egresos);

      // Obtener ingresos por método de pago
      const metodosPagoResult = await pool.query(`
        SELECT
          mp.id,
          mp.nombre,
          mp.tipo,
          mp.codigo_dian,
          mp.activo,
          COUNT(vpp.id) as cantidad,
          COALESCE(SUM(vpp.monto), 0) as total
        FROM metodos_pago mp
        LEFT JOIN venta_pos_pagos vpp ON mp.id = vpp.metodo_pago_id
        LEFT JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
        WHERE vp.turno_caja_id = $1 AND vp.estado_pago != 'anulado'
        GROUP BY mp.id, mp.nombre, mp.tipo, mp.codigo_dian, mp.activo
        HAVING COUNT(vpp.id) > 0
        ORDER BY total DESC
      `, [turno_caja_id]);

      return {
        turno,
        num_ventas: parseInt(ventasResult.rows[0].num_ventas),
        total_ventas: parseFloat(ventasResult.rows[0].total_ventas),
        total_ingresos: parseFloat(movimientosResult.rows[0].total_ingresos),
        total_egresos: parseFloat(movimientosResult.rows[0].total_egresos),
        efectivo_esperado,
        ingresos_por_metodo: metodosPagoResult.rows.map(row => ({
          metodo_pago: row,
          cantidad: parseInt(row.cantidad),
          total: parseFloat(row.total)
        }))
      };
    },

    // Detalle completo de turno de caja para visualización e impresión
    detalleTurnoCaja: async (_, { turno_caja_id }, { pool }) => {
      // Obtener información del turno
      const turnoResult = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [turno_caja_id]
      );
      const turno = turnoResult.rows[0];

      if (!turno) {
        throw new Error('Turno no encontrado');
      }

      // Obtener movimientos del turno
      const movimientosResult = await pool.query(`
        SELECT id, tipo, concepto, monto, descripcion, referencia, created_at
        FROM movimientos_caja
        WHERE turno_caja_id = $1
        ORDER BY created_at
      `, [turno_caja_id]);

      // Obtener arqueo del turno
      const arqueoResult = await pool.query(`
        SELECT id, denominacion, cantidad, valor_unitario, subtotal
        FROM arqueos_caja
        WHERE turno_caja_id = $1
        ORDER BY valor_unitario DESC
      `, [turno_caja_id]);

      // Obtener ventas por método de pago
      const ventasPorMetodoResult = await pool.query(`
        SELECT
          mp.nombre as metodo,
          COALESCE(SUM(vpp.monto), 0) as monto,
          COUNT(DISTINCT vp.id) as cantidad_transacciones
        FROM metodos_pago mp
        LEFT JOIN venta_pos_pagos vpp ON mp.id = vpp.metodo_pago_id
        LEFT JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
        WHERE vp.turno_caja_id = $1 AND vp.estado_pago != 'anulado'
        GROUP BY mp.nombre
        HAVING COALESCE(SUM(vpp.monto), 0) > 0
        ORDER BY monto DESC
      `, [turno_caja_id]);

      // Calcular totales
      const totalVentas = ventasPorMetodoResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.monto), 0
      );

      const totalIngresos = movimientosResult.rows
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + parseFloat(m.monto), 0);

      const totalEgresos = movimientosResult.rows
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + parseFloat(m.monto), 0);

      return {
        turno,
        movimientos: movimientosResult.rows,
        arqueo: arqueoResult.rows,
        ventas_por_metodo: ventasPorMetodoResult.rows.map(row => ({
          metodo: row.metodo,
          monto: parseFloat(row.monto),
          cantidad_transacciones: parseInt(row.cantidad_transacciones)
        })),
        total_ventas: totalVentas,
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos
      };
    },

    // Historial de turnos con resumen (para modal de historial)
    historialTurnos: async (_, { fecha_desde, fecha_hasta, usuario_id, estado, limit = 20, offset = 0 }, { pool }) => {
      // Construir query con filtros dinámicos
      let whereConditions = [];
      const params = [];
      let paramCount = 1;

      if (fecha_desde) {
        whereConditions.push(`DATE(tc.fecha_apertura) >= $${paramCount}`);
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        whereConditions.push(`DATE(tc.fecha_apertura) <= $${paramCount}`);
        params.push(fecha_hasta);
        paramCount++;
      }

      if (usuario_id) {
        whereConditions.push(`tc.usuario_id = $${paramCount}`);
        params.push(usuario_id);
        paramCount++;
      }

      if (estado) {
        whereConditions.push(`tc.estado = $${paramCount}`);
        params.push(estado);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Query principal con resumen de ventas
      const query = `
        SELECT
          tc.id,
          tc.codigo,
          tc.usuario_id,
          tc.fecha_apertura,
          tc.fecha_cierre,
          tc.monto_inicial,
          tc.monto_esperado,
          tc.monto_real,
          tc.diferencia,
          tc.estado,
          COALESCE(COUNT(vp.id) FILTER (WHERE vp.estado_pago != 'anulado'), 0) as num_ventas,
          COALESCE(SUM(vp.total) FILTER (WHERE vp.estado_pago != 'anulado'), 0) as total_ventas,
          COUNT(*) OVER() as total_registros
        FROM turnos_caja tc
        LEFT JOIN ventas_pos vp ON vp.turno_caja_id = tc.id
        ${whereClause}
        GROUP BY tc.id, tc.codigo, tc.usuario_id, tc.fecha_apertura, tc.fecha_cierre,
                 tc.monto_inicial, tc.monto_esperado, tc.monto_real, tc.diferencia, tc.estado
        ORDER BY tc.fecha_apertura DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);

      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_registros) : 0;

      // Mapear resultados
      const turnos = result.rows.map(row => ({
        id: row.id,
        codigo: row.codigo,
        usuario_id: row.usuario_id,
        fecha_apertura: row.fecha_apertura,
        fecha_cierre: row.fecha_cierre,
        monto_inicial: parseFloat(row.monto_inicial) || 0,
        monto_esperado: row.monto_esperado ? parseFloat(row.monto_esperado) : null,
        monto_real: row.monto_real ? parseFloat(row.monto_real) : null,
        diferencia: row.diferencia ? parseFloat(row.diferencia) : null,
        estado: row.estado,
        num_ventas: parseInt(row.num_ventas),
        total_ventas: parseFloat(row.total_ventas)
      }));

      return { turnos, total };
    }
  },

  // =====================================================
  // MUTATIONS
  // =====================================================
  Mutation: {
    // Abrir caja (iniciar turno)
    aperturaCaja: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const { caja_id, monto_inicial, notas_apertura, password } = input;

      // Validar contraseña del usuario para seguridad
      const usuarioResult = await pool.query(
        'SELECT password FROM usuarios WHERE id = $1 AND activo = true',
        [user.id]
      );

      if (usuarioResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const validPassword = await bcrypt.compare(password, usuarioResult.rows[0].password);
      if (!validPassword) {
        throw new Error('Contraseña incorrecta');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verificar que la caja existe y está activa
        const cajaResult = await client.query(
          'SELECT * FROM cajas WHERE id = $1 AND activa = true',
          [caja_id]
        );

        if (cajaResult.rows.length === 0) {
          throw new Error('Caja no encontrada o inactiva');
        }

        // Verificar que no haya un turno abierto en esta caja
        const turnoAbiertoResult = await client.query(
          'SELECT * FROM turnos_caja WHERE caja_id = $1 AND estado = $2',
          [caja_id, 'abierto']
        );

        if (turnoAbiertoResult.rows.length > 0) {
          throw new Error('Ya existe un turno abierto en esta caja');
        }

        // Crear el turno
        const turnoResult = await client.query(`
          INSERT INTO turnos_caja (
            caja_id, usuario_id, monto_inicial, notas_apertura,
            estado, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [caja_id, user.id, monto_inicial, notas_apertura, 'abierto', user.id]);

        const turno = turnoResult.rows[0];

        // Registrar movimiento de fondo inicial
        await client.query(`
          INSERT INTO movimientos_caja (
            turno_caja_id, tipo, concepto, monto,
            descripcion, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          turno.id,
          'ingreso',
          'fondo_inicial',
          monto_inicial,
          `Fondo inicial del turno ${turno.codigo}`,
          user.id
        ]);

        await client.query('COMMIT');
        return turno;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // Cerrar caja (finalizar turno)
    cierreCaja: async (_, { input }, { pool, user }) => {
      console.log('[CIERRE CAJA] ========== INICIO CIERRE ==========');
      console.log('[CIERRE CAJA] Input recibido:', JSON.stringify(input, null, 2));

      if (!user) {
        throw new Error('No autenticado');
      }

      const { turno_caja_id, arqueo, notas_cierre, password } = input;
      console.log('[CIERRE CAJA] Arqueo extraído:', arqueo);
      console.log('[CIERRE CAJA] Cantidad de items en arqueo:', arqueo?.length);

      // Validar contraseña del usuario para seguridad
      const usuarioResult = await pool.query(
        'SELECT password FROM usuarios WHERE id = $1 AND activo = true',
        [user.id]
      );

      if (usuarioResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const validPassword = await bcrypt.compare(password, usuarioResult.rows[0].password);
      if (!validPassword) {
        throw new Error('Contraseña incorrecta');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Obtener el turno
        const turnoResult = await client.query(
          'SELECT * FROM turnos_caja WHERE id = $1',
          [turno_caja_id]
        );

        if (turnoResult.rows.length === 0) {
          throw new Error('Turno no encontrado');
        }

        const turno = turnoResult.rows[0];

        if (turno.estado === 'cerrado') {
          throw new Error('El turno ya está cerrado');
        }

        // Calcular monto real del arqueo
        console.log('[CIERRE CAJA] Arqueo recibido:', JSON.stringify(arqueo, null, 2));

        let monto_real = 0;
        for (const item of arqueo) {
          // Asegurar que cantidad y valor_unitario sean números
          const cantidad = parseInt(item.cantidad) || 0;
          const valor_unitario = parseFloat(item.valor_unitario) || 0;
          const subtotal = cantidad * valor_unitario;

          console.log('[CIERRE CAJA] Item arqueo:', {
            denominacion: item.denominacion,
            cantidad,
            valor_unitario,
            subtotal
          });

          monto_real += subtotal;

          // Solo insertar si hay cantidad > 0
          if (cantidad > 0) {
            await client.query(`
              INSERT INTO arqueos_caja (
                turno_caja_id, denominacion, cantidad,
                valor_unitario, subtotal
              ) VALUES ($1, $2, $3, $4, $5)
            `, [turno_caja_id, item.denominacion, cantidad, valor_unitario, subtotal]);
          }
        }

        console.log('[CIERRE CAJA] Monto real calculado del arqueo:', monto_real);

        // Calcular monto esperado
        // IMPORTANTE: Incluir ventas en efectivo + movimientos manuales (excluyendo fondo_inicial)

        // 1. Obtener movimientos manuales (ingresos/egresos excluyendo fondo_inicial)
        const movimientosResult = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND concepto != 'fondo_inicial' THEN monto ELSE 0 END), 0) as total_ingresos,
            COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos
          FROM movimientos_caja
          WHERE turno_caja_id = $1
        `, [turno_caja_id]);

        // 2. Obtener ventas en EFECTIVO del turno (solo efectivo cuenta para el arqueo físico)
        const ventasEfectivoResult = await client.query(`
          SELECT COALESCE(SUM(vpp.monto), 0) as total_efectivo
          FROM venta_pos_pagos vpp
          JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
          JOIN metodos_pago mp ON vpp.metodo_pago_id = mp.id
          WHERE vp.turno_caja_id = $1
            AND vp.estado_pago != 'anulado'
            AND LOWER(mp.nombre) = 'efectivo'
        `, [turno_caja_id]);

        const totalVentasEfectivo = parseFloat(ventasEfectivoResult.rows[0].total_efectivo) || 0;
        const totalIngresosMovimientos = parseFloat(movimientosResult.rows[0].total_ingresos) || 0;
        const totalEgresosMovimientos = parseFloat(movimientosResult.rows[0].total_egresos) || 0;

        // monto_esperado = base inicial + ventas efectivo + ingresos manuales - egresos manuales
        const monto_esperado = parseFloat(turno.monto_inicial) +
          totalVentasEfectivo +
          totalIngresosMovimientos -
          totalEgresosMovimientos;

        const diferencia = monto_real - monto_esperado;

        // Log para diagnóstico
        console.log('[CIERRE CAJA] Cálculo de monto esperado:', {
          monto_inicial: turno.monto_inicial,
          ventas_efectivo: totalVentasEfectivo,
          ingresos_manuales: totalIngresosMovimientos,
          egresos_manuales: totalEgresosMovimientos,
          monto_esperado,
          monto_real,
          diferencia,
          abs_diferencia: Math.abs(diferencia),
          notas_cierre: notas_cierre ? 'SÍ' : 'NO'
        });

        // Validar diferencia grande sin notas
        if (Math.abs(diferencia) > 5000 && !notas_cierre) {
          throw new Error(`Se requieren notas de cierre para diferencias mayores a $5,000. Diferencia actual: $${diferencia.toLocaleString('es-CO')}`);
        }

        // Actualizar el turno (incluyendo monto_esperado y diferencia)
        const turnoActualizadoResult = await client.query(`
          UPDATE turnos_caja
          SET estado = $1,
              monto_real = $2,
              monto_esperado = $3,
              diferencia = $4,
              notas_cierre = $5,
              closed_by = $6,
              fecha_cierre = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING *
        `, ['cerrado', monto_real, monto_esperado, diferencia, notas_cierre, user.id, turno_caja_id]);

        const turnoActualizado = turnoActualizadoResult.rows[0];

        await client.query('COMMIT');

        // =====================================================
        // AGREGAR A COLA DE IMPRESIÓN
        // =====================================================
        console.log('[CIERRE CAJA] Iniciando proceso de impresión automática para turno:', turno_caja_id);
        try {
          // Obtener nombre del usuario
          const usuarioResultImpresion = await pool.query(
            'SELECT usuario, nombre, apellido FROM usuarios WHERE id = $1',
            [user.id]
          );
          const usuarioRow = usuarioResultImpresion.rows[0];
          // Adaptar al formato esperado por construirDatosCierre
          const usuarioInfo = usuarioRow ? {
            username: usuarioRow.usuario,
            nombre: usuarioRow.nombre && usuarioRow.apellido
              ? `${usuarioRow.nombre} ${usuarioRow.apellido}`
              : usuarioRow.nombre || usuarioRow.usuario
          } : null;
          console.log('[CIERRE CAJA] Usuario para impresión:', usuarioInfo?.nombre || usuarioInfo?.username);

          // Obtener movimientos del turno
          const movimientosImpresion = await pool.query(
            `SELECT tipo, concepto, descripcion, monto, created_at
             FROM movimientos_caja
             WHERE turno_caja_id = $1
             ORDER BY created_at`,
            [turno_caja_id]
          );
          console.log('[CIERRE CAJA] Movimientos encontrados:', movimientosImpresion.rows.length);

          // Obtener arqueo del turno
          const arqueoImpresion = await pool.query(
            `SELECT denominacion, cantidad, valor_unitario, subtotal
             FROM arqueos_caja
             WHERE turno_caja_id = $1
             ORDER BY valor_unitario DESC`,
            [turno_caja_id]
          );
          console.log('[CIERRE CAJA] Items de arqueo encontrados:', arqueoImpresion.rows.length);

          // Obtener ventas por método de pago (usando venta_pos_pagos, no factura_metodos_pago)
          const ventasPorMetodoImpresion = await pool.query(
            `SELECT mp.nombre as metodo, COALESCE(SUM(vpp.monto), 0) as total
             FROM venta_pos_pagos vpp
             JOIN metodos_pago mp ON vpp.metodo_pago_id = mp.id
             JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
             WHERE vp.turno_caja_id = $1
               AND vp.estado_pago != 'anulado'
             GROUP BY mp.nombre
             HAVING COALESCE(SUM(vpp.monto), 0) > 0
             ORDER BY total DESC`,
            [turno_caja_id]
          );
          console.log('[CIERRE CAJA] Ventas por método encontradas:', ventasPorMetodoImpresion.rows.length);

          // Construir datos para impresión
          const datosCierre = construirDatosCierre(
            turnoActualizado,
            movimientosImpresion.rows,
            arqueoImpresion.rows,
            ventasPorMetodoImpresion.rows,
            usuarioInfo
          );
          console.log('[CIERRE CAJA] Datos cierre construidos:', {
            codigo: datosCierre.codigo,
            total_ventas: datosCierre.total_ventas,
            monto_esperado: datosCierre.monto_esperado,
            monto_real: datosCierre.monto_real
          });

          // Agregar a cola de impresión (prioridad 2 = media)
          const colaId = await agregarCierreACola(pool, turno_caja_id, datosCierre, 2);
          if (colaId) {
            console.log('[CIERRE CAJA] ✅ Cierre agregado a cola de impresión con ID:', colaId);
          } else {
            console.error('[CIERRE CAJA] ⚠️ agregarCierreACola retornó null - revisar tabla cola_impresion');
          }

        } catch (errorCola) {
          console.error('[CIERRE CAJA] ❌ Error al agregar a cola de impresión:', errorCola);
          console.error('[CIERRE CAJA] Stack:', errorCola.stack);
          // No fallar el cierre si falla la cola de impresión
        }

        return turnoActualizado;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // Reimprimir cierre de caja
    reimprimirCierreCaja: async (_, { turno_caja_id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      console.log('[REIMPRESIÓN CIERRE] Iniciando reimpresión para turno:', turno_caja_id);

      // Obtener el turno
      const turnoResult = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [turno_caja_id]
      );

      if (turnoResult.rows.length === 0) {
        throw new Error('Turno no encontrado');
      }

      const turno = turnoResult.rows[0];

      if (turno.estado !== 'cerrado') {
        throw new Error('Solo se pueden reimprimir turnos cerrados');
      }

      try {
        // Obtener nombre del usuario que cerró
        const usuarioResult = await pool.query(
          'SELECT usuario, nombre, apellido FROM usuarios WHERE id = $1',
          [turno.closed_by || turno.usuario_id]
        );
        const usuarioRow = usuarioResult.rows[0];
        // Adaptar al formato esperado por construirDatosCierre
        const usuarioInfo = usuarioRow ? {
          username: usuarioRow.usuario,
          nombre: usuarioRow.nombre && usuarioRow.apellido
            ? `${usuarioRow.nombre} ${usuarioRow.apellido}`
            : usuarioRow.nombre || usuarioRow.usuario
        } : null;

        // Obtener movimientos del turno
        const movimientosResult = await pool.query(
          `SELECT tipo, concepto, descripcion, monto, created_at
           FROM movimientos_caja
           WHERE turno_caja_id = $1
           ORDER BY created_at`,
          [turno_caja_id]
        );

        // Obtener arqueo del turno
        const arqueoResult = await pool.query(
          `SELECT denominacion, cantidad, valor_unitario, subtotal
           FROM arqueos_caja
           WHERE turno_caja_id = $1
           ORDER BY valor_unitario DESC`,
          [turno_caja_id]
        );

        // Obtener ventas por método de pago (usando venta_pos_pagos, NO factura_metodos_pago)
        const ventasPorMetodoResult = await pool.query(
          `SELECT mp.nombre as metodo, COALESCE(SUM(vpp.monto), 0) as total
           FROM venta_pos_pagos vpp
           JOIN metodos_pago mp ON vpp.metodo_pago_id = mp.id
           JOIN ventas_pos vp ON vpp.venta_pos_id = vp.id
           WHERE vp.turno_caja_id = $1
             AND vp.estado_pago != 'anulado'
           GROUP BY mp.nombre
           HAVING COALESCE(SUM(vpp.monto), 0) > 0
           ORDER BY total DESC`,
          [turno_caja_id]
        );

        // Construir datos para impresión
        const datosCierre = construirDatosCierre(
          turno,
          movimientosResult.rows,
          arqueoResult.rows,
          ventasPorMetodoResult.rows,
          usuarioInfo
        );

        // Agregar a cola de impresión con prioridad alta (1)
        const colaId = await agregarCierreACola(pool, turno_caja_id, datosCierre, 1);

        if (colaId) {
          console.log('[REIMPRESIÓN CIERRE] ✅ Reimpresión agregada a cola con ID:', colaId);
          return true;
        } else {
          console.error('[REIMPRESIÓN CIERRE] ⚠️ No se pudo agregar a la cola');
          throw new Error('No se pudo agregar a la cola de impresión');
        }

      } catch (error) {
        console.error('[REIMPRESIÓN CIERRE] ❌ Error:', error);
        throw new Error('Error al reimprimir cierre de caja: ' + error.message);
      }
    },

    // Registrar retiro de caja
    registrarRetiroCaja: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Validar rol (solo admin o gerente pueden hacer retiros)
      if (!['admin', 'gerente'].includes(user.rol)) {
        throw new Error('No tienes permisos para realizar retiros de caja');
      }

      const { turno_caja_id, monto, motivo } = input;

      // Verificar que el turno existe y está abierto
      const turnoResult = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1 AND estado = $2',
        [turno_caja_id, 'abierto']
      );

      if (turnoResult.rows.length === 0) {
        throw new Error('Turno no encontrado o ya está cerrado');
      }

      // Registrar el movimiento de egreso
      const result = await pool.query(`
        INSERT INTO movimientos_caja (
          turno_caja_id, tipo, concepto, monto,
          descripcion, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [turno_caja_id, 'egreso', 'retiro', monto, motivo, user.id]);

      return result.rows[0];
    }
  },

  // =====================================================
  // FIELD RESOLVERS (relaciones)
  // =====================================================
  TurnoCaja: {
    caja: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM cajas WHERE id = $1',
        [parent.caja_id]
      );
      return result.rows[0];
    },

    usuario: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.usuario_id]
      );
      return result.rows[0];
    },

    created_by: async (parent, _, { pool }) => {
      if (!parent.created_by) return null;
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.created_by]
      );
      return result.rows[0];
    },

    closed_by: async (parent, _, { pool }) => {
      if (!parent.closed_by) return null;
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.closed_by]
      );
      return result.rows[0];
    },

    ventas: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM ventas_pos WHERE turno_caja_id = $1 ORDER BY created_at DESC',
        [parent.id]
      );
      return result.rows;
    },

    movimientos: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM movimientos_caja WHERE turno_caja_id = $1 ORDER BY created_at DESC',
        [parent.id]
      );
      return result.rows;
    },

    arqueo: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM arqueos_caja WHERE turno_caja_id = $1 ORDER BY valor_unitario DESC',
        [parent.id]
      );
      return result.rows;
    }
  },

  ArqueoCaja: {
    turno_caja: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [parent.turno_caja_id]
      );
      return result.rows[0];
    }
  },

  MovimientoCaja: {
    turno_caja: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM turnos_caja WHERE id = $1',
        [parent.turno_caja_id]
      );
      return result.rows[0];
    },

    metodo_pago: async (parent, _, { pool }) => {
      if (!parent.metodo_pago_id) return null;
      const result = await pool.query(
        'SELECT * FROM metodos_pago WHERE id = $1',
        [parent.metodo_pago_id]
      );
      return result.rows[0];
    },

    venta_pos: async (parent, _, { pool }) => {
      if (!parent.venta_pos_id) return null;
      const result = await pool.query(
        'SELECT * FROM ventas_pos WHERE id = $1',
        [parent.venta_pos_id]
      );
      return result.rows[0];
    },

    factura: async (parent, _, { pool }) => {
      if (!parent.factura_id) return null;
      const result = await pool.query(
        'SELECT * FROM facturas WHERE id = $1',
        [parent.factura_id]
      );
      return result.rows[0];
    },

    created_by: async (parent, _, { pool }) => {
      if (!parent.created_by) return null;
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.created_by]
      );
      return result.rows[0];
    }
  },

  ResumenTurnoCaja: {
    turno: (parent) => parent.turno
  },

  IngresoMetodo: {
    metodo_pago: (parent) => parent.metodo_pago
  },

  // Field resolvers para TurnoConResumen (historial)
  TurnoConResumen: {
    usuario: async (parent, _, { pool }) => {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [parent.usuario_id]
      );
      return result.rows[0];
    }
  }
};

module.exports = cajaResolvers;
