// ============================================================================
// SERVICIO - COLA DE IMPRESIÓN
// Funciones helper para agregar trabajos a la cola de impresión
// ============================================================================

/**
 * Agregar una factura a la cola de impresión
 * @param {Object} pool - Pool de conexión a la BD
 * @param {number} facturaId - ID de la factura
 * @param {Object} datosJson - Datos completos para formatear la factura
 * @param {number} prioridad - Prioridad (1=alta, 10=baja). Default: 1
 * @param {string} impresoraDestino - Nombre de la impresora (null = predeterminada)
 */
async function agregarFacturaACola(pool, facturaId, datosJson, prioridad = 1, impresoraDestino = null) {
  try {
    const result = await pool.query(
      `INSERT INTO cola_impresion (tipo, documento_id, datos_json, prioridad, impresora_destino)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['factura', facturaId, JSON.stringify(datosJson), prioridad, impresoraDestino]
    );

    console.log(`[COLA IMPRESIÓN] Factura ${facturaId} agregada a cola con ID ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('[COLA IMPRESIÓN] Error agregando factura a cola:', error);
    // No lanzar error para no interrumpir el flujo principal
    return null;
  }
}

/**
 * Agregar un cierre de caja a la cola de impresión
 * @param {Object} pool - Pool de conexión a la BD
 * @param {number} turnoId - ID del turno de caja
 * @param {Object} datosJson - Datos completos para formatear el cierre
 * @param {number} prioridad - Prioridad (1=alta, 10=baja). Default: 2
 * @param {string} impresoraDestino - Nombre de la impresora (null = predeterminada)
 */
async function agregarCierreACola(pool, turnoId, datosJson, prioridad = 2, impresoraDestino = null) {
  try {
    const result = await pool.query(
      `INSERT INTO cola_impresion (tipo, documento_id, datos_json, prioridad, impresora_destino)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['cierre', turnoId, JSON.stringify(datosJson), prioridad, impresoraDestino]
    );

    console.log(`[COLA IMPRESIÓN] Cierre de caja ${turnoId} agregado a cola con ID ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('[COLA IMPRESIÓN] Error agregando cierre a cola:', error);
    return null;
  }
}

/**
 * Construir objeto de datos para impresión de factura
 * Compatible con el formateo del agente de impresión
 */
function construirDatosFactura(factura, detalles, metodosPago, facturaElectronica = null, datosAdicionales = {}) {
  return {
    id: factura.id,
    numero_factura: (factura.prefijo || '') + factura.numero_factura,
    prefijo: factura.prefijo || null,
    fecha: factura.fecha || factura.created_at,
    created_at: factura.created_at || factura.fecha,
    subtotal: parseFloat(factura.subtotal) || 0,
    descuento: parseFloat(factura.descuento) || 0,
    impuesto: parseFloat(factura.iva) || parseFloat(factura.impuesto) || 0,
    iva: parseFloat(factura.iva) || 0,
    propina: parseFloat(factura.propina) || 0,
    total: parseFloat(factura.total),

    // Datos del cliente
    cliente: datosAdicionales.cliente || null,

    // Datos de hospedaje (si aplica)
    hospedaje: datosAdicionales.hospedaje || null,

    // Detalles de la factura
    detalles: detalles.map(d => ({
      descripcion: d.descripcion || d.producto?.nombre || d.nombre || 'Item',
      cantidad: parseInt(d.cantidad) || 1,
      precio_unitario: parseFloat(d.precio_unitario) || parseFloat(d.precio) || 0,
      subtotal: parseFloat(d.subtotal) || parseFloat(d.precio_total) || 0
    })),

    // Métodos de pago
    metodos_pago: metodosPago.map(mp => ({
      nombre: mp.nombre || mp.metodo_pago?.nombre || 'Efectivo',
      monto: parseFloat(mp.monto),
      referencia: mp.referencia || null
    })),

    // Datos de factura electrónica (si existe)
    factura_electronica: facturaElectronica ? {
      numero_dian: facturaElectronica.numero_factura_electronica || facturaElectronica.numero_factus || facturaElectronica.numero_factura_dian,
      cufe: facturaElectronica.cufe,
      pdf_url: facturaElectronica.pdf_url,
      xml_url: facturaElectronica.xml_url || null,
      estado: facturaElectronica.factus_status || 'approved',
      numero_resolucion: facturaElectronica.numero_resolucion || null,
      prefijo: facturaElectronica.prefijo || null,
      fecha_vigencia_desde: facturaElectronica.fecha_vigencia_desde || null,
      fecha_vigencia_hasta: facturaElectronica.fecha_vigencia_hasta || null
    } : null,

    // Datos del negocio para el header del recibo
    configuracion: datosAdicionales.configuracion || null,

    // Configuración de impresión
    ancho_papel: 32
  };
}

/**
 * Construir objeto de datos para impresión de cierre de caja
 * Compatible con el formateo del agente de impresión
 */
function construirDatosCierre(turno, movimientos, arqueo, ventasPorMetodo, usuario = null) {
  // Calcular totales de movimientos
  const totalIngresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + parseFloat(m.monto), 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + parseFloat(m.monto), 0);

  return {
    id: turno.id,
    codigo: turno.codigo,
    usuario: usuario?.nombre || usuario?.username || 'Cajero',
    fecha_apertura: turno.fecha_apertura,
    fecha_cierre: turno.fecha_cierre || new Date().toISOString(),
    monto_inicial: parseFloat(turno.monto_inicial) || 0,

    // Ventas por método de pago
    // IMPORTANTE: SQL devuelve 'metodo' (alias de mp.nombre), NO 'nombre'
    ventas_por_metodo: ventasPorMetodo.map(v => ({
      metodo: v.metodo || v.nombre,  // v.metodo viene del SQL, es el nombre del método
      monto: parseFloat(v.total) || parseFloat(v.monto) || 0
    })),

    // Total ventas
    total_ventas: ventasPorMetodo.reduce((sum, v) => sum + (parseFloat(v.total) || parseFloat(v.monto) || 0), 0),

    // Movimientos de caja
    movimientos: movimientos.map(m => ({
      tipo: m.tipo,
      concepto: m.concepto,
      descripcion: m.descripcion,
      monto: parseFloat(m.monto),
      created_at: m.created_at
    })),

    total_ingresos: totalIngresos,
    total_egresos: totalEgresos,

    // Arqueo de efectivo
    arqueo: arqueo.map(a => ({
      denominacion: a.denominacion,
      cantidad: parseInt(a.cantidad),
      subtotal: parseFloat(a.subtotal) || (parseInt(a.cantidad) * parseFloat(a.valor_unitario))
    })),

    // Montos calculados
    monto_esperado: parseFloat(turno.monto_esperado) || 0,
    monto_real: parseFloat(turno.monto_real) || 0,
    diferencia: parseFloat(turno.diferencia) || 0,

    notas_cierre: turno.notas_cierre || null
  };
}

module.exports = {
  agregarFacturaACola,
  agregarCierreACola,
  construirDatosFactura,
  construirDatosCierre
};
