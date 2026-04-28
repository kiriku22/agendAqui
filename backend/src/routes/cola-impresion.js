// ============================================================================
// RUTAS REST - COLA DE IMPRESIÓN
// Endpoints para el agente de impresión local
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/cola/pendientes
 * Obtiene trabajos pendientes de la cola, ordenados por prioridad
 */
router.get('/pendientes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM cola_impresion
      WHERE estado = 'pendiente'
        AND intentos < max_intentos
      ORDER BY prioridad ASC, created_at ASC
      LIMIT 10
    `);

    res.json({ trabajos: result.rows });
  } catch (error) {
    console.error('Error obteniendo trabajos pendientes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cola/marcar-procesando/:id
 * Marca un trabajo como procesando
 */
router.post('/marcar-procesando/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { agente_id } = req.body;

    const result = await pool.query(`
      UPDATE cola_impresion
      SET estado = 'procesando',
          agente_id = $1,
          intentos = intentos + 1
      WHERE id = $2 AND estado = 'pendiente'
      RETURNING *
    `, [agente_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado o ya procesado' });
    }

    res.json({ trabajo: result.rows[0] });
  } catch (error) {
    console.error('Error marcando trabajo como procesando:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cola/marcar-impreso/:id
 * Marca un trabajo como impreso exitosamente
 */
router.post('/marcar-impreso/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE cola_impresion
      SET estado = 'impreso',
          procesado_at = NOW(),
          error_mensaje = NULL
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    res.json({ trabajo: result.rows[0] });
  } catch (error) {
    console.error('Error marcando trabajo como impreso:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cola/marcar-error/:id
 * Marca un trabajo con error. Si no ha alcanzado max_intentos, lo reintenta
 */
router.post('/marcar-error/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error_mensaje } = req.body;

    // Obtener el trabajo actual
    const trabajoActual = await pool.query(
      'SELECT intentos, max_intentos FROM cola_impresion WHERE id = $1',
      [id]
    );

    if (trabajoActual.rows.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const { intentos, max_intentos } = trabajoActual.rows[0];
    // Si alcanzó max_intentos, marcar como error definitivo, sino volver a pendiente
    const nuevoEstado = intentos >= max_intentos ? 'error' : 'pendiente';

    const result = await pool.query(`
      UPDATE cola_impresion
      SET estado = $1,
          error_mensaje = $2
      WHERE id = $3
      RETURNING *
    `, [nuevoEstado, error_mensaje, id]);

    res.json({ trabajo: result.rows[0] });
  } catch (error) {
    console.error('Error marcando trabajo con error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cola/estadisticas
 * Obtiene estadísticas de la cola
 */
router.get('/estadisticas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'procesando') AS procesando,
        COUNT(*) FILTER (WHERE estado = 'impreso') AS impresos,
        COUNT(*) FILTER (WHERE estado = 'error') AS errores
      FROM cola_impresion
    `);

    res.json({ estadisticas: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cola/historial
 * Obtiene los últimos 50 trabajos procesados
 */
router.get('/historial', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, tipo, documento_id, estado, impresora_destino,
             error_mensaje, created_at, procesado_at
      FROM cola_impresion
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({ historial: result.rows });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
