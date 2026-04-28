const PrinterService = require('./printer');

/**
 * Servicio para formatear e imprimir facturas
 * Usa el formato EXACTO de factufy-backend/src/services/printer.js
 */
class FacturaService {

  /**
   * Formatear factura para impresión térmica 80mm (texto plano)
   * ancho = 32 por defecto para Courier New 10pt Bold (más ancho que Font A)
   * configuracion = datos del negocio desde configuracion_sistema
   */
  static formatearFactura(factura, facturaElectronica = null, ancho = 32, configuracion = null) {
    const linea = '='.repeat(ancho);
    const lineaPunteada = '-'.repeat(ancho);

    let texto = '';

    // Header - usar datos de configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const nitNegocio = configuracion?.nit || '';
    const direccionNegocio = configuracion?.direccion || '';
    const ciudadNegocio = configuracion?.ciudad || '';
    const telefonoNegocio = configuracion?.telefono || '';

    texto += PrinterService.centrar(PrinterService.normalizarTexto(nombreNegocio), ancho) + '\n';
    if (nitNegocio) {
      texto += PrinterService.centrar(`NIT: ${nitNegocio}`, ancho) + '\n';
    }
    if (direccionNegocio) {
      texto += PrinterService.centrar(PrinterService.normalizarTexto(direccionNegocio), ancho) + '\n';
    }
    if (ciudadNegocio) {
      texto += PrinterService.centrar(PrinterService.normalizarTexto(ciudadNegocio), ancho) + '\n';
    }
    if (telefonoNegocio) {
      texto += PrinterService.centrar(`Tel: ${telefonoNegocio}`, ancho) + '\n';
    }
    texto += linea + '\n';
    texto += '\n';

    // Tipo de factura
    if (facturaElectronica) {
      texto += PrinterService.centrar('FACTURA ELECTRONICA', ancho) + '\n';
      texto += '\n';
    } else {
      texto += PrinterService.centrar('FACTURA DE VENTA', ancho) + '\n';
      texto += '\n';
    }

    // Info de factura
    // Usar consecutivo de resolución si está disponible (ya incluye el prefijo), si no usar numero_factura
    const numeroFacturaDisplay = (facturaElectronica && facturaElectronica.numero_factura_electronica)
      ? facturaElectronica.numero_factura_electronica
      : factura.numero_factura;

    texto += 'Factura: ' + numeroFacturaDisplay + '\n';
    texto += 'Fecha: ' + new Date(factura.created_at).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + '\n';

    // Datos del cliente (siempre mostrar si hay nombre)
    const clienteNombre = (facturaElectronica && facturaElectronica.cliente_nombre) || factura.cliente_nombre;
    if (clienteNombre) {
      texto += '\n';
      texto += 'Cliente: ' + PrinterService.normalizarTexto(clienteNombre) + '\n';

      if (facturaElectronica) {
        if (facturaElectronica.cliente_tipo_documento && facturaElectronica.cliente_numero_documento) {
          texto += facturaElectronica.cliente_tipo_documento + ': ' + facturaElectronica.cliente_numero_documento + '\n';
        }
        if (facturaElectronica.cliente_email) {
          texto += 'Email: ' + facturaElectronica.cliente_email + '\n';
        }
      }
    }

    if (factura.mesa) {
      texto += 'Mesa: ' + factura.mesa.numero + '\n';
    }
    texto += '\n';

    // Datos de hospedaje (si aplica)
    const hospedaje = factura.hospedaje;
    if (hospedaje) {
      texto += linea + '\n';
      texto += PrinterService.centrar('DATOS DE HOSPEDAJE', ancho) + '\n';
      texto += linea + '\n';
      texto += `Hab: ${hospedaje.habitacion_numero} (${hospedaje.habitacion_tipo || ''})\n`;
      texto += `Noches: ${hospedaje.noches}\n`;
      texto += this.filaTotal('Precio/Noche:', hospedaje.precio_noche, ancho);
      if (hospedaje.fecha_checkin) {
        texto += 'Check-in: ' + new Date(hospedaje.fecha_checkin).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) + '\n';
      }
      if (hospedaje.fecha_checkout) {
        texto += 'Check-out: ' + new Date(hospedaje.fecha_checkout).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) + '\n';
      }
      texto += '\n';
    }

    texto += lineaPunteada + '\n';

    // Items (sin notas)
    factura.detalles.forEach(item => {
      const nombre = PrinterService.normalizarTexto(item.descripcion || item.producto?.nombre || 'Item');
      const qty = item.cantidad;
      const precioUnit = PrinterService.formatearPrecio(item.precio_unitario);
      const subtotal = PrinterService.formatearPrecio(item.subtotal);

      // Nombre del producto
      texto += nombre + '\n';

      // Cantidad x Precio unitario = Subtotal
      const lineaItem = `  ${qty} x ${precioUnit}`;
      const espacios = ancho - lineaItem.length - subtotal.length;
      texto += lineaItem + ' '.repeat(Math.max(1, espacios)) + subtotal + '\n';
    });

    texto += lineaPunteada + '\n';

    // Totales
    texto += this.filaTotal('Subtotal:', factura.subtotal, ancho);

    if (factura.impuesto > 0) {
      texto += this.filaTotal('Impuesto:', factura.impuesto, ancho);
    }
    if (factura.descuento > 0) {
      texto += this.filaTotal('Descuento:', -factura.descuento, ancho);
    }
    if (factura.propina > 0) {
      texto += this.filaTotal('Propina:', factura.propina, ancho);
    }

    texto += linea + '\n';

    // TOTAL
    texto += '\n';
    texto += this.filaTotal('TOTAL:', factura.total, ancho);
    texto += '\n';

    texto += lineaPunteada + '\n';

    // Método de Pago - Soporta múltiples métodos
    if (factura.metodos_pago_multiple && factura.metodos_pago_multiple.length > 0) {
      // Múltiples métodos de pago
      texto += '\n';
      texto += linea + '\n';
      texto += PrinterService.centrar('METODOS DE PAGO', ancho) + '\n';
      texto += linea + '\n';

      for (const mp of factura.metodos_pago_multiple) {
        const nombreMetodo = mp.metodo_pago_nombre || this.obtenerNombreMetodoPago(mp.metodo_pago);
        texto += this.filaTotal(nombreMetodo + ':', mp.monto, ancho);
      }

      // Calcular cambio si hay efectivo y dinero recibido
      const efectivo = factura.metodos_pago_multiple.find(mp => mp.metodo_pago === '10');
      if (efectivo && factura.dinero_recibido && factura.cambio) {
        texto += this.filaTotal('Cambio:', factura.cambio, ancho);
      }
      texto += '\n';
    } else if (factura.metodo_pago) {
      // Método de pago único (compatibilidad)
      texto += '\n';
      const metodo = factura.metodo_pago_nombre || this.obtenerNombreMetodoPago(factura.metodo_pago);
      texto += 'Metodo de Pago:\n';
      texto += PrinterService.centrar(metodo, ancho) + '\n';

      // Si es efectivo, mostrar dinero recibido y cambio
      if (factura.metodo_pago === '10' && factura.dinero_recibido) {
        texto += '\n';
        texto += this.filaTotal('Efectivo:', factura.dinero_recibido, ancho);
        texto += this.filaTotal('Cambio:', factura.cambio, ancho);
      }
      texto += '\n';
    }

    // CUFE y datos electrónicos
    let qrUrl = null;
    let textoAntesQR = '';
    let textoDespuesQR = '';

    console.log('🔍 Verificando factura electrónica:', {
      tiene_facturaElectronica: !!facturaElectronica,
      tiene_cufe: facturaElectronica?.cufe ? 'SÍ' : 'NO',
      tiene_pdf_url: facturaElectronica?.pdf_url ? 'SÍ' : 'NO',
      tiene_xml_url: facturaElectronica?.xml_url ? 'SÍ' : 'NO',
      cufe_length: facturaElectronica?.cufe?.length || 0,
      pdf_url: facturaElectronica?.pdf_url || 'NO HAY',
      xml_url: facturaElectronica?.xml_url || 'NO HAY'
    });

    if (facturaElectronica && facturaElectronica.cufe) {
      texto += linea + '\n';
      texto += PrinterService.centrar('INFORMACION ELECTRONICA', ancho) + '\n';
      texto += linea + '\n';
      texto += '\n';

      // Resolución DIAN
      if (facturaElectronica.numero_resolucion) {
        texto += 'Resolucion DIAN:\n';
        texto += 'No: ' + facturaElectronica.numero_resolucion + '\n';
        if (facturaElectronica.prefijo) {
          texto += 'Prefijo: ' + facturaElectronica.prefijo + '\n';
        }
        // Mostrar fechas de vigencia
        if (facturaElectronica.fecha_vigencia_desde) {
          const fechaDesde = new Date(facturaElectronica.fecha_vigencia_desde).toLocaleDateString('es-CO');
          texto += 'Vigencia Desde: ' + fechaDesde + '\n';
        }
        if (facturaElectronica.fecha_vigencia_hasta) {
          const fechaHasta = new Date(facturaElectronica.fecha_vigencia_hasta).toLocaleDateString('es-CO');
          texto += 'Vigencia Hasta: ' + fechaHasta + '\n';
        }
        texto += '\n';
      }

      texto += 'CUFE:\n';

      // Dividir CUFE en líneas
      const cufe = facturaElectronica.cufe;
      const cufeLineas = PrinterService.dividirTexto(cufe, ancho);
      cufeLineas.forEach(linea => {
        texto += linea + '\n';
      });

      texto += '\n';

      // QR Code - usar pdf_url o xml_url lo que esté disponible
      const urlParaQR = facturaElectronica.pdf_url || facturaElectronica.xml_url;

      if (urlParaQR) {
        qrUrl = urlParaQR;
        texto += PrinterService.centrar('CODIGO QR', ancho) + '\n';
        const tipoDoc = facturaElectronica.pdf_url ? 'PDF' : 'XML';
        texto += PrinterService.centrar(`(Escanee para ver ${tipoDoc})`, ancho) + '\n';
        texto += '\n';

        // Guardar el texto hasta este punto (antes del QR)
        textoAntesQR = texto;

        // Texto después del QR
        textoDespuesQR = '\n';
        textoDespuesQR += 'Consulte su factura en:\n';
        const urlLineas = PrinterService.dividirTexto(urlParaQR, ancho);
        urlLineas.forEach(linea => {
          textoDespuesQR += linea + '\n';
        });
        textoDespuesQR += '\n';
        textoDespuesQR += lineaPunteada + '\n';
        textoDespuesQR += PrinterService.centrar('Factura valida DIAN', ancho) + '\n';
        textoDespuesQR += lineaPunteada + '\n';
      } else {
        texto += '\n';
        texto += lineaPunteada + '\n';
        texto += PrinterService.centrar('Factura valida DIAN', ancho) + '\n';
        texto += lineaPunteada + '\n';
      }
    }

    // Si no hay QR, continuar con el footer normalmente
    if (!qrUrl) {
      // Footer
      texto += '\n';
      texto += PrinterService.centrar('Gracias por su compra', ancho) + '\n';
      texto += PrinterService.centrar('Vuelva pronto', ancho) + '\n';
      texto += lineaPunteada + '\n';

      // Espacio para cortar
      texto += '\n\n\n';

      return { texto, qrUrl: null };
    } else {
      // Si hay QR, retornar las partes separadas
      return {
        texto: textoAntesQR,
        qrUrl: qrUrl,
        textoDespuesQR: textoDespuesQR + '\n' + PrinterService.centrar('Gracias por su compra', ancho) + '\n' + PrinterService.centrar('Vuelva pronto', ancho) + '\n' + lineaPunteada + '\n\n\n'
      };
    }
  }

  /**
   * Formatear comprobante de consumo (precuenta)
   * ancho = 32 por defecto para Courier New 10pt Bold (más ancho que Font A)
   * configuracion = datos del negocio desde configuracion_sistema
   */
  static formatearComprobante(factura, ancho = 32, configuracion = null) {
    const linea = '='.repeat(ancho);
    const lineaPunteada = '-'.repeat(ancho);

    let texto = '';

    // Header - usar datos de configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const telefonoNegocio = configuracion?.telefono || '';

    texto += PrinterService.centrar(PrinterService.normalizarTexto(nombreNegocio), ancho) + '\n';
    if (telefonoNegocio) {
      texto += PrinterService.centrar(`Tel: ${telefonoNegocio}`, ancho) + '\n';
    }
    texto += linea + '\n';
    texto += '\n';

    // Título
    texto += PrinterService.centrar('COMPROBANTE DE CONSUMO', ancho) + '\n';
    texto += PrinterService.centrar('(No valido como factura)', ancho) + '\n';
    texto += '\n';

    // Info básica
    texto += 'Comprobante: ' + factura.numero_factura + '\n';
    texto += 'Fecha: ' + new Date(factura.created_at).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + '\n';

    if (factura.mesa) {
      texto += 'Mesa: ' + factura.mesa.numero + '\n';
    }

    if (factura.mesero) {
      texto += 'Mesero: ' + PrinterService.normalizarTexto(factura.mesero) + '\n';
    }

    texto += '\n';
    texto += lineaPunteada + '\n';

    // Items (sin notas en comprobante)
    factura.detalles.forEach(item => {
      const nombre = PrinterService.normalizarTexto(item.descripcion || item.producto?.nombre || 'Item');
      const qty = item.cantidad;
      const precioUnit = PrinterService.formatearPrecio(item.precio_unitario);
      const subtotal = PrinterService.formatearPrecio(item.subtotal);

      // Nombre del producto
      texto += nombre + '\n';

      // Cantidad x Precio unitario = Subtotal
      const lineaItem = `  ${qty} x ${precioUnit}`;
      const espacios = ancho - lineaItem.length - subtotal.length;
      texto += lineaItem + ' '.repeat(Math.max(1, espacios)) + subtotal + '\n';
    });

    texto += lineaPunteada + '\n';

    // Totales
    texto += this.filaTotal('Subtotal:', factura.subtotal, ancho);

    if (factura.impuesto > 0) {
      texto += this.filaTotal('Impuesto:', factura.impuesto, ancho);
    }
    if (factura.descuento > 0) {
      texto += this.filaTotal('Descuento:', -factura.descuento, ancho);
    }
    if (factura.propina > 0) {
      texto += this.filaTotal('Propina:', factura.propina, ancho);
    }

    texto += linea + '\n';

    // TOTAL
    texto += '\n';
    texto += this.filaTotal('TOTAL A PAGAR:', factura.total, ancho);
    texto += '\n';

    texto += lineaPunteada + '\n';

    // Footer
    texto += '\n';
    texto += PrinterService.centrar('Verifique su consumo', ancho) + '\n';
    texto += PrinterService.centrar('Pida factura en caja', ancho) + '\n';
    texto += lineaPunteada + '\n';

    // Espacio para cortar
    texto += '\n\n\n';

    return texto;
  }

  /**
   * Fila de total con label y valor alineados
   */
  static filaTotal(label, valor, ancho) {
    const valorStr = PrinterService.formatearPrecio(valor);
    const espacios = ancho - label.length - valorStr.length;
    return label + ' '.repeat(Math.max(1, espacios)) + valorStr + '\n';
  }

  /**
   * Obtener nombre del método de pago
   */
  static obtenerNombreMetodoPago(codigo) {
    const metodos = {
      '10': 'Efectivo',
      '30': 'Tarjeta Debito',
      '31': 'Tarjeta Credito',
      '42': 'Consignacion Bancaria',
      '47': 'Transferencia Bancaria',
      '48': 'Otros'
    };
    return metodos[codigo] || 'Otro';
  }

  /**
   * Imprimir factura en impresora específica
   */
  static async imprimirEnImpresoraEspecifica(factura, facturaElectronica, nombreImpresora) {
    try {
      const resultado = this.formatearFactura(factura, facturaElectronica);

      // Si hay QR, usar pure-escpos para imprimir con QR
      if (resultado.qrUrl) {
        // TODO: Implementar impresión con QR usando pure-escpos
        // Por ahora, imprimir sin QR
        const textoCompleto = resultado.texto + '\n(QR no disponible en esta version)\n' + resultado.textoDespuesQR;
        return await PrinterService.imprimirConPowerShell(textoCompleto, nombreImpresora);
      } else {
        // Imprimir normal con PowerShell
        return await PrinterService.imprimirConPowerShell(resultado.texto, nombreImpresora);
      }
    } catch (error) {
      console.error('Error al imprimir factura:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Imprimir comprobante en impresora específica
   */
  static async imprimirComprobanteEnImpresora(factura, nombreImpresora) {
    try {
      const texto = this.formatearComprobante(factura);
      return await PrinterService.imprimirConPowerShell(texto, nombreImpresora);
    } catch (error) {
      console.error('Error al imprimir comprobante:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generar PDF de factura electrónica con QR code
   * @param {Object} factura - Datos de la factura
   * @param {Object} facturaElectronica - Datos electrónicos (CUFE, resolución, etc.)
   * @param {Object} configuracion - Datos del negocio desde configuracion_sistema
   * @returns {Promise<string>} - Ruta del archivo PDF temporal
   */
  static async generarPDFFactura(factura, facturaElectronica, configuracion = null) {
    const PDFDocument = require('pdfkit');
    const QRCode = require('qrcode');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    console.log('📄 Generando PDF de factura electrónica...');

    // Datos del negocio desde configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const nitNegocio = configuracion?.nit || '';
    const direccionNegocio = configuracion?.direccion || '';
    const ciudadNegocio = configuracion?.ciudad || '';
    const telefonoNegocio = configuracion?.telefono || '';

    // Crear documento PDF para papel térmico 80mm
    const doc = new PDFDocument({
      size: [226.77, 841.89],  // 80mm ancho x altura variable (puntos)
      margins: { top: 0, bottom: 10, left: 10, right: 10 }  // Sin margen superior
    });

    // Generar nombre de archivo temporal
    const tempPath = path.join(os.tmpdir(), `factura_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(tempPath);
    doc.pipe(stream);

    // Forzar inicio desde el tope del documento (sin espacio en blanco)
    doc.y = 5;

    // SECCIÓN 1: Header - usar datos de configuración
    doc.fontSize(14).font('Helvetica-Bold').text(PrinterService.normalizarTexto(nombreNegocio), { align: 'center' });
    if (nitNegocio) {
      doc.fontSize(9).font('Helvetica').text(`NIT: ${nitNegocio}`, { align: 'center' });
    }
    if (direccionNegocio) {
      doc.fontSize(9).font('Helvetica').text(PrinterService.normalizarTexto(direccionNegocio), { align: 'center' });
    }
    if (ciudadNegocio) {
      doc.fontSize(9).font('Helvetica').text(PrinterService.normalizarTexto(ciudadNegocio), { align: 'center' });
    }
    if (telefonoNegocio) {
      doc.fontSize(9).font('Helvetica').text(`Tel: ${telefonoNegocio}`, { align: 'center' });
    }
    doc.moveDown(0.3);
    doc.fontSize(8).text('='.repeat(48), { align: 'center' });
    doc.moveDown(0.3);

    // SECCIÓN 2: Tipo de factura
    if (facturaElectronica) {
      doc.fontSize(11).font('Helvetica-Bold').text('FACTURA ELECTRONICA', { align: 'center' });
    } else {
      doc.fontSize(11).font('Helvetica-Bold').text('FACTURA DE VENTA', { align: 'center' });
    }
    doc.moveDown(0.4);

    // SECCIÓN 3: Info de factura
    const numeroFactura = (facturaElectronica && facturaElectronica.numero_factura_electronica)
      ? facturaElectronica.numero_factura_electronica
      : factura.numero_factura;

    doc.fontSize(10).font('Helvetica').text(`Factura: ${numeroFactura}`);
    doc.fontSize(9).text(`Fecha: ${new Date(factura.created_at).toLocaleString('es-CO')}`);
    doc.moveDown(0.4);

    // SECCIÓN 4: Datos del cliente
    const clienteNombre = (facturaElectronica?.cliente_nombre) || factura.cliente_nombre;
    if (clienteNombre) {
      doc.fontSize(10).font('Helvetica-Bold').text(`Cliente: ${PrinterService.normalizarTexto(clienteNombre)}`);
      if (facturaElectronica) {
        doc.fontSize(9).font('Helvetica');
        if (facturaElectronica.cliente_tipo_documento && facturaElectronica.cliente_numero_documento) {
          doc.text(`${facturaElectronica.cliente_tipo_documento}: ${facturaElectronica.cliente_numero_documento}`);
        }
        if (facturaElectronica.cliente_email) {
          doc.text(`Email: ${facturaElectronica.cliente_email}`);
        }
      }
    }

    if (factura.mesa) {
      doc.fontSize(9).font('Helvetica').text(`Mesa: ${factura.mesa.numero}`);
    }
    doc.moveDown(0.3);

    // SECCIÓN 4b: Datos de Hospedaje (si aplica)
    const hospedajePDF = factura.hospedaje;
    if (hospedajePDF) {
      doc.fontSize(8).text('='.repeat(48));
      doc.fontSize(11).font('Helvetica-Bold').text('DATOS DE HOSPEDAJE', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('='.repeat(48));
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Habitacion: ${hospedajePDF.habitacion_numero} (${hospedajePDF.habitacion_tipo || ''})`);
      doc.text(`Noches: ${hospedajePDF.noches}`);
      doc.text(`Precio/Noche:`, { continued: true })
        .text(PrinterService.formatearPrecio(hospedajePDF.precio_noche), { align: 'right' });

      if (hospedajePDF.fecha_checkin) {
        doc.fontSize(9).text(`Check-in: ${new Date(hospedajePDF.fecha_checkin).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`);
      }
      if (hospedajePDF.fecha_checkout) {
        doc.fontSize(9).text(`Check-out: ${new Date(hospedajePDF.fecha_checkout).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`);
      }
      doc.moveDown(0.3);
    }

    doc.fontSize(8).text('-'.repeat(48));
    doc.moveDown(0.3);

    // SECCIÓN 5: Items
    factura.detalles.forEach(item => {
      doc.fontSize(10).font('Helvetica-Bold').text(PrinterService.normalizarTexto(item.descripcion || item.producto?.nombre || 'Item'));
      doc.fontSize(9).font('Helvetica')
        .text(`  ${item.cantidad} x ${PrinterService.formatearPrecio(item.precio_unitario)}`, { continued: true })
        .text(PrinterService.formatearPrecio(item.subtotal), { align: 'right' });
    });

    doc.moveDown(0.3);
    doc.fontSize(8).text('-'.repeat(48));
    doc.moveDown(0.3);

    // SECCIÓN 6: Totales
    doc.fontSize(9).font('Helvetica');
    doc.text(`Subtotal:`, { continued: true }).text(PrinterService.formatearPrecio(factura.subtotal), { align: 'right' });
    if (factura.impuesto > 0) {
      doc.text(`Impuesto:`, { continued: true }).text(PrinterService.formatearPrecio(factura.impuesto), { align: 'right' });
    }
    if (factura.descuento > 0) {
      doc.text(`Descuento:`, { continued: true }).text(PrinterService.formatearPrecio(-factura.descuento), { align: 'right' });
    }
    if (factura.propina > 0) {
      doc.text(`Propina:`, { continued: true }).text(PrinterService.formatearPrecio(factura.propina), { align: 'right' });
    }

    doc.moveDown(0.3);
    doc.fontSize(8).text('='.repeat(48));
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold')
      .text(`TOTAL:`, { continued: true })
      .text(PrinterService.formatearPrecio(factura.total), { align: 'right' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').text('-'.repeat(48));
    doc.moveDown(0.3);

    // SECCIÓN 7: Método de pago - Soporta múltiples métodos
    if (factura.metodos_pago_multiple && factura.metodos_pago_multiple.length > 0) {
      // Múltiples métodos de pago
      doc.fontSize(8).text('='.repeat(48));
      doc.fontSize(11).font('Helvetica-Bold').text('METODOS DE PAGO', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('='.repeat(48));
      doc.moveDown(0.3);

      for (const mp of factura.metodos_pago_multiple) {
        const nombreMetodo = mp.metodo_pago_nombre || this.obtenerNombreMetodoPago(mp.metodo_pago);
        doc.fontSize(10).font('Helvetica')
          .text(`${nombreMetodo}:`, { continued: true })
          .text(PrinterService.formatearPrecio(mp.monto), { align: 'right' });
      }

      // Cambio si hay efectivo
      const efectivo = factura.metodos_pago_multiple.find(mp => mp.metodo_pago === '10');
      if (efectivo && factura.dinero_recibido && factura.cambio) {
        doc.fontSize(9).text(`Cambio:`, { continued: true })
          .text(PrinterService.formatearPrecio(factura.cambio), { align: 'right' });
      }
      doc.moveDown(0.3);
    } else if (factura.metodo_pago) {
      // Método de pago único (compatibilidad)
      const metodo = factura.metodo_pago_nombre || this.obtenerNombreMetodoPago(factura.metodo_pago);
      doc.fontSize(9).font('Helvetica').text('Metodo de Pago:', { align: 'center' });
      doc.fontSize(10).font('Helvetica-Bold').text(metodo, { align: 'center' });
      doc.font('Helvetica');

      if (factura.metodo_pago === '10' && factura.dinero_recibido) {
        doc.moveDown(0.3);
        doc.fontSize(9).text(`Efectivo:`, { continued: true }).text(PrinterService.formatearPrecio(factura.dinero_recibido), { align: 'right' });
        doc.text(`Cambio:`, { continued: true }).text(PrinterService.formatearPrecio(factura.cambio), { align: 'right' });
      }
      doc.moveDown(0.3);
    }

    // SECCIÓN 8: Información Electrónica + QR
    if (facturaElectronica && facturaElectronica.cufe) {
      doc.fontSize(8).text('='.repeat(48));
      doc.fontSize(11).font('Helvetica-Bold').text('INFORMACION ELECTRONICA', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('='.repeat(48));
      doc.moveDown(0.3);

      // Resolución DIAN
      if (facturaElectronica.numero_resolucion) {
        doc.fontSize(9).font('Helvetica-Bold').text('Resolucion DIAN:');
        doc.fontSize(9).font('Helvetica').text(`No: ${facturaElectronica.numero_resolucion}`);
        if (facturaElectronica.prefijo) {
          doc.text(`Prefijo: ${facturaElectronica.prefijo}`);
        }
        if (facturaElectronica.fecha_vigencia_desde) {
          doc.text(`Vigencia Desde: ${new Date(facturaElectronica.fecha_vigencia_desde).toLocaleDateString('es-CO')}`);
        }
        if (facturaElectronica.fecha_vigencia_hasta) {
          doc.text(`Vigencia Hasta: ${new Date(facturaElectronica.fecha_vigencia_hasta).toLocaleDateString('es-CO')}`);
        }
        doc.moveDown(0.3);
      }

      // CUFE (con mejor tamaño de fuente para legibilidad)
      doc.fontSize(10).font('Helvetica-Bold').text('CUFE:');
      doc.fontSize(9).font('Helvetica').text(facturaElectronica.cufe, {
        width: 200,
        align: 'left'
      });
      doc.moveDown(0.4);

      // QR CODE
      const urlParaQR = facturaElectronica.pdf_url || facturaElectronica.xml_url;
      if (urlParaQR) {
        doc.fontSize(11).font('Helvetica-Bold').text('CODIGO QR', { align: 'center' });
        const tipoDoc = facturaElectronica.pdf_url ? 'PDF' : 'XML';
        doc.fontSize(9).font('Helvetica').text(`(Escanee para ver ${tipoDoc})`, { align: 'center' });
        doc.moveDown(0.4);

        // Generar imagen QR (optimizado para velocidad)
        const qrBuffer = await QRCode.toBuffer(urlParaQR, {
          errorCorrectionLevel: 'L',  // Nivel bajo = más rápido
          type: 'png',
          width: 150,  // Reducido de 200 a 150 para generar más rápido
          margin: 1
        });

        // Insertar imagen QR centrada
        const pageWidth = 226.77;
        const qrWidth = 130;
        const xPos = (pageWidth - qrWidth) / 2;

        // Guardar posición Y actual
        const yPosAntes = doc.y;

        // Insertar QR
        doc.image(qrBuffer, xPos, yPosAntes, { width: qrWidth });

        // Mover cursor DEBAJO del QR (altura del QR + margen)
        doc.y = yPosAntes + qrWidth + 10;

        // URL debajo del QR (con wrap para URLs largas y mejor legibilidad)
        doc.fontSize(9).font('Helvetica-Bold').text('Consulte su factura en:', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text(urlParaQR, {
          align: 'center',
          width: 200
        });
        doc.moveDown(0.4);
      }

      doc.fontSize(8).text('-'.repeat(48));
      doc.fontSize(9).font('Helvetica-Bold').text('Factura valida DIAN', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('-'.repeat(48));
    }

    // SECCIÓN 9: Footer
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica-Bold').text('Gracias por su compra', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Vuelva pronto', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text('-'.repeat(48));

    // Finalizar PDF
    doc.end();

    // Esperar a que se complete la escritura
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log('✅ PDF generado:', tempPath);
    return tempPath;
  }

  /**
   * Generar PDF de cierre de caja
   * @param {Object} datos - Datos del cierre incluyendo configuracion
   * @returns {Promise<string>} - Ruta del archivo PDF temporal
   */
  static async generarPDFCierre(datos) {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    console.log('📄 Generando PDF de cierre de caja...');
    console.log('📊 Datos recibidos:', JSON.stringify(datos, null, 2));

    // Extraer datos
    const cierre = datos;
    const movimientos = datos.movimientos || [];
    const ventasPorMetodo = datos.ventas_por_metodo || [];
    const mesasAbiertas = datos.mesas_abiertas || [];
    const totalPropinas = parseFloat(datos.total_propinas || 0);
    const configuracion = datos.configuracion || null;

    // Datos del negocio desde configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const nitNegocio = configuracion?.nit || '';
    const direccionNegocio = configuracion?.direccion || '';
    const ciudadNegocio = configuracion?.ciudad || '';

    // PASO 1: Calcular altura estimada del contenido (ajustado para fuentes más grandes)
    let alturaEstimada = 70; // Header base (fuentes más grandes)
    alturaEstimada += 45; // Info cierre

    // Consecutivos de facturación
    if (datos.primer_consecutivo || datos.ultimo_consecutivo) {
      alturaEstimada += 60;
    }

    alturaEstimada += 55; // Resumen ventas

    // Ventas por método de pago (dinámico)
    if (ventasPorMetodo.length > 0) {
      alturaEstimada += 30 + (ventasPorMetodo.length * 16);
    }

    // Propinas
    if (totalPropinas > 0) {
      // Altura para propinas generales + propinas por método
      const metodosConPropinas = ventasPorMetodo.filter(v => parseFloat(v.propinas || 0) > 0);
      alturaEstimada += 35 + (metodosConPropinas.length * 14);
    }

    // Movimientos
    if (movimientos.length > 0) {
      alturaEstimada += 30 + (movimientos.length * 16);
    }

    // Arqueo
    if (cierre.arqueo_detalle) {
      alturaEstimada += 120;
    }

    // Mesas abiertas
    if (mesasAbiertas.length > 0) {
      alturaEstimada += 30 + (mesasAbiertas.length * 16) + 20;
    }

    alturaEstimada += 110; // Totales, diferencia, notas y firma
    if (cierre.notas) alturaEstimada += 45;

    // Crear documento con altura dinámica
    const doc = new PDFDocument({
      size: [226.77, Math.max(alturaEstimada, 200)],
      margins: { top: 5, bottom: 5, left: 8, right: 8 }
    });

    const tempPath = path.join(os.tmpdir(), `cierre_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(tempPath);
    doc.pipe(stream);

    const anchoLinea = 36;  // Reducido para fuentes más grandes

    // Helper para línea separadora
    const linea = (char = '-') => {
      doc.fontSize(8).font('Helvetica').text(char.repeat(anchoLinea));
    };

    // HEADER - usar datos de configuración
    doc.fontSize(14).font('Helvetica-Bold').text(PrinterService.normalizarTexto(nombreNegocio), { align: 'center' });
    if (nitNegocio) {
      doc.fontSize(9).font('Helvetica').text(`NIT: ${nitNegocio}`, { align: 'center' });
    }
    if (direccionNegocio) {
      doc.fontSize(9).font('Helvetica').text(PrinterService.normalizarTexto(direccionNegocio), { align: 'center' });
    }
    if (ciudadNegocio) {
      doc.fontSize(9).font('Helvetica').text(PrinterService.normalizarTexto(ciudadNegocio), { align: 'center' });
    }
    linea('=');
    doc.fontSize(13).font('Helvetica-Bold').text('CIERRE DE CAJA', { align: 'center' });
    linea();

    // INFO CIERRE
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${new Date(cierre.created_at || cierre.fecha_cierre).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`);
    if (cierre.usuario) {
      doc.text(`Usuario: ${cierre.usuario}`);
    }
    linea();

    // CONSECUTIVOS DE FACTURACIÓN
    const primerConsec = datos.primer_consecutivo;
    const ultimoConsec = datos.ultimo_consecutivo;
    const totalFacturas = datos.total_facturas || 0;

    if (primerConsec || ultimoConsec) {
      doc.fontSize(11).font('Helvetica-Bold').text('CONSECUTIVOS', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Facturas:`, { continued: true }).text(`${totalFacturas}`, { align: 'right' });
      if (primerConsec) {
        doc.text(`Primer Consecutivo:`, { continued: true }).text(`${primerConsec}`, { align: 'right' });
      }
      if (ultimoConsec) {
        doc.text(`Último Consecutivo:`, { continued: true }).text(`${ultimoConsec}`, { align: 'right' });
      }
      linea();
    }

    // RESUMEN VENTAS
    doc.fontSize(11).font('Helvetica-Bold').text('RESUMEN DE VENTAS', { align: 'center' });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Monto Inicial:`, { continued: true }).text(PrinterService.formatearPrecio(cierre.monto_inicial), { align: 'right' });
    doc.text(`Total Ventas:`, { continued: true }).text(PrinterService.formatearPrecio(cierre.total_ventas), { align: 'right' });
    linea();

    // VENTAS POR MÉTODO DE PAGO (DINÁMICO)
    if (ventasPorMetodo.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('VENTAS POR METODO', { align: 'center' });
      doc.fontSize(10).font('Helvetica');

      ventasPorMetodo.forEach(venta => {
        const total = parseFloat(venta.total || 0);
        const cantidad = parseInt(venta.cantidad_facturas || 0);
        const nombreMetodo = venta.nombre_metodo || venta.metodo_pago || 'Desconocido';
        const label = cantidad > 0 ? `${nombreMetodo} (${cantidad}):` : `${nombreMetodo}:`;
        doc.text(label, { continued: true }).text(PrinterService.formatearPrecio(total), { align: 'right' });
      });
      linea();
    }

    // PROPINAS (DINÁMICO)
    if (totalPropinas > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('PROPINAS', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Propinas:`, { continued: true }).text(PrinterService.formatearPrecio(totalPropinas), { align: 'right' });

      // Mostrar propinas por método de pago dinámicamente
      ventasPorMetodo.forEach(venta => {
        const propina = parseFloat(venta.propinas || 0);
        if (propina > 0) {
          const nombreMetodo = venta.nombre_metodo || venta.metodo_pago || 'Desconocido';
          doc.text(`  ${nombreMetodo}:`, { continued: true }).text(PrinterService.formatearPrecio(propina), { align: 'right' });
        }
      });
      linea();
    }

    // MOVIMIENTOS DE CAJA
    if (movimientos && movimientos.length > 0) {
      const ingresos = movimientos.filter(m => m.tipo === 'ingreso');
      const egresos = movimientos.filter(m => m.tipo === 'egreso');

      doc.fontSize(11).font('Helvetica-Bold').text('MOVIMIENTOS DE CAJA', { align: 'center' });

      if (ingresos.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').text('Ingresos:');
        doc.font('Helvetica');
        ingresos.forEach(mov => {
          doc.text(`  ${mov.concepto || 'Sin concepto'}`, { continued: true });
          doc.text(`+${PrinterService.formatearPrecio(mov.monto)}`, { align: 'right' });
        });
      }

      if (egresos.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').text('Egresos:');
        doc.font('Helvetica');
        egresos.forEach(mov => {
          doc.text(`  ${mov.concepto || 'Sin concepto'}`, { continued: true });
          doc.text(`-${PrinterService.formatearPrecio(mov.monto)}`, { align: 'right' });
        });
      }

      linea();
    }

    // ARQUEO DE CAJA
    if (cierre.arqueo_detalle) {
      const arqueo = typeof cierre.arqueo_detalle === 'string'
        ? JSON.parse(cierre.arqueo_detalle)
        : cierre.arqueo_detalle;

      doc.fontSize(11).font('Helvetica-Bold').text('ARQUEO DE CAJA', { align: 'center' });
      doc.fontSize(10).font('Helvetica');

      const billetes = [
        { denom: 100000, cant: arqueo.b100000 },
        { denom: 50000, cant: arqueo.b50000 },
        { denom: 20000, cant: arqueo.b20000 },
        { denom: 10000, cant: arqueo.b10000 },
        { denom: 5000, cant: arqueo.b5000 },
        { denom: 2000, cant: arqueo.b2000 },
        { denom: 1000, cant: arqueo.b1000 }
      ].filter(b => b.cant > 0);

      if (billetes.length > 0) {
        doc.font('Helvetica-Bold').text('Billetes:');
        doc.font('Helvetica');
        billetes.forEach(b => {
          const precio = PrinterService.formatearPrecio(b.denom).replace('$', '');
          doc.text(`  $${precio} x ${b.cant}`, { continued: true });
          doc.text(PrinterService.formatearPrecio(b.denom * b.cant), { align: 'right' });
        });
      }

      const monedas = [
        { denom: 1000, cant: arqueo.m1000 },
        { denom: 500, cant: arqueo.m500 },
        { denom: 200, cant: arqueo.m200 },
        { denom: 100, cant: arqueo.m100 },
        { denom: 50, cant: arqueo.m50 }
      ].filter(m => m.cant > 0);

      if (monedas.length > 0) {
        doc.font('Helvetica-Bold').text('Monedas:');
        doc.font('Helvetica');
        monedas.forEach(m => {
          const precio = PrinterService.formatearPrecio(m.denom).replace('$', '');
          doc.text(`  $${precio} x ${m.cant}`, { continued: true });
          doc.text(PrinterService.formatearPrecio(m.denom * m.cant), { align: 'right' });
        });
      }

      linea();
    }

    // MESAS ABIERTAS
    if (mesasAbiertas && mesasAbiertas.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('MESAS ABIERTAS', { align: 'center' });
      doc.fontSize(10).font('Helvetica');

      let totalMesasAbiertas = 0;
      mesasAbiertas.forEach(mesa => {
        const total = parseFloat(mesa.total_pendiente || 0);
        totalMesasAbiertas += total;
        const nombreMesa = mesa.nombre || `Mesa ${mesa.numero}`;
        doc.text(`  ${nombreMesa}`, { continued: true });
        doc.text(PrinterService.formatearPrecio(total), { align: 'right' });
      });

      doc.font('Helvetica-Bold').text(`Total pendiente:`, { continued: true });
      doc.text(PrinterService.formatearPrecio(totalMesasAbiertas), { align: 'right' });

      linea();
    }

    // CUADRE DE CAJA
    linea('=');
    doc.fontSize(11).font('Helvetica-Bold').text('CUADRE DE CAJA', { align: 'center' });

    // Calcular el esperado en efectivo (dinámico - buscar método "efectivo")
    const montoInicial = parseFloat(cierre.monto_inicial || 0);

    // Buscar el total de efectivo dinámicamente
    const ventaEfectivo = ventasPorMetodo.find(v =>
      (v.metodo_pago || '').toLowerCase() === 'efectivo' ||
      (v.nombre_metodo || '').toLowerCase() === 'efectivo'
    );
    const ventasEfectivo = ventaEfectivo ? parseFloat(ventaEfectivo.total || 0) : parseFloat(cierre.total_efectivo || 0);

    const esperadoEfectivo = montoInicial + ventasEfectivo;
    const totalContado = parseFloat(cierre.monto_final || 0);

    // Calcular diferencia correctamente: Total Contado - Esperado
    // Positivo = SOBRANTE (hay más dinero del esperado)
    // Negativo = FALTANTE (hay menos dinero del esperado)
    // Cero = CUADRA
    const diferenciaCalculada = totalContado - esperadoEfectivo;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Esperado (Base+Efect):`, { continued: true }).text(PrinterService.formatearPrecio(esperadoEfectivo), { align: 'right' });
    doc.text(`Total Contado:`, { continued: true }).text(PrinterService.formatearPrecio(totalContado), { align: 'right' });

    linea();

    // Determinar estado basado en la diferencia calculada
    let estado;
    let valorMostrar;
    if (diferenciaCalculada === 0) {
      estado = 'CUADRA';
      valorMostrar = '$0';
    } else if (diferenciaCalculada > 0) {
      estado = 'SOBRANTE';
      valorMostrar = `+${PrinterService.formatearPrecio(diferenciaCalculada)}`;
    } else {
      estado = 'FALTANTE';
      valorMostrar = `-${PrinterService.formatearPrecio(Math.abs(diferenciaCalculada))}`;
    }

    doc.fontSize(11).font('Helvetica-Bold').text(`DIFERENCIA (${estado}):`, { continued: true });
    doc.text(valorMostrar, { align: 'right' });
    linea();

    // NOTAS
    if (cierre.notas) {
      doc.fontSize(10).font('Helvetica-Bold').text('Notas:');
      doc.fontSize(9).font('Helvetica').text(cierre.notas, { width: 200 });
      linea();
    }

    // FIRMA
    doc.fontSize(10).font('Helvetica-Bold').text('Firma del cajero:', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('_______________________', { align: 'center' });

    // Finalizar
    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log('✅ PDF de cierre generado:', tempPath);
    return tempPath;
  }
}

module.exports = FacturaService;
