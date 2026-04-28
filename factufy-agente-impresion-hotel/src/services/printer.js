const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const Printer = require('pure-escpos/escpos_printing.js');
const execPromise = promisify(exec);

/**
 * Servicio de impresión directa para Windows usando pure-escpos
 * Maneja correctamente el encoding para impresoras térmicas
 */
class PrinterService {

  /**
   * Obtener el nombre de la impresora predeterminada en Windows
   */
  static async obtenerImpresoraPredeterminada() {
    try {
      const { stdout } = await execPromise('wmic printer where default=true get name');
      const lineas = stdout.split('\n').map(l => l.trim()).filter(l => l && l !== 'Name');
      return lineas[0] || null;
    } catch (error) {
      console.error('Error obteniendo impresora predeterminada:', error);
      return null;
    }
  }

  /**
   * Listar todas las impresoras disponibles en Windows
   * @returns {Promise<Array<{name: string, default: boolean, status: string}>>}
   */
  static async listarImpresoras() {
    try {
      // Usar PowerShell para obtener lista completa de impresoras
      const psCommand = `powershell -Command "Get-Printer | Select-Object Name, Default, PrinterStatus | ConvertTo-Json"`;
      const { stdout } = await execPromise(psCommand);

      if (!stdout || stdout.trim() === '') {
        return [];
      }

      let impresoras = JSON.parse(stdout);

      // Si solo hay una impresora, PowerShell devuelve un objeto, no un array
      if (!Array.isArray(impresoras)) {
        impresoras = [impresoras];
      }

      return impresoras.map(imp => ({
        name: imp.Name,
        default: imp.Default || false,
        status: imp.PrinterStatus === 0 ? 'Normal' :
                imp.PrinterStatus === 1 ? 'Pausada' :
                imp.PrinterStatus === 2 ? 'Error' :
                imp.PrinterStatus === 3 ? 'Eliminando' :
                imp.PrinterStatus === 4 ? 'Imprimiendo' : 'Desconocido'
      }));
    } catch (error) {
      console.error('Error listando impresoras:', error);

      // Fallback: usar WMIC
      try {
        const { stdout } = await execPromise('wmic printer get name,default,status /format:csv');
        const lineas = stdout.split('\n').filter(l => l.trim() && !l.includes('Node'));

        return lineas.map(linea => {
          const partes = linea.split(',');
          if (partes.length >= 3) {
            return {
              name: partes[2]?.trim() || '',
              default: partes[1]?.trim().toLowerCase() === 'true',
              status: partes[3]?.trim() || 'Desconocido'
            };
          }
          return null;
        }).filter(imp => imp && imp.name);
      } catch (wmicError) {
        console.error('Error con WMIC:', wmicError);
        return [];
      }
    }
  }

  /**
   * Imprimir ticket de prueba
   * @param {string} nombreImpresora - Nombre de la impresora (opcional)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async imprimirTicketPrueba(nombreImpresora = null) {
    try {
      // Si no se especifica impresora, usar la predeterminada
      if (!nombreImpresora) {
        nombreImpresora = await this.obtenerImpresoraPredeterminada();
      }

      if (!nombreImpresora) {
        return { success: false, error: 'No se encontró impresora' };
      }

      const ancho = 32;
      const linea = '='.repeat(ancho);
      const fecha = new Date();

      let texto = '';
      texto += this.centrar('FACTUFY', ancho) + '\n';
      texto += this.centrar('Agente de Impresion', ancho) + '\n';
      texto += linea + '\n';
      texto += '\n';
      texto += this.centrar('*** TICKET DE PRUEBA ***', ancho) + '\n';
      texto += '\n';
      texto += `Fecha: ${fecha.toLocaleDateString('es-CO')}\n`;
      texto += `Hora: ${fecha.toLocaleTimeString('es-CO')}\n`;
      texto += `Impresora: ${nombreImpresora}\n`;
      texto += '\n';
      texto += linea + '\n';
      texto += '\n';
      texto += this.centrar('Si puede leer este texto', ancho) + '\n';
      texto += this.centrar('la impresora esta', ancho) + '\n';
      texto += this.centrar('funcionando correctamente', ancho) + '\n';
      texto += '\n';
      texto += linea + '\n';
      texto += this.centrar('www.factufy.com', ancho) + '\n';
      texto += '\n\n\n\n';

      return await this.imprimirTexto(texto);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Imprimir usando pure-escpos con encoding correcto
   */
  static async imprimirTexto(contenido) {
    try {
      // Obtener nombre de impresora predeterminada
      const nombreImpresora = await this.obtenerImpresoraPredeterminada();

      if (!nombreImpresora) {
        throw new Error('No se pudo encontrar la impresora predeterminada');
      }

      // Inicializar impresora
      Printer.ESCPOS_INIT();

      // Determinar el nombre de impresora a usar
      let printerName = nombreImpresora;

      // Si pure-escpos detectó impresoras, buscar coincidencia
      if (Printer.ESCPOS_PRINTERLIST.length > 0) {
        // Si no está en la lista exacta, buscar coincidencia parcial
        if (!Printer.ESCPOS_PRINTERLIST.includes(nombreImpresora)) {
          const found = Printer.ESCPOS_PRINTERLIST.find(p =>
            p.toUpperCase().includes(nombreImpresora.toUpperCase()) ||
            nombreImpresora.toUpperCase().includes(p.toUpperCase())
          );

          if (found) {
            printerName = found;
          }
        }
      } else {
        // Si pure-escpos no detectó ninguna impresora, intentar agregar manualmente
        try {
          Printer.ESCPOS_PRINTERLIST.push(nombreImpresora);
        } catch (e) {
          // Silenciar error - el fallback de PowerShell se encargará
        }
      }

      // Establecer encoding para español (CP850)
      Printer.append(Printer.ESCPOS_CP_EPSON.MULTILINGUAL_850);

      // Reset y configuración inicial
      Printer.append(Printer.ESCPOS_CMD.RESET);

      // Agregar contenido
      if (typeof contenido === 'string') {
        // Modo legacy: solo texto
        Printer.append(contenido);
      } else if (contenido.textoAntesQR) {
        // Modo nuevo: texto dividido con QR en el medio
        // Imprimir texto antes del QR
        Printer.append(contenido.textoAntesQR);

        // Imprimir QR code centrado
        Printer.append(Printer.ESCPOS_CMD.CENTER);

        // Verificar si ESCPOS_QRCODE está disponible
        if (typeof Printer.ESCPOS_QRCODE === 'function') {
          Printer.append(Printer.ESCPOS_QRCODE(contenido.qrUrl, 51, 6, 48));
        } else {
          Printer.append('\n[Codigo QR]\n');
          Printer.append(contenido.qrUrl + '\n');
        }

        // Volver a alineación izquierda y continuar con el texto después del QR
        Printer.append(Printer.ESCPOS_CMD.LEFT);
        Printer.append(contenido.textoDespuesQR);
      } else {
        // Modo antiguo con objeto simple (compatibilidad)
        Printer.append(contenido.texto);

        // Si hay QR code, agregarlo
        if (contenido.qrUrl) {
          Printer.append(Printer.ESCPOS_CMD.CENTER);
          if (typeof Printer.ESCPOS_QRCODE === 'function') {
            Printer.append(Printer.ESCPOS_QRCODE(contenido.qrUrl, 51, 6, 48));
          } else {
            Printer.append('\n[Codigo QR]\n' + contenido.qrUrl);
          }
          Printer.append('\n');
        }
      }

      // Avanzar papel y cortar
      Printer.append(Printer.ESCPOS_CMD.FEEDLINES_ANDPRINT(4));
      Printer.append(Printer.ESCPOS_CMD.FEEDCUT_PARTIAL(50));

      // Enviar a imprimir
      const success = Printer.ESCPOS_PRINT(printerName);

      if (!success) {
        const error = Printer.ESCPOS_LASTERROR || 'Error desconocido al imprimir';

        // Si falla, intentar sin el prefijo/sufijo del nombre
        const nombreSimplificado = nombreImpresora.replace(/\s*\(.*?\)\s*/g, '').trim();
        if (nombreSimplificado !== printerName) {
          const retrySuccess = Printer.ESCPOS_PRINT(nombreSimplificado);
          if (retrySuccess) {
            return { success: true, message: `Impresión enviada a ${nombreSimplificado}` };
          }
        }

        throw new Error(error);
      }

      return { success: true, message: `Impresión enviada a ${printerName}` };

    } catch (error) {
      // Fallback: intentar con PowerShell (más compatible con Windows)
      try {
        const nombreImpresora = await this.obtenerImpresoraPredeterminada();

        // Si el contenido tiene estructura de QR, combinarlo en texto plano
        let textoParaImprimir;
        if (typeof contenido === 'string') {
          textoParaImprimir = contenido;
        } else if (contenido.textoAntesQR) {
          textoParaImprimir = contenido.textoAntesQR + '\n[Codigo QR aqui]\n' + contenido.textoDespuesQR;
        } else {
          textoParaImprimir = contenido.texto || '';
        }

        return await this.imprimirConPowerShell(textoParaImprimir, nombreImpresora);
      } catch (fallbackError) {
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Formatear factura para impresión térmica 80mm (texto plano)
   * configuracion = datos del negocio desde configuracion_sistema
   */
  static formatearFactura(factura, facturaElectronica = null, configuracion = null) {
    const ancho = 48; // Caracteres en 80mm (Font A)
    const linea = '='.repeat(ancho);
    const lineaPunteada = '-'.repeat(ancho);

    let texto = '';

    // Header - usar datos de configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const nitNegocio = configuracion?.nit || '';
    const direccionNegocio = configuracion?.direccion || '';
    const ciudadNegocio = configuracion?.ciudad || '';
    const telefonoNegocio = configuracion?.telefono || '';

    texto += this.centrar(this.normalizarTexto(nombreNegocio), ancho) + '\n';
    if (nitNegocio) {
      texto += this.centrar(`NIT: ${nitNegocio}`, ancho) + '\n';
    }
    if (direccionNegocio) {
      texto += this.centrar(this.normalizarTexto(direccionNegocio), ancho) + '\n';
    }
    if (ciudadNegocio) {
      texto += this.centrar(this.normalizarTexto(ciudadNegocio), ancho) + '\n';
    }
    if (telefonoNegocio) {
      texto += this.centrar(`Tel: ${telefonoNegocio}`, ancho) + '\n';
    }
    texto += linea + '\n';
    texto += '\n';

    // Tipo de factura
    if (facturaElectronica) {
      texto += this.centrar('FACTURA ELECTRONICA DE VENTA', ancho) + '\n';
      texto += this.centrar('(Art. 616-1 E.T.)', ancho) + '\n';
      texto += '\n';
    } else {
      texto += this.centrar('FACTURA DE VENTA', ancho) + '\n';
      texto += '\n';
    }

    // Info de factura
    texto += 'Factura: ' + factura.numero_factura + '\n';
    texto += 'Fecha: ' + new Date(factura.created_at).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + '\n';

    // Datos de resolución electrónica
    if (facturaElectronica) {
      texto += '\n';
      texto += lineaPunteada + '\n';
      texto += 'RESOLUCION DIAN:\n';
      texto += `Prefijo: ${facturaElectronica.prefijo || 'N/A'}\n`;
      texto += `Numero: ${facturaElectronica.numero || 'N/A'}\n`;
      texto += `Consecutivo: ${facturaElectronica.numero_factura_electronica || 'N/A'}\n`;
      texto += lineaPunteada + '\n';
    }

    // Datos del cliente
    if (facturaElectronica && facturaElectronica.cliente_nombre) {
      texto += '\n';
      texto += 'DATOS DEL CLIENTE:\n';
      texto += `Nombre: ${this.normalizarTexto(facturaElectronica.cliente_nombre)}\n`;
      if (facturaElectronica.cliente_tipo_documento && facturaElectronica.cliente_numero_documento) {
        texto += `${facturaElectronica.cliente_tipo_documento}: ${facturaElectronica.cliente_numero_documento}\n`;
      }
      if (facturaElectronica.cliente_email) {
        texto += `Email: ${facturaElectronica.cliente_email}\n`;
      }
      if (facturaElectronica.cliente_telefono) {
        texto += `Tel: ${facturaElectronica.cliente_telefono}\n`;
      }
      if (facturaElectronica.cliente_direccion) {
        texto += `Dir: ${this.normalizarTexto(facturaElectronica.cliente_direccion)}\n`;
      }
      texto += lineaPunteada + '\n';
    }

    if (factura.mesa) {
      texto += 'Mesa: ' + factura.mesa.numero + '\n';
    }
    texto += '\n';
    texto += lineaPunteada + '\n';

    // Items
    factura.detalles.forEach(item => {
      const nombre = this.normalizarTexto(item.producto.nombre);
      const qty = item.cantidad;
      const precioUnit = this.formatearPrecio(item.precio_unitario);
      const subtotal = this.formatearPrecio(item.subtotal);

      // Nombre del producto
      texto += nombre + '\n';

      // Cantidad x Precio unitario = Subtotal
      const lineaItem = `  ${qty} x ${precioUnit}`;
      const espacios = ancho - lineaItem.length - subtotal.length;
      texto += lineaItem + ' '.repeat(Math.max(1, espacios)) + subtotal + '\n';

      if (item.notas) {
        texto += `  Nota: ${this.normalizarTexto(item.notas)}\n`;
      }
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

    // Pago
    if (factura.metodo_pago === '10') {
      // Código 10 = Efectivo
      texto += '\n';
      texto += this.filaTotal('Efectivo:', factura.dinero_recibido, ancho);
      texto += this.filaTotal('Cambio:', factura.cambio, ancho);
      texto += '\n';
    } else if (factura.metodo_pago) {
      // Usar el nombre del método de pago si está disponible (viene de la BD), sino usar el mapeo
      const metodo = factura.metodo_pago_nombre || this.obtenerNombreMetodoPago(factura.metodo_pago);
      texto += '\n';
      texto += this.centrar('Metodo de Pago: ' + metodo, ancho) + '\n';
      texto += '\n';
    }

    // CUFE y datos electrónicos
    let qrUrl = null;
    let textoAntesQR = '';
    let textoDespuesQR = '';

    if (facturaElectronica && facturaElectronica.cufe) {
      texto += '\n';
      texto += linea + '\n';
      texto += this.centrar('INFORMACION ELECTRONICA', ancho) + '\n';
      texto += linea + '\n';
      texto += '\n';
      texto += 'CUFE:\n';

      // Dividir CUFE en líneas de máximo 48 caracteres
      const cufe = facturaElectronica.cufe;
      const cufeLineas = this.dividirTexto(cufe, ancho);
      cufeLineas.forEach(linea => {
        texto += linea + '\n';
      });

      texto += '\n';

      // QR Code (se imprimirá con comando ESC/POS)
      if (facturaElectronica.pdf_url) {
        qrUrl = facturaElectronica.pdf_url;
        texto += this.centrar('CODIGO QR', ancho) + '\n';
        texto += this.centrar('(Escanee para ver PDF)', ancho) + '\n';
        texto += '\n';

        // Guardar el texto hasta este punto (antes del QR)
        textoAntesQR = texto;

        // Texto después del QR
        textoDespuesQR = '\n';
        textoDespuesQR += 'Consulte su factura en:\n';
        const urlLineas = this.dividirTexto(facturaElectronica.pdf_url, ancho);
        urlLineas.forEach(linea => {
          textoDespuesQR += linea + '\n';
        });
        textoDespuesQR += '\n';
        textoDespuesQR += lineaPunteada + '\n';
        textoDespuesQR += this.centrar('Factura valida ante la DIAN', ancho) + '\n';
        textoDespuesQR += lineaPunteada + '\n';
      } else {
        texto += '\n';
        texto += lineaPunteada + '\n';
        texto += this.centrar('Factura valida ante la DIAN', ancho) + '\n';
        texto += lineaPunteada + '\n';
      }
    }

    // Si no hay QR, continuar con el footer normalmente
    if (!qrUrl) {
      // Footer
      texto += '\n';
      texto += this.centrar('¡Gracias por su compra!', ancho) + '\n';
      texto += this.centrar('Vuelva pronto', ancho) + '\n';
      texto += lineaPunteada + '\n';

      // Espacio para cortar y avanzar papel
      texto += '\n\n\n\n';

      return texto;
    }

    // Si hay QR, agregar footer al texto después del QR
    textoDespuesQR += '\n';
    textoDespuesQR += this.centrar('¡Gracias por su compra!', ancho) + '\n';
    textoDespuesQR += this.centrar('Vuelva pronto', ancho) + '\n';
    textoDespuesQR += lineaPunteada + '\n';
    textoDespuesQR += '\n\n\n\n';

    // Retornar objeto con texto dividido y qrUrl
    return {
      textoAntesQR: textoAntesQR,
      textoDespuesQR: textoDespuesQR,
      qrUrl: qrUrl
    };
  }

  /**
   * Formatear comprobante de consumo (pre-cuenta) para impresión térmica 80mm
   * configuracion = datos del negocio desde configuracion_sistema
   */
  static formatearComprobanteConsumo(datos, configuracion = null) {
    const ancho = 48; // Caracteres en 80mm (Font A)
    const linea = '='.repeat(ancho);
    const lineaPunteada = '-'.repeat(ancho);

    let texto = '';

    // Header - usar datos de configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const telefonoNegocio = configuracion?.telefono || '';

    texto += this.centrar(this.normalizarTexto(nombreNegocio), ancho) + '\n';
    if (telefonoNegocio) {
      texto += this.centrar(`Tel: ${telefonoNegocio}`, ancho) + '\n';
    }
    texto += linea + '\n';
    texto += '\n';

    // Título del comprobante
    texto += this.centrar('*** COMPROBANTE DE CONSUMO ***', ancho) + '\n';
    texto += '\n';

    // Info de mesa y fecha
    texto += 'Fecha: ' + new Date().toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) + '\n';

    if (datos.mesa) {
      texto += `Mesa: ${datos.mesa.numero}\n`;
      texto += `Capacidad: ${datos.mesa.capacidad} personas\n`;
    }

    texto += '\n';
    texto += lineaPunteada + '\n';
    texto += this.centrar('Detalle del Consumo', ancho) + '\n';
    texto += lineaPunteada + '\n';

    // Items del carrito
    datos.items.forEach(item => {
      const nombre = this.normalizarTexto(item.nombre);
      const qty = item.cantidad;
      const precioUnit = this.formatearPrecio(item.precio);
      const subtotal = this.formatearPrecio(item.precio * item.cantidad);

      // Nombre del producto
      texto += nombre + '\n';

      // Cantidad x Precio unitario = Subtotal
      const lineaItem = `  ${qty} x ${precioUnit}`;
      const espacios = ancho - lineaItem.length - subtotal.length;
      texto += lineaItem + ' '.repeat(Math.max(1, espacios)) + subtotal + '\n';

      if (item.notas) {
        texto += `  Nota: ${this.normalizarTexto(item.notas)}\n`;
      }
    });

    texto += lineaPunteada + '\n';

    // Totales
    texto += this.filaTotal('Subtotal:', datos.subtotal, ancho);

    if (datos.impuesto > 0) {
      texto += this.filaTotal('Impuesto:', datos.impuesto, ancho);
    }

    texto += linea + '\n';
    texto += '\n';
    texto += this.filaTotal('TOTAL A PAGAR:', datos.total, ancho);
    texto += '\n';
    texto += linea + '\n';

    // Nota importante
    texto += '\n';
    texto += this.centrar('****************************', ancho) + '\n';
    texto += this.centrar('ESTE NO ES UN DOCUMENTO VALIDO', ancho) + '\n';
    texto += this.centrar('PARA FINES TRIBUTARIOS', ancho) + '\n';
    texto += '\n';
    texto += this.centrar('Pre-cuenta para verificacion', ancho) + '\n';
    texto += this.centrar('del cliente', ancho) + '\n';
    texto += this.centrar('****************************', ancho) + '\n';

    // Footer
    texto += '\n';
    texto += this.centrar('Por favor, verifique su consumo', ancho) + '\n';
    texto += this.centrar('¡Gracias por su preferencia!', ancho) + '\n';
    texto += lineaPunteada + '\n';

    // Espacio para cortar
    texto += '\n\n\n\n';

    return texto;
  }

  /**
   * Normalizar caracteres especiales para impresoras térmicas
   * Convierte caracteres con tildes/acentos a su equivalente sin acentos
   */
  static normalizarTexto(texto) {
    if (!texto) return '';

    // Mapa de caracteres especiales a su equivalente ASCII
    const mapaCaracteres = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
      'ñ': 'n', 'Ñ': 'N',
      'ü': 'u', 'Ü': 'U',
      '¿': '?', '¡': '!',
      '°': 'o', '€': 'E', '£': 'L'
    };

    let textoNormalizado = texto;
    for (const [especial, normal] of Object.entries(mapaCaracteres)) {
      textoNormalizado = textoNormalizado.replace(new RegExp(especial, 'g'), normal);
    }

    return textoNormalizado;
  }

  /**
   * Dividir texto largo en líneas de longitud máxima
   */
  static dividirTexto(texto, maxLen) {
    const lineas = [];
    for (let i = 0; i < texto.length; i += maxLen) {
      lineas.push(texto.substring(i, i + maxLen));
    }
    return lineas;
  }

  static centrar(texto, ancho) {
    // Si el texto es más largo que el ancho, truncar
    if (texto.length > ancho) {
      texto = texto.substring(0, ancho);
    }
    const paddingLeft = Math.floor((ancho - texto.length) / 2);
    const paddingRight = ancho - texto.length - paddingLeft;
    return ' '.repeat(Math.max(0, paddingLeft)) + texto + ' '.repeat(Math.max(0, paddingRight));
  }

  static truncar(texto, maxLen) {
    return texto.length > maxLen ? texto.substring(0, maxLen - 3) + '...' : texto;
  }

  static formatearPrecio(valor) {
    return '$' + new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(parseFloat(valor));
  }

  /**
   * Generar QR Code como imagen y guardarla
   */
  static async generarImagenQR(url) {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const qrPath = path.join(tempDir, `qr_${Date.now()}.png`);

      // Generar QR Code como imagen PNG
      await QRCode.toFile(qrPath, url, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      });

      return qrPath;
    } catch (error) {
      console.error('Error al generar QR Code:', error);
      return null;
    }
  }

  /**
   * Generar QR Code como texto ASCII
   */
  static async generarQRASCII(url, size = 'small') {
    try {
      // Generar QR como string (matriz de caracteres)
      const qrText = await QRCode.toString(url, {
        type: 'terminal',
        small: size === 'small',
        errorCorrectionLevel: 'M'
      });

      return qrText;
    } catch (error) {
      console.error('Error al generar QR ASCII:', error);
      return null;
    }
  }

  static filaTotal(label, valor, ancho, grande = false) {
    const precio = this.formatearPrecio(valor);
    const espacios = ancho - label.length - precio.length;
    let linea = label + ' '.repeat(Math.max(1, espacios)) + precio + '\n';

    if (grande) {
      linea = linea.toUpperCase();
    }

    return linea;
  }

  /**
   * Obtener el nombre legible del método de pago basado en código DIAN
   */
  static obtenerNombreMetodoPago(metodoPago) {
    // Mapeo de códigos DIAN a nombres legibles
    const metodosPago = {
      '10': 'Efectivo',
      '20': 'Tarjeta de Credito',
      '30': 'Tarjeta Debito',
      '41': 'Consignacion Bancaria',
      '42': 'Transferencia Bancaria',
      '43': 'Debito Interbancario',
      '45': 'Transferencia Bancaria ACH',
      '47': 'Deposito',
      '48': 'Credito CxC',
      '49': 'Debito CxC'
    };

    return metodosPago[metodoPago] || `Metodo ${metodoPago}`;
  }

  /**
   * Formatear cierre de caja para impresión térmica 80mm ESC/POS (formato profesional compacto)
   * configuracion = datos del negocio desde configuracion_sistema
   */
  static formatearCierreCaja(cierre, movimientos = [], configuracion = null) {
    const ancho = 48; // Estándar ESC/POS Font A para 80mm
    const linea = '='.repeat(ancho);

    let texto = '';

    // Header - usar datos de configuración o valores por defecto
    const nombreNegocio = configuracion?.nombre_negocio || 'FACTUFY';
    const nitNegocio = configuracion?.nit || '';
    const direccionNegocio = configuracion?.direccion || '';
    const ciudadNegocio = configuracion?.ciudad || '';

    texto += this.centrar(this.normalizarTexto(nombreNegocio), ancho) + '\n';
    if (nitNegocio) {
      texto += this.centrar(`NIT: ${nitNegocio}`, ancho) + '\n';
    }
    if (direccionNegocio) {
      texto += this.centrar(this.normalizarTexto(direccionNegocio), ancho) + '\n';
    }
    if (ciudadNegocio) {
      texto += this.centrar(this.normalizarTexto(ciudadNegocio), ancho) + '\n';
    }
    texto += linea + '\n';
    texto += this.centrar('CIERRE DE CAJA', ancho) + '\n';
    texto += linea + '\n';

    // Fechas
    const fechaApertura = new Date(cierre.fecha_apertura);
    const fechaCierre = new Date(cierre.fecha_cierre);
    texto += `Inicio: ${fechaApertura.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}/${fechaApertura.toLocaleString('es-CO', { year: '2-digit' })} ${fechaApertura.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}\n`;
    texto += `Cierre: ${fechaCierre.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}/${fechaCierre.toLocaleString('es-CO', { year: '2-digit' })} ${fechaCierre.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}\n`;

    if (cierre.usuario) {
      texto += `Cajero: ${this.normalizarTexto(cierre.usuario)}\n`;
    }

    texto += linea + '\n';

    // Resumen ventas
    texto += this.filaTotal('Base Inicial:', cierre.monto_inicial, ancho);
    texto += this.filaTotal('Efectivo:', cierre.total_efectivo, ancho);
    texto += this.filaTotal('Tarjeta:', cierre.total_tarjeta, ancho);
    texto += this.filaTotal('Transferencia:', cierre.total_transferencia, ancho);
    texto += linea + '\n';
    texto += this.filaTotal('Total Ventas:', cierre.total_ventas, ancho);

    // Movimientos de Caja
    if (movimientos && movimientos.length > 0) {
      texto += linea + '\n';
      texto += this.centrar('MOVIMIENTOS DE CAJA', ancho) + '\n';
      texto += linea + '\n';

      let totalIngresos = 0;
      let totalEgresos = 0;

      movimientos.forEach(mov => {
        const fecha = new Date(mov.fecha);
        const fechaStr = `${fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })} ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        // Tipo y concepto
        const tipoIcon = mov.tipo === 'ingreso' ? '+' : '-';
        texto += `${tipoIcon} ${this.normalizarTexto(mov.concepto)}\n`;
        texto += `  ${fechaStr}\n`;

        // Proveedor si existe
        if (mov.proveedor_nombre) {
          texto += `  Prov: ${this.normalizarTexto(mov.proveedor_nombre)}\n`;
        }

        // Monto
        const montoStr = this.formatearPrecio(mov.monto);
        const espacios = ancho - 2 - montoStr.length;
        texto += '  ' + ' '.repeat(Math.max(1, espacios)) + montoStr + '\n';

        // Observaciones si existen
        if (mov.observaciones) {
          const obs = this.normalizarTexto(mov.observaciones);
          const obsLines = this.dividirTexto(obs, ancho - 4);
          obsLines.forEach(line => {
            texto += `    ${line}\n`;
          });
        }

        texto += '\n';

        // Acumular totales
        if (mov.tipo === 'ingreso') {
          totalIngresos += parseFloat(mov.monto);
        } else {
          totalEgresos += parseFloat(mov.monto);
        }
      });

      texto += linea + '\n';
      texto += this.filaTotal('Total Ingresos:', totalIngresos, ancho);
      texto += this.filaTotal('Total Egresos:', totalEgresos, ancho);
      const balance = totalIngresos - totalEgresos;
      texto += this.filaTotal('Balance Movim.:', balance, ancho);
      texto += linea + '\n';
    }

    // Calcular monto esperado base
    let montoEsperado = parseFloat(cierre.monto_inicial) + parseFloat(cierre.total_efectivo);

    // Ajustar con balance de movimientos
    if (movimientos && movimientos.length > 0) {
      const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + parseFloat(m.monto), 0);
      const totalEgresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + parseFloat(m.monto), 0);
      const balanceMovimientos = totalIngresos - totalEgresos;

      texto += this.filaTotal('Esperado Base:', montoEsperado, ancho);
      texto += this.filaTotal('+ Balance Mov.:', balanceMovimientos, ancho);
      texto += linea + '\n';

      montoEsperado += balanceMovimientos;
      texto += this.filaTotal('Esperado Total:', montoEsperado, ancho);
    } else {
      texto += this.filaTotal('Esperado Caja:', montoEsperado, ancho);
    }

    // Arqueo - solo denominaciones con cantidad
    if (cierre.arqueo_detalle) {
      const arqueo = typeof cierre.arqueo_detalle === 'string'
        ? JSON.parse(cierre.arqueo_detalle)
        : cierre.arqueo_detalle;

      texto += linea + '\n';
      texto += this.centrar('ARQUEO DE EFECTIVO', ancho) + '\n';
      texto += linea + '\n';

      const denominaciones = [
        { key: 'b100000', label: '$100.000', valor: 100000, tipo: 'B' },
        { key: 'b50000', label: '$50.000', valor: 50000, tipo: 'B' },
        { key: 'b20000', label: '$20.000', valor: 20000, tipo: 'B' },
        { key: 'b10000', label: '$10.000', valor: 10000, tipo: 'B' },
        { key: 'b5000', label: '$5.000', valor: 5000, tipo: 'B' },
        { key: 'b2000', label: '$2.000', valor: 2000, tipo: 'B' },
        { key: 'b1000', label: '$1.000', valor: 1000, tipo: 'B' },
        { key: 'm1000', label: '$1.000', valor: 1000, tipo: 'M' },
        { key: 'm500', label: '$500', valor: 500, tipo: 'M' },
        { key: 'm200', label: '$200', valor: 200, tipo: 'M' },
        { key: 'm100', label: '$100', valor: 100, tipo: 'M' },
        { key: 'm50', label: '$50', valor: 50, tipo: 'M' }
      ];

      // Imprimir todas las denominaciones con cantidad
      denominaciones.forEach(d => {
        const cantidad = arqueo[d.key] || 0;
        if (cantidad > 0) {
          const subtotal = cantidad * d.valor;
          const lineaItem = `${d.label} x${cantidad}`;
          const precio = this.formatearPrecio(subtotal);
          const espacios = ancho - lineaItem.length - precio.length;
          texto += lineaItem + ' '.repeat(Math.max(1, espacios)) + precio + '\n';
        }
      });
    }

    texto += linea + '\n';

    // Total contado y diferencia
    texto += this.filaTotal('TOTAL CONTADO:', cierre.monto_final, ancho);

    const diferencia = parseFloat(cierre.diferencia);
    const diferenciaLabel = diferencia >= 0 ? 'Sobrante:' : 'Faltante:';
    texto += this.filaTotal(diferenciaLabel, Math.abs(diferencia), ancho);

    if (diferencia === 0) {
      texto += this.centrar('*** CAJA CUADRADA ***', ancho) + '\n';
    }

    // Notas
    if (cierre.notas) {
      texto += linea + '\n';
      texto += 'Notas: ' + this.normalizarTexto(cierre.notas) + '\n';
    }

    texto += linea + '\n';

    // Footer - usar nombre del negocio
    texto += '\n';
    texto += 'Firma: _______________________\n';
    texto += '\n';
    texto += this.centrar(this.normalizarTexto(nombreNegocio), ancho) + '\n';

    return texto;
  }

  /**
   * Imprimir factura con QR Code en impresora específica usando comandos ESC/POS
   */
  static async imprimirFacturaConQR(textoAntes, qrUrl, textoDespues, nombreImpresora) {
    try {
      // Inicializar impresora
      Printer.ESCPOS_INIT();

      // Buscar impresora en la lista
      let printerName = nombreImpresora;
      if (Printer.ESCPOS_PRINTERLIST.length > 0) {
        if (!Printer.ESCPOS_PRINTERLIST.includes(nombreImpresora)) {
          const found = Printer.ESCPOS_PRINTERLIST.find(p =>
            p.toUpperCase().includes(nombreImpresora.toUpperCase()) ||
            nombreImpresora.toUpperCase().includes(p.toUpperCase())
          );
          if (found) {
            printerName = found;
          }
        }
      } else {
        try {
          Printer.ESCPOS_PRINTERLIST.push(nombreImpresora);
        } catch (e) {
          // Silenciar error
        }
      }

      // Establecer encoding para español (CP850)
      Printer.append(Printer.ESCPOS_CP_EPSON.MULTILINGUAL_850);

      // Reset y configuración inicial
      Printer.append(Printer.ESCPOS_CMD.RESET);

      // Imprimir texto antes del QR
      Printer.append(textoAntes);

      // Imprimir QR code centrado con comandos ESC/POS
      Printer.append(Printer.ESCPOS_CMD.CENTER);

      if (typeof Printer.ESCPOS_QRCODE === 'function') {
        Printer.append(Printer.ESCPOS_QRCODE(qrUrl, 51, 6, 48));
      } else {
        Printer.append('\n[Codigo QR]\n' + qrUrl + '\n');
      }

      // Volver a alineación izquierda y continuar con el texto después del QR
      Printer.append(Printer.ESCPOS_CMD.LEFT);
      Printer.append(textoDespues);

      // Avanzar papel y cortar
      Printer.append(Printer.ESCPOS_CMD.FEEDLINES_ANDPRINT(4));
      Printer.append(Printer.ESCPOS_CMD.FEEDCUT_PARTIAL(50));

      // Enviar a imprimir
      const success = Printer.ESCPOS_PRINT(printerName);

      if (!success) {
        // Fallback: intentar con PowerShell
        const textoCompleto = textoAntes + '\n[QR code aquí]\n' + textoDespues;
        return await this.imprimirConPowerShell(textoCompleto, nombreImpresora);
      }

      return { success: true, message: `Factura con QR enviada a ${printerName}` };

    } catch (error) {
      // Fallback: imprimir sin QR con PowerShell
      const textoCompleto = textoAntes + '\n[QR no disponible]\n' + textoDespues;
      return await this.imprimirConPowerShell(textoCompleto, nombreImpresora);
    }
  }

  /**
   * Imprimir archivo PDF en impresora específica o predeterminada
   * @param {string} pdfPath - Ruta absoluta del archivo PDF
   * @param {string} nombreImpresora - Nombre de impresora (opcional)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async imprimirPDF(pdfPath, nombreImpresora = null) {
    try {
      const pdfToPrinter = require('pdf-to-printer');

      // Si no se especifica impresora, obtener la predeterminada
      if (!nombreImpresora) {
        nombreImpresora = await this.obtenerImpresoraPredeterminada();
      }

      // Opciones de impresión
      const options = {
        printer: nombreImpresora
      };

      // Imprimir PDF
      await pdfToPrinter.print(pdfPath, options);

      return { success: true, message: `PDF impreso en ${nombreImpresora}` };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Formatear movimiento de caja para impresión térmica 80mm
   */
  static formatearMovimientoCaja(movimiento) {
    const ancho = 32; // Ancho real para impresoras térmicas 80mm
    const linea = '='.repeat(ancho);
    const lineaSimple = '-'.repeat(ancho);
    let texto = '';

    // Header
    const tipoTexto = movimiento.tipo === 'ingreso' ? 'INGRESO DE CAJA' : 'EGRESO DE CAJA';
    texto += this.centrar(tipoTexto, ancho) + '\n';
    texto += linea + '\n';

    // Fecha y hora
    const fecha = new Date(movimiento.fecha);
    texto += `Fecha: ${fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}\n`;
    texto += `Hora: ${fecha.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })}\n`;

    if (movimiento.usuario_apertura) {
      texto += `Usuario: ${this.normalizarTexto(movimiento.usuario_apertura)}\n`;
    }

    texto += linea + '\n';

    // Concepto
    texto += 'CONCEPTO:\n';
    texto += this.normalizarTexto(movimiento.concepto) + '\n';
    texto += lineaSimple + '\n';

    // Proveedor si existe
    if (movimiento.proveedor_nombre) {
      texto += 'PROVEEDOR:\n';
      texto += this.normalizarTexto(movimiento.proveedor_nombre) + '\n';
      if (movimiento.proveedor_documento) {
        texto += `Doc: ${movimiento.proveedor_documento}\n`;
      }
      texto += lineaSimple + '\n';
    }

    // Monto
    texto += '\n';
    const montoLabel = movimiento.tipo === 'ingreso' ? 'MONTO INGRESADO:' : 'MONTO EGRESADO:';
    const montoValor = parseFloat(movimiento.monto) || 0;
    texto += this.filaTotal(montoLabel, montoValor, ancho);
    texto += '\n';

    // Observaciones
    if (movimiento.observaciones && movimiento.observaciones.trim()) {
      texto += lineaSimple + '\n';
      texto += 'OBSERVACIONES:\n';
      const obs = this.normalizarTexto(movimiento.observaciones);
      const obsLines = this.dividirTexto(obs, ancho - 2);
      obsLines.forEach(line => {
        texto += line + '\n';
      });
    }

    texto += linea + '\n';
    texto += '\n';
    texto += this.centrar('COMPROBANTE DE MOVIMIENTO', ancho) + '\n';
    texto += this.centrar('Conserve este documento', ancho) + '\n';
    texto += '\n';

    if (movimiento.id) {
      texto += this.centrar(`ID: ${movimiento.id}`, ancho) + '\n';
    }

    texto += '\n\n\n';

    return texto;
  }

  /**
   * Imprimir usando comando nativo de Windows
   * Intenta primero con PRINT, luego con PowerShell como fallback
   */
  static async imprimirConPowerShell(contenido, nombreImpresora) {
    const texto = typeof contenido === 'string' ? contenido : contenido.texto || '';
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `factufy_${Date.now()}.txt`);

    try {
      // Escribir contenido al archivo temporal
      fs.writeFileSync(tempFile, texto, { encoding: 'utf8' });

      // Intentar con comando PRINT de Windows primero
      try {
        const printCommand = `PRINT /D:"${nombreImpresora}" "${tempFile}"`;
        const result = await execPromise(printCommand, { timeout: 10000 });

        // Verificar si hubo un error en el stdout (PRINT no lanza excepción)
        if (result.stdout && result.stdout.includes('No se puede inicializar')) {
          throw new Error('PRINT no pudo inicializar el dispositivo');
        }

        // Limpiar archivo temporal
        setTimeout(() => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }, 2000);

        return { success: true, message: `Impresión enviada a ${nombreImpresora}` };
      } catch (printError) {
        // Si PRINT falla, intentar con PowerShell enviando bytes RAW
        const psScript = `
$printerName = "${nombreImpresora}"
$text = Get-Content -Path "${tempFile}" -Encoding UTF8 -Raw

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Printing

$bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
$printDoc = New-Object System.Drawing.Printing.PrintDocument
$printDoc.PrinterSettings.PrinterName = $printerName
$printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$paperSize = New-Object System.Drawing.Printing.PaperSize("Custom", 315, 787)
$printDoc.DefaultPageSettings.PaperSize = $paperSize

$printDoc.add_PrintPage({
    param($sender, $ev)
    $font = New-Object System.Drawing.Font("Courier New", 10, [System.Drawing.FontStyle]::Bold)
    $brush = [System.Drawing.Brushes]::Black
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $stringFormat.Trimming = [System.Drawing.StringTrimming]::None
    $ev.PageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    $ev.Graphics.DrawString($text, $font, $brush, 0, 0, $stringFormat)
})

$printDoc.Print()
`;

        const psFile = path.join(tempDir, `print_${Date.now()}.ps1`);
        fs.writeFileSync(psFile, psScript, 'utf8');

        try {
          await execPromise(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 10000 });

          // Limpiar archivos temporales
          setTimeout(() => {
            try {
              fs.unlinkSync(tempFile);
              fs.unlinkSync(psFile);
            } catch (e) {}
          }, 2000);

          return { success: true, message: `Impresión enviada a ${nombreImpresora}` };
        } catch (psError) {
          // Limpiar archivos
          try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(psFile);
          } catch (e) {}

          throw psError;
        }
      }

    } catch (error) {
      // Limpiar archivo temporal en caso de error
      try { fs.unlinkSync(tempFile); } catch (e) {}
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrinterService;
