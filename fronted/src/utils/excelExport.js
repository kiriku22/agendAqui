import * as XLSX from 'xlsx';

/**
 * Exporta el inventario de productos a Excel con formato profesional
 * @param {Array} items - Array de items del inventario
 * @param {String} filename - Nombre del archivo (sin extensión)
 */
export const exportarInventarioAExcel = (items, filename = 'Inventario_Productos') => {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet vacío
  const ws = {};

  // Agregar información de encabezado (filas 1-4)
  const encabezado = [
    ['INVENTARIO DE PRODUCTOS - FACTUFY HOTEL'],
    [`Generado el: ${new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`],
    [`Total de productos: ${items.length}`],
    ['']  // Línea en blanco
  ];

  // Insertar encabezado en las primeras 4 filas
  XLSX.utils.sheet_add_aoa(ws, encabezado, { origin: 'A1' });

  // Preparar datos para el Excel
  const datosExcel = items.map((item, index) => ({
    'N°': index + 1,
    'Código': item.codigo || 'N/A',
    'Nombre': item.nombre,
    'Categoría': item.categoria?.nombre || 'Sin categoría',
    'Descripción': item.descripcion || '',
    'Precio Base': item.precio_base,
    'IVA (%)': item.iva_porcentaje,
    'Precio con IVA': item.precio_con_iva,
    'Stock Actual': item.stock_actual,
    'Stock Mínimo': item.stock_minimo,
    'Unidad': item.unidad_medida,
    'Estado': item.activo ? 'Activo' : 'Inactivo',
    'Stock Status': getStockStatus(item)
  }));

  // Insertar tabla de datos comenzando en la fila 5 (después del encabezado)
  XLSX.utils.sheet_add_json(ws, datosExcel, { origin: 'A5' });

  // Configurar anchos de columnas
  const columnWidths = [
    { wch: 5 },   // N°
    { wch: 12 },  // Código
    { wch: 30 },  // Nombre
    { wch: 20 },  // Categoría
    { wch: 40 },  // Descripción
    { wch: 12 },  // Precio Base
    { wch: 8 },   // IVA
    { wch: 15 },  // Precio con IVA
    { wch: 12 },  // Stock Actual
    { wch: 12 },  // Stock Mínimo
    { wch: 10 },  // Unidad
    { wch: 10 },  // Estado
    { wch: 15 }   // Stock Status
  ];
  ws['!cols'] = columnWidths;

  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  // Crear hoja de estadísticas
  const estadisticas = calcularEstadisticas(items);
  const wsStats = XLSX.utils.json_to_sheet([estadisticas]);
  wsStats['!cols'] = [
    { wch: 25 },
    { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');

  // Generar archivo y descargarlo
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `${filename}_${fecha}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);

  return nombreArchivo;
};

/**
 * Calcula estadísticas del inventario
 */
const calcularEstadisticas = (items) => {
  const total = items.length;
  const activos = items.filter(i => i.activo).length;
  const inactivos = items.filter(i => !i.activo).length;
  const stockBajo = items.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length;
  const agotados = items.filter(i => i.stock_actual === 0).length;
  const valorTotal = items.reduce((sum, i) => sum + (i.stock_actual * i.precio_con_iva), 0);

  return {
    'Total de Productos': total,
    'Productos Activos': activos,
    'Productos Inactivos': inactivos,
    'Con Stock Bajo': stockBajo,
    'Productos Agotados': agotados,
    'Valor Total del Inventario': `$${valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
  };
};

/**
 * Determina el estado del stock
 */
const getStockStatus = (item) => {
  if (item.stock_actual === 0) return 'Agotado';
  if (item.stock_actual <= item.stock_minimo) return 'Stock Bajo';
  return 'Disponible';
};

/**
 * Exporta movimientos de inventario a Excel
 */
export const exportarMovimientosAExcel = (movimientos, filename = 'Movimientos_Inventario') => {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet vacío
  const ws = {};

  // Agregar información de encabezado (filas 1-4)
  const encabezado = [
    ['HISTORIAL DE MOVIMIENTOS - FACTUFY HOTEL'],
    [`Generado el: ${new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`],
    [`Total de movimientos: ${movimientos.length}`],
    ['']
  ];

  // Insertar encabezado en las primeras 4 filas
  XLSX.utils.sheet_add_aoa(ws, encabezado, { origin: 'A1' });

  // Preparar datos para el Excel
  const datosExcel = movimientos.map((mov, index) => ({
    'N°': index + 1,
    'Fecha': new Date(mov.fecha).toLocaleDateString('es-CO'),
    'Hora': new Date(mov.fecha).toLocaleTimeString('es-CO'),
    'Tipo': mov.tipo_movimiento,
    'Producto': mov.item?.nombre || 'N/A',
    'Cantidad': mov.cantidad,
    'Stock Anterior': mov.stock_anterior,
    'Stock Nuevo': mov.stock_nuevo,
    'Motivo': mov.motivo || '',
    'Usuario': mov.usuario?.nombre || 'Sistema'
  }));

  // Insertar tabla de datos comenzando en la fila 5 (después del encabezado)
  XLSX.utils.sheet_add_json(ws, datosExcel, { origin: 'A5' });

  // Configurar anchos de columnas
  ws['!cols'] = [
    { wch: 5 },   // N°
    { wch: 12 },  // Fecha
    { wch: 10 },  // Hora
    { wch: 15 },  // Tipo
    { wch: 30 },  // Producto
    { wch: 10 },  // Cantidad
    { wch: 12 },  // Stock Anterior
    { wch: 12 },  // Stock Nuevo
    { wch: 40 },  // Motivo
    { wch: 20 }   // Usuario
  ];

  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `${filename}_${fecha}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);

  return nombreArchivo;
};