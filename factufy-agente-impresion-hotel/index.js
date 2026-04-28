const QueueProcessor = require('./src/services/queue-processor');
const WebServer = require('./src/web/server');
const logger = require('./src/utils/logger');
const settings = require('./src/config/settings');

async function main() {
  try {
    logger.info('='.repeat(60));
    logger.info('Iniciando Factufy Agente de Impresión...');
    logger.info('='.repeat(60));

    // Mostrar configuración
    logger.info(`Agente ID: ${settings.agenteId}`);
    logger.info(`URL Servidor: ${settings.serverUrl || 'NO CONFIGURADO'}`);
    logger.info(`Puerto Panel: ${settings.panelPort}`);
    logger.info(`Intervalo Polling: ${settings.pollingInterval}ms`);

    // Validar configuración
    if (!settings.serverUrl) {
      logger.warn('⚠️  URL del servidor no configurada');
      logger.warn('⚠️  Por favor configure el servidor en el panel web');
      logger.warn(`⚠️  Panel disponible en: http://localhost:${settings.panelPort}`);
    }

    // Iniciar servidor web del panel
    const webServer = new WebServer(settings.panelPort);
    await webServer.start();
    logger.info(`✅ Panel web iniciado en http://localhost:${settings.panelPort}`);

    // Iniciar procesador de cola solo si hay URL configurada
    if (settings.serverUrl) {
      const processor = new QueueProcessor(settings);
      await processor.start();
      logger.info('✅ Procesador de cola iniciado');
    } else {
      logger.warn('⚠️  Procesador de cola NO iniciado - falta configuración');
    }

    logger.info('='.repeat(60));
    logger.info('Agente iniciado correctamente');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Manejo de señales para cierre graceful
process.on('SIGINT', () => {
  logger.info('Recibida señal SIGINT - Cerrando agente...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Recibida señal SIGTERM - Cerrando agente...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
});

main();
