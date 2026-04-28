const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ApiClient = require('../services/api-client');
const PrinterService = require('../services/printer');
const logger = require('../utils/logger');
const settings = require('../config/settings');

class WebServer {
  constructor(port) {
    this.port = port;
    this.app = express();
    this.apiClient = settings.serverUrl ? new ApiClient(settings.serverUrl) : null;
    this.setupRoutes();
  }

  setupRoutes() {
    // Servir archivos estáticos desde public/
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    // ========== API ENDPOINTS ==========

    // Estado del agente
    this.app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        status: {
          agenteId: settings.agenteId,
          serverUrl: settings.serverUrl || 'NO CONFIGURADO',
          connected: !!settings.serverUrl,
          pollingInterval: settings.pollingInterval,
          panelPort: settings.panelPort,
          uptime: process.uptime()
        }
      });
    });

    // Estadísticas de la cola (desde backend)
    this.app.get('/api/estadisticas', async (req, res) => {
      try {
        if (!this.apiClient) {
          return res.json({
            success: false,
            error: 'URL del servidor no configurada',
            estadisticas: {}
          });
        }

        const estadisticas = await this.apiClient.obtenerEstadisticas();
        res.json({
          success: true,
          estadisticas
        });
      } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Historial de trabajos (desde backend)
    this.app.get('/api/historial', async (req, res) => {
      try {
        if (!this.apiClient) {
          return res.json({
            success: false,
            error: 'URL del servidor no configurada',
            historial: []
          });
        }

        const historial = await this.apiClient.obtenerHistorial();
        res.json({
          success: true,
          historial
        });
      } catch (error) {
        logger.error('Error obteniendo historial:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Obtener configuración actual
    this.app.get('/api/config', (req, res) => {
      res.json({
        success: true,
        config: {
          serverUrl: settings.serverUrl,
          panelPort: settings.panelPort,
          pollingInterval: settings.pollingInterval,
          agenteId: settings.agenteId,
          configFile: settings.getConfigFile()
        }
      });
    });

    // Guardar configuración
    this.app.post('/api/config', (req, res) => {
      try {
        const { serverUrl, panelPort, pollingInterval } = req.body;

        if (serverUrl !== undefined) {
          settings.serverUrl = serverUrl.trim();
        }

        if (panelPort !== undefined) {
          const port = parseInt(panelPort);
          if (port < 1024 || port > 65535) {
            return res.status(400).json({
              success: false,
              error: 'Puerto debe estar entre 1024 y 65535'
            });
          }
          settings.panelPort = port;
        }

        if (pollingInterval !== undefined) {
          const interval = parseInt(pollingInterval);
          if (interval < 1000 || interval > 60000) {
            return res.status(400).json({
              success: false,
              error: 'Intervalo debe estar entre 1000 y 60000 ms'
            });
          }
          settings.pollingInterval = interval;
        }

        settings.save();

        // Recrear API client si cambió la URL
        if (serverUrl !== undefined) {
          this.apiClient = settings.serverUrl ? new ApiClient(settings.serverUrl) : null;
        }

        logger.info('Configuración actualizada. Reinicie el agente para aplicar cambios.');

        res.json({
          success: true,
          message: 'Configuración guardada. Reinicie el servicio para aplicar cambios.',
          config: {
            serverUrl: settings.serverUrl,
            panelPort: settings.panelPort,
            pollingInterval: settings.pollingInterval
          }
        });
      } catch (error) {
        logger.error('Error guardando configuración:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // ========== NUEVOS ENDPOINTS ==========

    // Listar impresoras disponibles
    this.app.get('/api/impresoras', async (req, res) => {
      try {
        const impresoras = await PrinterService.listarImpresoras();
        res.json({
          success: true,
          impresoras
        });
      } catch (error) {
        logger.error('Error listando impresoras:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Probar conexión al servidor backend
    this.app.post('/api/probar-conexion', async (req, res) => {
      try {
        const { serverUrl } = req.body;
        const urlToTest = serverUrl || settings.serverUrl;

        if (!urlToTest) {
          return res.status(400).json({
            success: false,
            error: 'URL del servidor no proporcionada'
          });
        }

        // Intentar conectar al health endpoint o al endpoint de estadísticas
        const testUrl = `${urlToTest}/health`;
        const startTime = Date.now();

        try {
          const response = await axios.get(testUrl, { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          res.json({
            success: true,
            message: 'Conexión exitosa',
            responseTime: responseTime,
            serverStatus: response.data
          });
        } catch (healthError) {
          // Si /health falla, intentar con /api/cola/estadisticas
          try {
            const statsUrl = `${urlToTest}/api/cola/estadisticas`;
            const response = await axios.get(statsUrl, { timeout: 5000 });
            const responseTime = Date.now() - startTime;

            res.json({
              success: true,
              message: 'Conexión exitosa (via estadísticas)',
              responseTime: responseTime,
              serverStatus: response.data
            });
          } catch (statsError) {
            throw new Error(`No se pudo conectar al servidor: ${healthError.message}`);
          }
        }
      } catch (error) {
        logger.error('Error probando conexión:', error);
        res.json({
          success: false,
          error: error.message
        });
      }
    });

    // Probar impresión
    this.app.post('/api/probar-impresion', async (req, res) => {
      try {
        const { impresora } = req.body;

        logger.info(`Enviando ticket de prueba a: ${impresora || 'impresora predeterminada'}`);

        const resultado = await PrinterService.imprimirTicketPrueba(impresora);

        if (resultado.success) {
          logger.info('Ticket de prueba enviado correctamente');
          res.json({
            success: true,
            message: resultado.message || 'Ticket de prueba enviado'
          });
        } else {
          logger.error('Error imprimiendo ticket de prueba:', resultado.error);
          res.json({
            success: false,
            error: resultado.error || 'Error desconocido'
          });
        }
      } catch (error) {
        logger.error('Error en prueba de impresión:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Reiniciar procesador de cola (requiere referencia externa)
    this.app.post('/api/reiniciar', (req, res) => {
      try {
        // Este endpoint notifica que se debe reiniciar
        // El reinicio real se hace desde el proceso principal
        logger.info('Solicitud de reinicio recibida');

        res.json({
          success: true,
          message: 'Solicitud de reinicio registrada. El servicio se reiniciará automáticamente.',
          note: 'Si es un servicio Windows, use: net stop "Factufy Agente Impresion" && net start "Factufy Agente Impresion"'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Leer logs recientes
    this.app.get('/api/logs', (req, res) => {
      try {
        const logDir = path.join(__dirname, '../../logs');
        const combinedLogFile = path.join(logDir, 'combined.log');

        if (!fs.existsSync(combinedLogFile)) {
          return res.json({
            success: true,
            logs: []
          });
        }

        const logData = fs.readFileSync(combinedLogFile, 'utf8');
        const lines = logData.split('\n').filter(line => line.trim());

        // Últimas 100 líneas
        const recentLines = lines.slice(-100);

        // Parsear JSON logs
        const logs = recentLines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, level: 'info' };
          }
        });

        res.json({
          success: true,
          logs
        });
      } catch (error) {
        logger.error('Error leyendo logs:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Endpoint raíz sirve index.html
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          resolve();
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Puerto ${this.port} ya está en uso`);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info('Servidor web detenido');
    }
  }
}

module.exports = WebServer;
