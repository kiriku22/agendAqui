// =====================================================
// RESOLVER: CONSECUTIVOS - Gestión de Resoluciones DIAN
// Manejo de numeración para facturas, notas crédito y documentos soporte
// =====================================================

/**
 * Obtiene el siguiente número de factura de forma atómica
 * @param {Object} client - Cliente de conexión a BD (para transacciones)
 * @param {string} tipoDocumento - 'factura', 'nota_credito' o 'doc_soporte'
 * @returns {Object} { prefijo, numero, numeroFormateado }
 */
async function obtenerSiguienteNumero(client, tipoDocumento) {
  const result = await client.query(
    'SELECT * FROM obtener_siguiente_numero_dian($1)',
    [tipoDocumento]
  );

  if (result.rows.length === 0) {
    throw new Error(`No se pudo obtener número para tipo: ${tipoDocumento}`);
  }

  return {
    prefijo: result.rows[0].prefijo,
    numero: result.rows[0].numero,
    numeroFormateado: result.rows[0].numero_formateado
  };
}

const consecutivosResolvers = {
  Query: {
    // Obtener todas las resoluciones
    resoluciones: async (_, __, { pool }) => {
      const result = await pool.query(`
        SELECT
          r.*,
          (r.numero_actual - r.numero_inicial) as numeros_usados,
          (r.numero_final - r.numero_actual + 1) as numeros_disponibles,
          ROUND(
            ((r.numero_actual - r.numero_inicial)::NUMERIC /
             NULLIF((r.numero_final - r.numero_inicial + 1)::NUMERIC, 0)) * 100,
            2
          ) as porcentaje_uso
        FROM resoluciones_dian r
        ORDER BY
          CASE r.tipo_documento
            WHEN 'factura' THEN 1
            WHEN 'nota_credito' THEN 2
            WHEN 'doc_soporte' THEN 3
          END
      `);

      return result.rows.map(row => ({
        id: row.id,
        tipo_documento: row.tipo_documento,
        nombre: row.nombre,
        resolucion: row.resolucion,
        prefijo: row.prefijo,
        numero_inicial: row.numero_inicial.toString(),
        numero_final: row.numero_final.toString(),
        numero_actual: row.numero_actual.toString(),
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        activo: row.activo,
        factus_numbering_range_id: row.factus_numbering_range_id || null,
        transmision_automatica: row.transmision_automatica || false,
        numeros_usados: parseInt(row.numeros_usados) || 0,
        numeros_disponibles: parseInt(row.numeros_disponibles) || 0,
        porcentaje_uso: parseFloat(row.porcentaje_uso) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    },

    // Obtener resolución activa por tipo
    resolucionActiva: async (_, { tipo_documento }, { pool }) => {
      const result = await pool.query(`
        SELECT
          r.*,
          (r.numero_actual - r.numero_inicial) as numeros_usados,
          (r.numero_final - r.numero_actual + 1) as numeros_disponibles,
          ROUND(
            ((r.numero_actual - r.numero_inicial)::NUMERIC /
             NULLIF((r.numero_final - r.numero_inicial + 1)::NUMERIC, 0)) * 100,
            2
          ) as porcentaje_uso
        FROM resoluciones_dian r
        WHERE r.tipo_documento = $1 AND r.activo = true
        LIMIT 1
      `, [tipo_documento]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tipo_documento: row.tipo_documento,
        nombre: row.nombre,
        resolucion: row.resolucion,
        prefijo: row.prefijo,
        numero_inicial: row.numero_inicial.toString(),
        numero_final: row.numero_final.toString(),
        numero_actual: row.numero_actual.toString(),
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        activo: row.activo,
        factus_numbering_range_id: row.factus_numbering_range_id || null,
        transmision_automatica: row.transmision_automatica || false,
        numeros_usados: parseInt(row.numeros_usados) || 0,
        numeros_disponibles: parseInt(row.numeros_disponibles) || 0,
        porcentaje_uso: parseFloat(row.porcentaje_uso) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    },

    // Obtener resolución por ID
    resolucion: async (_, { id }, { pool }) => {
      const result = await pool.query(`
        SELECT
          r.*,
          (r.numero_actual - r.numero_inicial) as numeros_usados,
          (r.numero_final - r.numero_actual + 1) as numeros_disponibles,
          ROUND(
            ((r.numero_actual - r.numero_inicial)::NUMERIC /
             NULLIF((r.numero_final - r.numero_inicial + 1)::NUMERIC, 0)) * 100,
            2
          ) as porcentaje_uso
        FROM resoluciones_dian r
        WHERE r.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tipo_documento: row.tipo_documento,
        nombre: row.nombre,
        resolucion: row.resolucion,
        prefijo: row.prefijo,
        numero_inicial: row.numero_inicial.toString(),
        numero_final: row.numero_final.toString(),
        numero_actual: row.numero_actual.toString(),
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        activo: row.activo,
        factus_numbering_range_id: row.factus_numbering_range_id || null,
        transmision_automatica: row.transmision_automatica || false,
        numeros_usados: parseInt(row.numeros_usados) || 0,
        numeros_disponibles: parseInt(row.numeros_disponibles) || 0,
        porcentaje_uso: parseFloat(row.porcentaje_uso) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    }
  },

  Mutation: {
    // Crear nueva resolución
    crearResolucion: async (_, { input }, { pool, user }) => {
      if (!user || user.rol !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden crear resoluciones.');
      }

      const {
        tipo_documento,
        nombre,
        resolucion,
        prefijo,
        numero_inicial,
        numero_final,
        numero_actual,
        fecha_inicio,
        fecha_fin,
        activo,
        factus_numbering_range_id,
        transmision_automatica
      } = input;

      // Validar que numero_inicial <= numero_actual <= numero_final
      const numInicial = BigInt(numero_inicial);
      const numFinal = BigInt(numero_final);
      const numActual = BigInt(numero_actual || numero_inicial);

      if (numInicial > numFinal) {
        throw new Error('El número inicial no puede ser mayor que el número final');
      }

      if (numActual < numInicial || numActual > numFinal) {
        throw new Error('El número actual debe estar dentro del rango');
      }

      // Si se activa, desactivar otras del mismo tipo
      if (activo) {
        await pool.query(
          'UPDATE resoluciones_dian SET activo = false WHERE tipo_documento = $1',
          [tipo_documento]
        );
      }

      const result = await pool.query(`
        INSERT INTO resoluciones_dian (
          tipo_documento, nombre, resolucion, prefijo,
          numero_inicial, numero_final, numero_actual,
          fecha_inicio, fecha_fin, activo, factus_numbering_range_id,
          transmision_automatica
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        tipo_documento,
        nombre,
        resolucion || null,
        prefijo,
        numero_inicial,
        numero_final,
        numero_actual || numero_inicial,
        fecha_inicio || null,
        fecha_fin || null,
        activo !== false,
        factus_numbering_range_id || null,
        transmision_automatica || false
      ]);

      return result.rows[0];
    },

    // Actualizar resolución existente
    actualizarResolucion: async (_, { id, input }, { pool, user }) => {
      if (!user || user.rol !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden modificar resoluciones.');
      }

      // Verificar que existe
      const existing = await pool.query(
        'SELECT * FROM resoluciones_dian WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        throw new Error('Resolución no encontrada');
      }

      const {
        nombre,
        resolucion,
        prefijo,
        numero_inicial,
        numero_final,
        numero_actual,
        fecha_inicio,
        fecha_fin,
        activo,
        factus_numbering_range_id,
        transmision_automatica
      } = input;

      // Si se activa, desactivar otras del mismo tipo
      if (activo && !existing.rows[0].activo) {
        await pool.query(
          'UPDATE resoluciones_dian SET activo = false WHERE tipo_documento = $1 AND id != $2',
          [existing.rows[0].tipo_documento, id]
        );
      }

      const result = await pool.query(`
        UPDATE resoluciones_dian SET
          nombre = COALESCE($1, nombre),
          resolucion = COALESCE($2, resolucion),
          prefijo = COALESCE($3, prefijo),
          numero_inicial = COALESCE($4, numero_inicial),
          numero_final = COALESCE($5, numero_final),
          numero_actual = COALESCE($6, numero_actual),
          fecha_inicio = COALESCE($7, fecha_inicio),
          fecha_fin = COALESCE($8, fecha_fin),
          activo = COALESCE($9, activo),
          factus_numbering_range_id = COALESCE($11, factus_numbering_range_id),
          transmision_automatica = COALESCE($12, transmision_automatica),
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `, [
        nombre,
        resolucion,
        prefijo,
        numero_inicial,
        numero_final,
        numero_actual,
        fecha_inicio,
        fecha_fin,
        activo,
        id,
        factus_numbering_range_id,
        transmision_automatica
      ]);

      return result.rows[0];
    },

    // Activar una resolución (desactiva las demás del mismo tipo)
    activarResolucion: async (_, { id }, { pool, user }) => {
      if (!user || user.rol !== 'admin') {
        throw new Error('No autorizado');
      }

      // Obtener tipo de documento de la resolución
      const resolucion = await pool.query(
        'SELECT tipo_documento FROM resoluciones_dian WHERE id = $1',
        [id]
      );

      if (resolucion.rows.length === 0) {
        throw new Error('Resolución no encontrada');
      }

      const tipoDoc = resolucion.rows[0].tipo_documento;

      // Desactivar todas del mismo tipo
      await pool.query(
        'UPDATE resoluciones_dian SET activo = false WHERE tipo_documento = $1',
        [tipoDoc]
      );

      // Activar la seleccionada
      const result = await pool.query(
        'UPDATE resoluciones_dian SET activo = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      return result.rows[0];
    },

    // Desactivar una resolución
    desactivarResolucion: async (_, { id }, { pool, user }) => {
      if (!user || user.rol !== 'admin') {
        throw new Error('No autorizado');
      }

      const result = await pool.query(
        'UPDATE resoluciones_dian SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Resolución no encontrada');
      }

      return result.rows[0];
    }
  }
};

module.exports = {
  consecutivosResolvers,
  obtenerSiguienteNumero
};
