const axios = require('axios');
const logger = require('../utils/logger');

class ApiClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout: 60000,  // 60 segundos para operaciones largas (PDF con QR)
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async obtenerPendientes() {
    try {
      const response = await this.client.get('/api/cola/pendientes');
      return response.data.trabajos || [];
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.error('No se puede conectar al servidor. Verifique que esté en línea.');
      } else {
        logger.error('Error obteniendo trabajos pendientes:', error.message);
      }
      return [];
    }
  }

  async marcarProcesando(jobId, agenteId) {
    try {
      await this.client.post(`/api/cola/marcar-procesando/${jobId}`, {
        agente_id: agenteId
      });
      return true;
    } catch (error) {
      logger.error(`Error marcando trabajo ${jobId} como procesando:`, error.message);
      return false;
    }
  }

  async marcarImpreso(jobId) {
    try {
      await this.client.post(`/api/cola/marcar-impreso/${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Error marcando trabajo ${jobId} como impreso:`, error.message);
      return false;
    }
  }

  async marcarError(jobId, errorMensaje) {
    try {
      const response = await this.client.post(`/api/cola/marcar-error/${jobId}`, {
        error_mensaje: errorMensaje
      });
      return response.data.trabajo;
    } catch (error) {
      logger.error(`Error marcando trabajo ${jobId} con error:`, error.message);
      return null;
    }
  }

  async obtenerEstadisticas() {
    try {
      const response = await this.client.get('/api/cola/estadisticas');
      return response.data.estadisticas || {};
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error.message);
      return {};
    }
  }

  async obtenerHistorial() {
    try {
      const response = await this.client.get('/api/cola/historial');
      return response.data.historial || [];
    } catch (error) {
      logger.error('Error obteniendo historial:', error.message);
      return [];
    }
  }
}

module.exports = ApiClient;
