const ApiClient = require('./api-client');
const PrinterService = require('./printer');
const ComandaService = require('./comanda');
const FacturaService = require('./factura');
const logger = require('../utils/logger');

class QueueProcessor {
  constructor(config) {
    this.apiClient = new ApiClient(config.serverUrl);
    this.pollingInterval = config.pollingInterval;
    this.agenteId = config.agenteId;
    this.isProcessing = false;
    this.intervalId = null;
  }

  async start() {
    logger.info('Iniciando procesador de cola...');
    logger.info(`Polling interval: ${this.pollingInterval}ms`);

    // Polling cada X segundos
    this.intervalId = setInterval(() => this.processQueue(), this.pollingInterval);

    // Primera ejecución inmediata
    this.processQueue();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Procesador de cola detenido');
    }
  }

  async processQueue() {
    if (this.isProcessing) {
      return; // Evitar procesamiento concurrente
    }

    try {
      this.isProcessing = true;

      // Obtener trabajos pendientes
      const trabajos = await this.apiClient.obtenerPendientes();

      if (trabajos.length === 0) {
        return; // No hay trabajos pendientes
      }

      logger.info(`📋 ${trabajos.length} trabajo(s) pendiente(s)`);

      // Procesar cada trabajo
      for (const trabajo of trabajos) {
        await this.processJob(trabajo);
      }

    } catch (error) {
      logger.error('Error procesando cola:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processJob(job) {
    try {
      logger.logJob(job.id, job.tipo, 'Iniciando procesamiento');

      // Marcar como procesando
      const marcado = await this.apiClient.marcarProcesando(job.id, this.agenteId);
      if (!marcado) {
        logger.logJob(job.id, job.tipo, 'No se pudo marcar como procesando', 'error');
        return;
      }

      // Parsear datos
      let datos;
      try {
        datos = JSON.parse(job.datos_json);
      } catch (parseError) {
        throw new Error(`Error parseando datos JSON: ${parseError.message}`);
      }

      // Procesar según el tipo de documento
      let textoFormateado = '';

      switch (job.tipo) {
        case 'factura':
          textoFormateado = await this.procesarFactura(datos, job);
          break;

        case 'comanda':
          textoFormateado = await this.procesarComanda(datos, job);
          break;

        case 'cierre':
          textoFormateado = await this.procesarCierre(datos, job);
          break;

        case 'precuenta':
          textoFormateado = await this.procesarPrecuenta(datos, job);
          break;

        case 'movimiento':
          textoFormateado = await this.procesarMovimiento(datos, job);
          break;

        default:
          throw new Error(`Tipo de documento desconocido: ${job.tipo}`);
      }

      // Imprimir el documento formateado
      await this.imprimirDocumento(textoFormateado, job);

      // Marcar como impreso
      const impreso = await this.apiClient.marcarImpreso(job.id);
      if (impreso) {
        logger.logJob(job.id, job.tipo, '✅ Impreso exitosamente', 'info');
      }

    } catch (error) {
      logger.logJob(job.id, job.tipo, `❌ Error: ${error.message}`, 'error');

      // Marcar como error
      await this.apiClient.marcarError(job.id, error.message);
    }
  }

  async procesarFactura(datos, job) {
    // Formatear factura usando FacturaService
    // ancho_papel: 32 por defecto para Courier New 10pt Bold (más ancho que Font A)
    const ancho = datos.ancho_papel || 32;
    const configuracion = datos.configuracion || null;

    // Construir objeto factura completo para formatearFactura
    // El servidor envía: { factura, detalles, facturaElectronica, configuracion }
    // Pero formatearFactura espera: factura con factura.detalles incluido
    const factura = datos.factura || datos; // Soporte para ambos formatos
    if (datos.detalles && !factura.detalles) {
      factura.detalles = datos.detalles;
    }

    // Agregar mesa si viene separada
    if (datos.factura && datos.factura.mesa_numero) {
      factura.mesa = { numero: datos.factura.mesa_numero };
    }

    // Pasar datos de hospedaje al objeto factura
    if (datos.hospedaje && !factura.hospedaje) {
      factura.hospedaje = datos.hospedaje;
    }

    // Mapear métodos de pago al formato esperado por formatearFactura
    if (datos.metodos_pago && !factura.metodos_pago_multiple) {
      factura.metodos_pago_multiple = datos.metodos_pago.map(mp => ({
        metodo_pago_nombre: mp.nombre || 'Efectivo',
        monto: parseFloat(mp.monto)
      }));
    }

    // Soporte para ambos nombres de campo (camelCase y snake_case)
    let facturaElectronica = datos.facturaElectronica || datos.factura_electronica || null;

    // Mapear campos del backend al formato esperado por formatearFactura
    if (facturaElectronica && !facturaElectronica.numero_factura_electronica && facturaElectronica.numero_dian) {
      facturaElectronica.numero_factura_electronica = facturaElectronica.numero_dian;
    }

    // Agregar datos del cliente al facturaElectronica para impresión
    if (facturaElectronica && datos.cliente && !facturaElectronica.cliente_nombre) {
      facturaElectronica.cliente_nombre = datos.cliente.nombre;
      facturaElectronica.cliente_tipo_documento = datos.cliente.tipo_documento;
      facturaElectronica.cliente_numero_documento = datos.cliente.numero_documento;
    }

    const resultado = FacturaService.formatearFactura(factura, facturaElectronica, ancho, configuracion);

    // Retornar el resultado completo (con qrUrl si existe)
    return resultado;
  }

  async procesarComanda(datos, job) {
    // Extraer configuración de la comanda
    const config = datos.config || {};
    const ancho = datos.ancho_papel || 48;

    // Formatear comanda usando ComandaService
    return ComandaService.formatearComanda(datos, config, ancho);
  }

  async procesarCierre(datos, job) {
    // Formatear cierre de caja usando PrinterService
    // Pasar movimientos de caja y configuración si existen
    const movimientos = datos.movimientos || [];
    const configuracion = datos.configuracion || null;
    return PrinterService.formatearCierreCaja(datos, movimientos, configuracion);
  }

  async procesarPrecuenta(datos, job) {
    // Formatear comprobante de consumo usando FacturaService
    // ancho_papel: 32 por defecto para Courier New 10pt Bold (más ancho que Font A)
    const ancho = datos.ancho_papel || 32;
    const configuracion = datos.configuracion || null;
    return FacturaService.formatearComprobante(datos, ancho, configuracion);
  }

  async procesarMovimiento(datos, job) {
    // Formatear movimiento de caja usando PrinterService
    return PrinterService.formatearMovimientoCaja(datos.movimiento);
  }

  async imprimirDocumento(textoOResultado, job) {
    const impresora = job.impresora_destino || null;

    logger.logJob(
      job.id,
      job.tipo,
      `Imprimiendo en: ${impresora || 'impresora predeterminada'}`
    );

    let resultado;

    // CASO ESPECIAL: Factura electrónica con QR → Generar PDF
    if (job.tipo === 'factura' && textoOResultado.qrUrl) {
      try {
        console.log('📄 Generando PDF para factura electrónica con QR');

        // Parsear datos originales para acceder a factura y facturaElectronica
        const datos = JSON.parse(job.datos_json);

        // Construir objeto factura completo (igual que en procesarFactura)
        const factura = datos.factura || datos;
        if (datos.detalles && !factura.detalles) {
          factura.detalles = datos.detalles;
        }
        if (datos.factura && datos.factura.mesa_numero) {
          factura.mesa = { numero: datos.factura.mesa_numero };
        }
        // Pasar hospedaje al objeto factura para el PDF
        if (datos.hospedaje && !factura.hospedaje) {
          factura.hospedaje = datos.hospedaje;
        }
        // Mapear métodos de pago para el PDF
        if (datos.metodos_pago && !factura.metodos_pago_multiple) {
          factura.metodos_pago_multiple = datos.metodos_pago.map(mp => ({
            metodo_pago_nombre: mp.nombre || 'Efectivo',
            monto: parseFloat(mp.monto)
          }));
        }

        // Soporte para ambos nombres de campo (camelCase y snake_case)
        const facturaElectronicaPDF = datos.facturaElectronica || datos.factura_electronica || null;
        // Mapear numero_dian al campo esperado
        if (facturaElectronicaPDF && !facturaElectronicaPDF.numero_factura_electronica && facturaElectronicaPDF.numero_dian) {
          facturaElectronicaPDF.numero_factura_electronica = facturaElectronicaPDF.numero_dian;
        }
        // Agregar datos del cliente a facturaElectronica para el PDF
        if (facturaElectronicaPDF && datos.cliente && !facturaElectronicaPDF.cliente_nombre) {
          facturaElectronicaPDF.cliente_nombre = datos.cliente.nombre;
          facturaElectronicaPDF.cliente_tipo_documento = datos.cliente.tipo_documento;
          facturaElectronicaPDF.cliente_numero_documento = datos.cliente.numero_documento;
        }

        // Generar PDF temporal
        const pdfPath = await FacturaService.generarPDFFactura(
          factura,
          facturaElectronicaPDF,
          datos.configuracion
        );

        // Imprimir PDF
        resultado = await PrinterService.imprimirPDF(pdfPath, impresora);

        // Eliminar PDF temporal
        const fs = require('fs');
        try {
          fs.unlinkSync(pdfPath);
          console.log('🗑️ PDF temporal eliminado:', pdfPath);
        } catch (cleanupError) {
          console.warn('⚠️ No se pudo eliminar PDF temporal:', cleanupError.message);
        }

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al imprimir PDF');
        }

        return resultado;

      } catch (pdfError) {
        console.error('❌ Error generando/imprimiendo PDF:', pdfError);

        // Fallback: imprimir como texto sin QR
        console.log('🔄 Fallback: imprimiendo como texto sin QR');
        const textoCompleto = textoOResultado.texto + '\n[QR no disponible]\n' + textoOResultado.textoDespuesQR;
        resultado = impresora
          ? await PrinterService.imprimirConPowerShell(textoCompleto, impresora)
          : await PrinterService.imprimirTexto(textoCompleto);

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error en fallback');
        }

        return resultado;
      }
    }

    // CASO ESPECIAL: Cierre de caja → Generar PDF
    if (job.tipo === 'cierre') {
      try {
        console.log('📄 Generando PDF para cierre de caja');

        // Parsear datos originales (incluye cierre, movimientos, propinas, ventas_discriminadas, mesas_abiertas)
        const datos = JSON.parse(job.datos_json);

        // Generar PDF temporal (pasamos datos completos)
        const pdfPath = await FacturaService.generarPDFCierre(datos);

        // Imprimir PDF
        resultado = await PrinterService.imprimirPDF(pdfPath, impresora);

        // Eliminar PDF temporal
        const fs = require('fs');
        try {
          fs.unlinkSync(pdfPath);
          console.log('🗑️ PDF temporal eliminado:', pdfPath);
        } catch (cleanupError) {
          console.warn('⚠️ No se pudo eliminar PDF temporal:', cleanupError.message);
        }

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al imprimir PDF de cierre');
        }

        return resultado;

      } catch (pdfError) {
        console.error('❌ Error generando/imprimiendo PDF de cierre:', pdfError);

        // Fallback: imprimir como texto
        console.log('🔄 Fallback: imprimiendo cierre como texto');
        const texto = typeof textoOResultado === 'string' ? textoOResultado : textoOResultado.texto;
        resultado = impresora
          ? await PrinterService.imprimirConPowerShell(texto, impresora)
          : await PrinterService.imprimirTexto(texto);

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error en fallback de cierre');
        }

        return resultado;
      }
    }

    // RESTO DE CASOS: Usar método actual (comandas, comprobantes, facturas sin QR)
    if (impresora) {
      if (job.tipo === 'comanda') {
        resultado = await ComandaService.imprimirEnImpresoraEspecifica(textoOResultado, impresora);
      } else if (job.tipo === 'precuenta') {
        const texto = typeof textoOResultado === 'string' ? textoOResultado : textoOResultado.texto;
        resultado = await PrinterService.imprimirConPowerShell(texto, impresora);
      } else {
        // Facturas sin QR, cierres, etc.
        const texto = typeof textoOResultado === 'string' ? textoOResultado : textoOResultado.texto;
        resultado = await PrinterService.imprimirConPowerShell(texto, impresora);
      }
    } else {
      // Impresora predeterminada
      const texto = typeof textoOResultado === 'string' ? textoOResultado : textoOResultado.texto;
      resultado = await PrinterService.imprimirTexto(texto);
    }

    if (!resultado.success) {
      throw new Error(resultado.error || 'Error desconocido al imprimir');
    }

    return resultado;
  }
}

module.exports = QueueProcessor;
