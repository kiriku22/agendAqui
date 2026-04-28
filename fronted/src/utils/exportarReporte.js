import * as XLSX from 'xlsx';

/**
 * Ajustar anchos de columna automáticamente basado en el contenido
 */
const ajustarAnchoColumnas = (worksheet, datos) => {
  const keys = Object.keys(datos[0] || {});
  const columnWidths = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...datos.map(row => {
        const val = row[key];
        return val ? String(val).length : 0;
      })
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
  });
  worksheet['!cols'] = columnWidths;
};

/**
 * Agregar título al inicio de una hoja
 */
const agregarTitulo = (worksheet, titulo, rango) => {
  XLSX.utils.sheet_add_aoa(worksheet, [[titulo]], { origin: 'A1' });

  // Merge cells para el título
  if (!worksheet['!merges']) worksheet['!merges'] = [];
  worksheet['!merges'].push(XLSX.utils.decode_range(rango));

  return worksheet;
};

/**
 * Exportar reporte de ocupación a Excel con formato mejorado
 */
export const exportarReporteOcupacion = (datosReporte) => {
  const { fecha_desde, fecha_hasta, ocupacion_por_dia, ocupacion_por_tipo } = datosReporte;

  // Formatear nombre de archivo
  const nombreArchivo = `Reporte_Ocupacion_${fecha_desde}_${fecha_hasta}`;

  // Crear libro con múltiples hojas
  const workbook = XLSX.utils.book_new();

  // ========================================================================
  // Hoja 1: Resumen
  // ========================================================================
  const resumen = [
    ['REPORTE DE OCUPACIÓN'],
    [''],
    ['Métrica', 'Valor'],
    ['Período', `${fecha_desde} a ${fecha_hasta}`],
    ['Días analizados', datosReporte.dias],
    ['Ocupación promedio', `${datosReporte.porcentaje_ocupacion_promedio.toFixed(2)}%`],
    ['Noches vendidas', datosReporte.total_noches_vendidas],
    ['Total habitaciones', datosReporte.total_habitaciones_promedio],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  // Merge del título
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 25 }, // Columna Métrica
    { wch: 30 }  // Columna Valor
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // ========================================================================
  // Hoja 2: Ocupación por día
  // ========================================================================
  const datosDia = ocupacion_por_dia.map(dia => ({
    'Fecha': new Date(dia.fecha).toLocaleDateString('es-CO'),
    'Total Hab.': dia.total_habitaciones,
    'Ocupadas': dia.ocupadas,
    'Disponibles': dia.disponibles,
    'Limpieza': dia.limpieza,
    'Mantenimiento': dia.mantenimiento,
    '% Ocupación': parseFloat(dia.porcentaje_ocupacion.toFixed(2))
  }));

  // Crear hoja con título
  const wsDia = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsDia, [['OCUPACIÓN DIARIA']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsDia, datosDia, { origin: 'A3' });

  // Merge del título
  wsDia['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

  // Ajustar anchos
  wsDia['!cols'] = [
    { wch: 15 }, // Fecha
    { wch: 12 }, // Total Hab
    { wch: 12 }, // Ocupadas
    { wch: 12 }, // Disponibles
    { wch: 12 }, // Limpieza
    { wch: 15 }, // Mantenimiento
    { wch: 15 }  // % Ocupación
  ];

  XLSX.utils.book_append_sheet(workbook, wsDia, 'Por Día');

  // ========================================================================
  // Hoja 3: Ocupación por tipo
  // ========================================================================
  const datosTipo = ocupacion_por_tipo.map(tipo => ({
    'Tipo': tipo.tipo,
    'Total': tipo.total,
    'Ocup. Promedio': parseFloat(tipo.ocupadas_promedio.toFixed(1)),
    'Disp. Promedio': parseFloat(tipo.disponibles_promedio.toFixed(1)),
    '% Ocupación': parseFloat(tipo.porcentaje_ocupacion.toFixed(2)),
    'Ingresos': parseFloat(tipo.ingresos_generados.toFixed(0))
  }));

  const wsTipo = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsTipo, [['OCUPACIÓN POR TIPO DE HABITACIÓN']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsTipo, datosTipo, { origin: 'A3' });

  // Merge del título
  wsTipo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Ajustar anchos
  wsTipo['!cols'] = [
    { wch: 15 }, // Tipo
    { wch: 10 }, // Total
    { wch: 16 }, // Ocup. Promedio
    { wch: 16 }, // Disp. Promedio
    { wch: 15 }, // % Ocupación
    { wch: 18 }  // Ingresos
  ];

  XLSX.utils.book_append_sheet(workbook, wsTipo, 'Por Tipo');

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar reporte de ingresos a Excel con formato mejorado
 */
export const exportarReporteIngresos = (datosReporte) => {
  const { fecha_desde, fecha_hasta, ingresos_por_dia, ingresos_por_tipo } = datosReporte;

  const nombreArchivo = `Reporte_Ingresos_${fecha_desde}_${fecha_hasta}`;
  const workbook = XLSX.utils.book_new();

  // ========================================================================
  // Hoja 1: Resumen
  // ========================================================================
  const resumen = [
    ['REPORTE DE INGRESOS'],
    [''],
    ['Métrica', 'Valor'],
    ['Período', `${fecha_desde} a ${fecha_hasta}`],
    ['Total Ingresos', parseFloat(datosReporte.total_ingresos.toFixed(0))],
    ['Ingresos Hospedajes', parseFloat(datosReporte.ingresos_hospedajes.toFixed(0))],
    ['Ingresos Consumos', parseFloat(datosReporte.ingresos_consumos.toFixed(0))],
    ['% Hospedajes', parseFloat(datosReporte.porcentaje_hospedajes.toFixed(2))],
    ['% Consumos', parseFloat(datosReporte.porcentaje_consumos.toFixed(2))],
    ['Promedio Diario', parseFloat(datosReporte.promedio_diario.toFixed(0))],
    ['Número de Facturas', datosReporte.num_facturas],
    ['Ticket Promedio', parseFloat(datosReporte.ticket_promedio.toFixed(0))],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  // Merge del título
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 25 }, // Columna Métrica
    { wch: 30 }  // Columna Valor
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // ========================================================================
  // Hoja 2: Ingresos por día
  // ========================================================================
  const datosDia = ingresos_por_dia.map(dia => ({
    'Fecha': new Date(dia.fecha).toLocaleDateString('es-CO'),
    'Hospedajes': parseFloat(dia.ingresos_hospedajes.toFixed(0)),
    'Consumos': parseFloat(dia.ingresos_consumos.toFixed(0)),
    'Total': parseFloat(dia.total.toFixed(0)),
    'Check-outs': dia.num_checkouts
  }));

  const wsDia = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsDia, [['INGRESOS DIARIOS']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsDia, datosDia, { origin: 'A3' });

  // Merge del título
  wsDia['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  // Ajustar anchos
  wsDia['!cols'] = [
    { wch: 15 }, // Fecha
    { wch: 18 }, // Hospedajes
    { wch: 18 }, // Consumos
    { wch: 18 }, // Total
    { wch: 12 }  // Check-outs
  ];

  XLSX.utils.book_append_sheet(workbook, wsDia, 'Por Día');

  // ========================================================================
  // Hoja 3: Ingresos por tipo
  // ========================================================================
  const datosTipo = ingresos_por_tipo.map(tipo => ({
    'Tipo': tipo.tipo,
    'Hospedajes': parseFloat(tipo.ingresos_hospedajes.toFixed(0)),
    'Consumos': parseFloat(tipo.ingresos_consumos.toFixed(0)),
    'Total': parseFloat(tipo.total.toFixed(0)),
    'Hospedajes #': tipo.num_hospedajes,
    'Precio/Noche': parseFloat(tipo.precio_promedio_noche.toFixed(0))
  }));

  const wsTipo = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsTipo, [['INGRESOS POR TIPO DE HABITACIÓN']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsTipo, datosTipo, { origin: 'A3' });

  // Merge del título
  wsTipo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Ajustar anchos
  wsTipo['!cols'] = [
    { wch: 15 }, // Tipo
    { wch: 18 }, // Hospedajes
    { wch: 18 }, // Consumos
    { wch: 18 }, // Total
    { wch: 15 }, // Hospedajes #
    { wch: 18 }  // Precio/Noche
  ];

  XLSX.utils.book_append_sheet(workbook, wsTipo, 'Por Tipo');

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar datos a Excel con formato básico
 */
export const exportarAExcel = (datos, nombreArchivo, nombreHoja = 'Reporte') => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(datos);

  // Ajustar anchos de columna
  ajustarAnchoColumnas(worksheet, datos);

  XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar con estilos avanzados y columnas ajustadas
 */
export const exportarConEstilos = (datos, nombreArchivo) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(datos);

  // Ajustar ancho de columnas automáticamente
  ajustarAnchoColumnas(worksheet, datos);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar reporte de huéspedes a Excel con formato mejorado
 */
export const exportarReporteHuespedes = (datosReporte) => {
  const { fecha_desde, fecha_hasta, huespedes_frecuentes } = datosReporte;

  const nombreArchivo = `Reporte_Huespedes_${fecha_desde}_${fecha_hasta}`;
  const workbook = XLSX.utils.book_new();

  // ========================================================================
  // Hoja 1: Resumen
  // ========================================================================
  const resumen = [
    ['REPORTE DE HUÉSPEDES'],
    [''],
    ['Métrica', 'Valor'],
    ['Período', `${fecha_desde} a ${fecha_hasta}`],
    ['Total Huéspedes', datosReporte.total_huespedes],
    ['Huéspedes Nuevos', datosReporte.huespedes_nuevos],
    ['Huéspedes Recurrentes', datosReporte.huespedes_recurrentes],
    ['% Nuevos', parseFloat(datosReporte.porcentaje_nuevos.toFixed(2))],
    ['% Recurrentes', parseFloat(datosReporte.porcentaje_recurrentes.toFixed(2))],
    ['Promedio Estancia (días)', parseFloat(datosReporte.promedio_estancia_dias.toFixed(1))],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  // Merge del título
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 30 }, // Columna Métrica
    { wch: 30 }  // Columna Valor
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // ========================================================================
  // Hoja 2: Huéspedes Frecuentes (TOP 10)
  // ========================================================================
  const datosFrecuentes = huespedes_frecuentes.map(huesped => ({
    'ID': huesped.huesped_id,
    'Nombre Completo': huesped.nombre_completo,
    'Email': huesped.email || 'N/A',
    'Teléfono': huesped.telefono || 'N/A',
    '# Hospedajes': huesped.num_hospedajes,
    'Total Gastado': parseFloat(huesped.total_gastado.toFixed(0)),
    'Última Visita': new Date(huesped.ultima_visita).toLocaleDateString('es-CO')
  }));

  const wsFrecuentes = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsFrecuentes, [['TOP 10 HUÉSPEDES FRECUENTES']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsFrecuentes, datosFrecuentes, { origin: 'A3' });

  // Merge del título
  wsFrecuentes['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

  // Ajustar anchos
  wsFrecuentes['!cols'] = [
    { wch: 8 },  // ID
    { wch: 25 }, // Nombre
    { wch: 25 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 15 }, // # Hospedajes
    { wch: 18 }, // Total Gastado
    { wch: 15 }  // Última Visita
  ];

  XLSX.utils.book_append_sheet(workbook, wsFrecuentes, 'TOP 10 Frecuentes');

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar reporte de reservas a Excel con formato mejorado
 */
export const exportarReporteReservas = (datosReporte) => {
  const { fecha_desde, fecha_hasta, reservas_por_canal, reservas_por_estado } = datosReporte;

  const nombreArchivo = `Reporte_Reservas_${fecha_desde}_${fecha_hasta}`;
  const workbook = XLSX.utils.book_new();

  // ========================================================================
  // Hoja 1: Resumen
  // ========================================================================
  const resumen = [
    ['REPORTE DE RESERVAS'],
    [''],
    ['Métrica', 'Valor'],
    ['Período', `${fecha_desde} a ${fecha_hasta}`],
    ['Total Reservas', datosReporte.total_reservas],
    ['Confirmadas', datosReporte.confirmadas],
    ['Canceladas', datosReporte.canceladas],
    ['No Show', datosReporte.no_show],
    ['Tasa Cancelación', parseFloat(datosReporte.tasa_cancelacion.toFixed(2))],
    ['Tasa No Show', parseFloat(datosReporte.tasa_no_show.toFixed(2))],
    ['Anticipo Total', parseFloat(datosReporte.anticipo_total.toFixed(0))],
    ['Saldo Pendiente', parseFloat(datosReporte.saldo_pendiente_total.toFixed(0))],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  // Merge del título
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 25 }, // Columna Métrica
    { wch: 30 }  // Columna Valor
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // ========================================================================
  // Hoja 2: Por Canal
  // ========================================================================
  const datosCanal = reservas_por_canal.map(canal => ({
    'Canal': canal.canal,
    'Total': canal.total,
    'Confirmadas': canal.confirmadas,
    'Canceladas': canal.canceladas,
    'Tasa Cancel.': parseFloat(canal.tasa_cancelacion.toFixed(2)),
    'Ingresos': parseFloat(canal.ingresos_totales.toFixed(0))
  }));

  const wsCanal = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsCanal, [['RESERVAS POR CANAL']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsCanal, datosCanal, { origin: 'A3' });

  // Merge del título
  wsCanal['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Ajustar anchos
  wsCanal['!cols'] = [
    { wch: 15 }, // Canal
    { wch: 10 }, // Total
    { wch: 15 }, // Confirmadas
    { wch: 15 }, // Canceladas
    { wch: 15 }, // Tasa Cancel
    { wch: 18 }  // Ingresos
  ];

  XLSX.utils.book_append_sheet(workbook, wsCanal, 'Por Canal');

  // ========================================================================
  // Hoja 3: Por Estado
  // ========================================================================
  const datosEstado = reservas_por_estado.map(estado => ({
    'Estado': estado.estado,
    'Cantidad': estado.cantidad,
    'Porcentaje': parseFloat(estado.porcentaje.toFixed(2))
  }));

  const wsEstado = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsEstado, [['RESERVAS POR ESTADO']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsEstado, datosEstado, { origin: 'A3' });

  // Merge del título
  wsEstado['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // Ajustar anchos
  wsEstado['!cols'] = [
    { wch: 20 }, // Estado
    { wch: 15 }, // Cantidad
    { wch: 15 }  // Porcentaje
  ];

  XLSX.utils.book_append_sheet(workbook, wsEstado, 'Por Estado');

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};

/**
 * Exportar reporte de inventario a Excel con formato mejorado
 */
export const exportarReporteInventario = (datosReporte) => {
  const { fecha_desde, fecha_hasta, items_bajo_stock, movimientos_resumen, productos_mas_consumidos } = datosReporte;

  const nombreArchivo = `Reporte_Inventario_${fecha_desde}_${fecha_hasta}`;
  const workbook = XLSX.utils.book_new();

  // ========================================================================
  // Hoja 1: Resumen
  // ========================================================================
  const resumen = [
    ['REPORTE DE INVENTARIO'],
    [''],
    ['Métrica', 'Valor'],
    ['Período', `${fecha_desde} a ${fecha_hasta}`],
    ['Total Items Activos', datosReporte.total_items_activos],
    ['Items Bajo Stock', datosReporte.total_items_bajo_stock],
    ['Valor Inventario', parseFloat(datosReporte.valor_inventario_actual.toFixed(0))],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

  // Merge del título
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 25 }, // Columna Métrica
    { wch: 30 }  // Columna Valor
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // ========================================================================
  // Hoja 2: Items Bajo Stock
  // ========================================================================
  const datosBajoStock = items_bajo_stock.map(item => ({
    'ID': item.id,
    'Código': item.codigo || 'N/A',
    'Nombre': item.nombre,
    'Tipo': item.tipo,
    'Stock Actual': item.stock_actual,
    'Stock Mínimo': item.stock_minimo,
    'Diferencia': item.diferencia,
    'Categoría': item.categoria_nombre || 'N/A'
  }));

  const wsBajoStock = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsBajoStock, [['ITEMS BAJO STOCK']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsBajoStock, datosBajoStock, { origin: 'A3' });

  // Merge del título
  wsBajoStock['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  // Ajustar anchos
  wsBajoStock['!cols'] = [
    { wch: 8 },  // ID
    { wch: 12 }, // Código
    { wch: 25 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 15 }, // Stock Actual
    { wch: 15 }, // Stock Mínimo
    { wch: 12 }, // Diferencia
    { wch: 20 }  // Categoría
  ];

  XLSX.utils.book_append_sheet(workbook, wsBajoStock, 'Bajo Stock');

  // ========================================================================
  // Hoja 3: Movimientos Resumen
  // ========================================================================
  const datosMovimientos = movimientos_resumen.map(mov => ({
    'Tipo Movimiento': mov.tipo_movimiento,
    'Cantidad Total': parseFloat(mov.cantidad_total.toFixed(0)),
    '# Movimientos': mov.num_movimientos
  }));

  const wsMovimientos = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsMovimientos, [['RESUMEN DE MOVIMIENTOS']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsMovimientos, datosMovimientos, { origin: 'A3' });

  // Merge del título
  wsMovimientos['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // Ajustar anchos
  wsMovimientos['!cols'] = [
    { wch: 20 }, // Tipo Movimiento
    { wch: 18 }, // Cantidad Total
    { wch: 18 }  // # Movimientos
  ];

  XLSX.utils.book_append_sheet(workbook, wsMovimientos, 'Movimientos');

  // ========================================================================
  // Hoja 4: Productos Más Consumidos
  // ========================================================================
  const datosConsumidos = productos_mas_consumidos.map(prod => ({
    'ID': prod.item_id,
    'Código': prod.codigo || 'N/A',
    'Nombre': prod.nombre,
    'Tipo': prod.tipo,
    'Cant. Consumida': parseFloat(prod.cantidad_consumida.toFixed(0)),
    'Veces Consumido': prod.veces_consumido,
    'Categoría': prod.categoria_nombre || 'N/A'
  }));

  const wsConsumidos = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsConsumidos, [['TOP 10 PRODUCTOS MÁS CONSUMIDOS']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(wsConsumidos, datosConsumidos, { origin: 'A3' });

  // Merge del título
  wsConsumidos['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

  // Ajustar anchos
  wsConsumidos['!cols'] = [
    { wch: 8 },  // ID
    { wch: 12 }, // Código
    { wch: 25 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 18 }, // Cant. Consumida
    { wch: 18 }, // Veces Consumido
    { wch: 20 }  // Categoría
  ];

  XLSX.utils.book_append_sheet(workbook, wsConsumidos, 'Más Consumidos');

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
};
