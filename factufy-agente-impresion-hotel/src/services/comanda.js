const PrinterService = require('./printer.js');

/**
 * Servicio para formatear e imprimir comandas de cocina/bar
 * Extiende PrinterService para aprovechar la funcionalidad de impresión
 */
class ComandaService {

  /**
   * Dividir texto largo en múltiples líneas respetando el ancho
   * @param {string} texto - Texto a dividir
   * @param {number} maxAncho - Ancho máximo de línea (para la primera línea)
   * @param {number} maxAnchoSiguientes - Ancho máximo para líneas subsiguientes (si es diferente)
   * @returns {Array} Array de líneas divididas
   */
  static dividirTextoLargo(texto, maxAncho, maxAnchoSiguientes = null) {
    if (!texto) return [''];

    // Si no se especifica ancho diferente, usar el mismo para todas las líneas
    if (maxAnchoSiguientes === null) {
      maxAnchoSiguientes = maxAncho;
    }

    const palabras = texto.split(' ');
    const lineas = [];
    let lineaActual = '';
    let esPrimeraLinea = true;

    palabras.forEach(palabra => {
      const anchoActual = esPrimeraLinea ? maxAncho : maxAnchoSiguientes;
      const testLinea = lineaActual + (lineaActual ? ' ' : '') + palabra;

      if (testLinea.length <= anchoActual) {
        lineaActual = testLinea;
      } else {
        if (lineaActual) {
          lineas.push(lineaActual);
          esPrimeraLinea = false;
        }
        // Si la palabra sola es más larga que el ancho, cortarla
        if (palabra.length > anchoActual) {
          lineaActual = palabra.substring(0, anchoActual);
        } else {
          lineaActual = palabra;
        }
      }
    });

    if (lineaActual) {
      lineas.push(lineaActual);
    }

    return lineas.length > 0 ? lineas : [''];
  }

  /**
   * Formatear comanda para impresión térmica 58mm o 80mm
   * @param {Object} comanda - Datos de la comanda
   * @param {Object} config - Configuración de impresión
   * @param {number} ancho - Ancho del papel (40 para 58mm, 48 para 80mm)
   */
  static formatearComanda(comanda, config = {}, ancho = 40) {
    let texto = '';

    // Línea punteada para separación (ajustada al ancho)
    const lineaPunteada = '.'.repeat(ancho);

    // Título simple - solo el número de comanda
    const numeroComanda = comanda.numero_comanda || comanda.id || '0000';
    texto += `#CMD-${numeroComanda}\n`;

    // Mesa - formato compacto
    if (config.mostrar_mesa !== false && comanda.mesa) {
      const numeroMesa = comanda.mesa.numero || comanda.mesa;
      const zonaMesa = comanda.mesa.zona || '';
      if (zonaMesa) {
        const textoMesa = `Mesa: MESA (${numeroMesa}) - ${zonaMesa}`;
        const lineasMesa = this.dividirTextoLargo(textoMesa, ancho, ancho - 6);
        lineasMesa.forEach((linea, index) => {
          if (index === 0) {
            texto += `${linea}\n`;
          } else {
            texto += `      ${linea}\n`;
          }
        });
      } else {
        texto += `Mesa: MESA (${numeroMesa})\n`;
      }
    }

    // Mesero - formato compacto
    if (config.mostrar_mesero !== false && comanda.mesero) {
      const nombreMesero = PrinterService.normalizarTexto(comanda.mesero.nombre || comanda.mesero);
      const prefijoMesero = 'Mesero: ';
      const anchoMesero = ancho - prefijoMesero.length;
      const lineasMesero = this.dividirTextoLargo(nombreMesero, anchoMesero, ancho - 8);

      texto += `${prefijoMesero}${lineasMesero[0]}\n`;
      for (let i = 1; i < lineasMesero.length; i++) {
        texto += `        ${lineasMesero[i]}\n`;
      }
    }

    // Fecha y hora - formato en dos líneas
    const fecha = new Date(comanda.created_at || Date.now());
    if (config.mostrar_hora !== false) {
      const fechaHora = fecha.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      texto += `Fecha y hora del pedido:\n`;
      texto += `${fechaHora}\n`;
    }

    // Línea punteada antes de productos
    texto += lineaPunteada + '\n';

    // Header de tabla
    texto += 'CANTIDAD       PRODUCTO\n';

    // Línea punteada después del header
    texto += lineaPunteada + '\n';

    // Agrupar productos iguales si está configurado
    let items = comanda.items || comanda.detalles || [];

    if (config.agrupar_productos_iguales && items.length > 0) {
      items = this.agruparProductos(items);
    }

    // Items de la comanda
    items.forEach(item => {
      const nombre = PrinterService.normalizarTexto(
        item.producto?.nombre || item.nombre || 'Producto sin nombre'
      );
      const cantidad = item.cantidad || 1;

      // Formato: -> 1.0        NOMBRE_PRODUCTO
      const prefijoCantidad = `-> ${cantidad.toFixed(1)}        `;
      const anchoDisponible = ancho - prefijoCantidad.length;

      // Dividir el nombre si es muy largo
      const lineasNombre = this.dividirTextoLargo(nombre, anchoDisponible, ancho - 15);

      // Primera línea con cantidad
      texto += `${prefijoCantidad}${lineasNombre[0]}\n`;

      // Líneas adicionales del nombre (si las hay)
      for (let i = 1; i < lineasNombre.length; i++) {
        texto += `               ${lineasNombre[i]}\n`;
      }

      // Modificadores o variantes si existen
      if (item.modificadores && item.modificadores.length > 0) {
        item.modificadores.forEach(mod => {
          const modNombre = PrinterService.normalizarTexto(mod.nombre || mod);
          const prefijoMod = '               + ';
          const anchoMod = ancho - prefijoMod.length;
          const lineasMod = this.dividirTextoLargo(modNombre, anchoMod, ancho - 17);

          texto += `${prefijoMod}${lineasMod[0]}\n`;
          for (let i = 1; i < lineasMod.length; i++) {
            texto += `                 ${lineasMod[i]}\n`;
          }
        });
      }

      // Notas del producto
      if (config.mostrar_notas !== false && item.notas) {
        const notasNormalizadas = PrinterService.normalizarTexto(item.notas);
        // Las notas empiezan justo debajo de la cantidad (3 espacios: "   ")
        // Ancho total 48 - 3 espacios = 45 caracteres disponibles
        const prefijoNotas = '   '; // 3 espacios para alinear con "->"
        const anchoNotas = ancho - prefijoNotas.length;
        const lineasNotas = this.dividirTextoLargo(notasNormalizadas, anchoNotas, anchoNotas);

        // Todas las líneas de notas van con indentación de 3 espacios
        lineasNotas.forEach(linea => {
          texto += `${prefijoNotas}${linea}\n`;
        });
      }
    });

    // Línea punteada final
    texto += lineaPunteada + '\n';

    // Notas generales (si existen)
    if (config.mostrar_notas !== false && comanda.notas_generales) {
      const notasGenerales = PrinterService.normalizarTexto(comanda.notas_generales);
      const prefijoNotas = 'Notas: ';
      const anchoNotasGen = ancho - prefijoNotas.length;
      const lineasNotasGen = this.dividirTextoLargo(notasGenerales, anchoNotasGen, ancho - 7);

      texto += `${prefijoNotas}${lineasNotasGen[0]}\n`;
      for (let i = 1; i < lineasNotasGen.length; i++) {
        texto += `       ${lineasNotasGen[i]}\n`;
      }
    }

    // Espacio mínimo para cortar
    texto += '\n';

    return texto;
  }

  /**
   * Agrupar productos iguales sumando cantidades
   */
  static agruparProductos(items) {
    const mapa = new Map();

    items.forEach(item => {
      const productoId = item.producto?.id || item.producto_id || item.id;
      const notas = item.notas || '';
      const key = `${productoId}-${notas}`;

      if (mapa.has(key)) {
        const existente = mapa.get(key);
        existente.cantidad += (item.cantidad || 1);
      } else {
        mapa.set(key, { ...item });
      }
    });

    return Array.from(mapa.values());
  }

  /**
   * Dividir texto largo en líneas con indentación
   */
  static dividirTextoConIndentacion(texto, maxLen, prefijo = '') {
    const palabras = texto.split(' ');
    const lineas = [];
    let lineaActual = prefijo;

    palabras.forEach(palabra => {
      const testLinea = lineaActual + (lineaActual === prefijo ? '' : ' ') + palabra;

      if (testLinea.length <= maxLen) {
        lineaActual = testLinea;
      } else {
        if (lineaActual !== prefijo) {
          lineas.push(lineaActual);
        }
        lineaActual = prefijo + palabra;
      }
    });

    if (lineaActual !== prefijo) {
      lineas.push(lineaActual);
    }

    return lineas;
  }

  /**
   * Imprimir comanda en una impresora específica
   * @param {Object} comanda - Datos de la comanda
   * @param {string} nombreImpresora - Nombre de la impresora
   * @param {Object} config - Configuración de impresión
   * @param {number} ancho - Ancho del papel
   */
  static async imprimirComanda(comanda, nombreImpresora, config = {}, ancho = 40) {
    try {
      const textoComanda = this.formatearComanda(comanda, config, ancho);

      // Usar el servicio de impresión de PrinterService pero con impresora específica
      return await this.imprimirEnImpresoraEspecifica(textoComanda, nombreImpresora);
    } catch (error) {
      console.error('Error imprimiendo comanda:', error);
      throw error;
    }
  }

  /**
   * Imprimir en impresora específica (similar a PrinterService.imprimirTexto pero con impresora personalizada)
   */
  static async imprimirEnImpresoraEspecifica(contenido, nombreImpresora) {
    try {
      const Printer = require('pure-escpos/escpos_printing.js');

      // Inicializar impresora
      Printer.ESCPOS_INIT();

      // Buscar la impresora
      let printerName = nombreImpresora;

      if (!Printer.ESCPOS_PRINTERLIST.includes(nombreImpresora)) {
        const found = Printer.ESCPOS_PRINTERLIST.find(p =>
          p.toUpperCase().includes(nombreImpresora.toUpperCase()) ||
          nombreImpresora.toUpperCase().includes(p.toUpperCase())
        );

        if (found) {
          printerName = found;
        }
      }

      // Establecer encoding para español
      Printer.append(Printer.ESCPOS_CP_EPSON.MULTILINGUAL_850);

      // Reset
      Printer.append(Printer.ESCPOS_CMD.RESET);

      // Agregar contenido
      Printer.append(contenido);

      // Avanzar papel y cortar
      Printer.append(Printer.ESCPOS_CMD.FEEDLINES_ANDPRINT(3));
      Printer.append(Printer.ESCPOS_CMD.FEEDCUT_PARTIAL(50));

      // Enviar a imprimir
      const success = Printer.ESCPOS_PRINT(printerName);

      if (!success) {
        const error = Printer.ESCPOS_LASTERROR || 'Error desconocido al imprimir';
        throw new Error(error);
      }

      return { success: true, message: `Comanda impresa en ${printerName}` };

    } catch (error) {
      // Fallback: usar comando PRINT de Windows
      try {
        return await PrinterService.imprimirConPowerShell(contenido, nombreImpresora);
      } catch (fallbackError) {
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Agrupar items por categoría para impresión distribuida
   * @param {Array} items - Items de la comanda
   * @param {Array} asignaciones - Asignaciones de categorías a impresoras
   */
  static agruparPorCategoria(items, asignaciones) {
    const grupos = new Map();

    items.forEach(item => {
      const categoriaId = item.producto?.categoria?.id || item.categoria_id;

      // Buscar impresora asignada para esta categoría
      const asignacion = asignaciones.find(a => a.categoria_id === categoriaId);

      if (asignacion) {
        const key = asignacion.impresora_id;

        if (!grupos.has(key)) {
          grupos.set(key, {
            impresora_id: asignacion.impresora_id,
            impresora_nombre: asignacion.impresora_nombre,
            categoria_nombre: asignacion.categoria_nombre,
            items: []
          });
        }

        grupos.get(key).items.push(item);
      } else {
        // Si no tiene asignación, usar grupo "sin_asignar"
        if (!grupos.has('sin_asignar')) {
          grupos.set('sin_asignar', {
            impresora_id: null,
            impresora_nombre: 'Sin asignar',
            categoria_nombre: 'Sin categoría',
            items: []
          });
        }

        grupos.get('sin_asignar').items.push(item);
      }
    });

    return Array.from(grupos.values());
  }

  /**
   * Imprimir comandas agrupadas por categoría
   * @param {Object} comanda - Datos base de la comanda
   * @param {Array} asignaciones - Asignaciones de categorías a impresoras
   * @param {Object} config - Configuración de impresión
   */
  static async imprimirPorCategoria(comanda, asignaciones, config = {}) {
    const grupos = this.agruparPorCategoria(comanda.items || comanda.detalles, asignaciones);
    const resultados = [];

    for (const grupo of grupos) {
      if (grupo.impresora_id) {
        // Crear comanda parcial con solo los items de este grupo
        const comandaParcial = {
          ...comanda,
          items: grupo.items,
          categoria_nombre: grupo.categoria_nombre,
          area: grupo.categoria_nombre
        };

        try {
          const resultado = await this.imprimirComanda(
            comandaParcial,
            grupo.impresora_nombre,
            config,
            config.ancho_papel || 40
          );

          resultados.push({
            categoria: grupo.categoria_nombre,
            impresora: grupo.impresora_nombre,
            success: resultado.success,
            message: resultado.message
          });
        } catch (error) {
          resultados.push({
            categoria: grupo.categoria_nombre,
            impresora: grupo.impresora_nombre,
            success: false,
            error: error.message
          });
        }
      } else {
        // Items sin impresora asignada
        resultados.push({
          categoria: 'Sin categoría',
          impresora: 'Sin asignar',
          success: false,
          error: 'No hay impresora asignada para esta categoría',
          items_count: grupo.items.length
        });
      }
    }

    return resultados;
  }
}

module.exports = ComandaService;
