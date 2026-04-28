import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const REPORTE_OCUPACION_FRAGMENT = gql`
  fragment ReporteOcupacionFields on ReporteOcupacion {
    fecha_desde
    fecha_hasta
    dias
    porcentaje_ocupacion_promedio
    total_noches_vendidas
    total_habitaciones_promedio
    ocupacion_por_dia {
      fecha
      total_habitaciones
      ocupadas
      disponibles
      limpieza
      mantenimiento
      porcentaje_ocupacion
    }
    ocupacion_por_tipo {
      tipo
      total
      ocupadas_promedio
      disponibles_promedio
      porcentaje_ocupacion
      ingresos_generados
    }
  }
`;

export const REPORTE_INGRESOS_FRAGMENT = gql`
  fragment ReporteIngresosFields on ReporteIngresos {
    fecha_desde
    fecha_hasta
    total_ingresos
    ingresos_hospedajes
    ingresos_consumos
    porcentaje_hospedajes
    porcentaje_consumos
    promedio_diario
    num_facturas
    ticket_promedio
    ingresos_por_dia {
      fecha
      ingresos_hospedajes
      ingresos_consumos
      total
      num_checkouts
    }
    ingresos_por_tipo {
      tipo
      ingresos_hospedajes
      ingresos_consumos
      total
      num_hospedajes
      precio_promedio_noche
    }
  }
`;

export const REPORTE_HUESPEDES_FRAGMENT = gql`
  fragment ReporteHuespedesFields on ReporteHuespedes {
    fecha_desde
    fecha_hasta
    total_huespedes
    huespedes_nuevos
    huespedes_recurrentes
    promedio_estancia_dias
    porcentaje_nuevos
    porcentaje_recurrentes
    huespedes_frecuentes {
      huesped_id
      nombre_completo
      email
      telefono
      num_hospedajes
      total_gastado
      ultima_visita
    }
  }
`;

export const REPORTE_RESERVAS_FRAGMENT = gql`
  fragment ReporteReservasFields on ReporteReservas {
    fecha_desde
    fecha_hasta
    total_reservas
    confirmadas
    canceladas
    no_show
    tasa_cancelacion
    tasa_no_show
    anticipo_total
    saldo_pendiente_total
    reservas_por_canal {
      canal
      total
      confirmadas
      canceladas
      tasa_cancelacion
      ingresos_totales
    }
    reservas_por_estado {
      estado
      cantidad
      porcentaje
    }
  }
`;

export const REPORTE_INVENTARIO_FRAGMENT = gql`
  fragment ReporteInventarioFields on ReporteInventario {
    fecha_desde
    fecha_hasta
    total_items_activos
    total_items_bajo_stock
    valor_inventario_actual
    items_bajo_stock {
      id
      codigo
      nombre
      tipo
      stock_actual
      stock_minimo
      diferencia
      categoria_nombre
    }
    movimientos_resumen {
      tipo_movimiento
      cantidad_total
      num_movimientos
    }
    productos_mas_consumidos {
      item_id
      codigo
      nombre
      tipo
      cantidad_consumida
      veces_consumido
      categoria_nombre
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_REPORTE_OCUPACION = gql`
  ${REPORTE_OCUPACION_FRAGMENT}
  query GetReporteOcupacion($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteOcupacion(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteOcupacionFields
    }
  }
`;

export const GET_REPORTE_INGRESOS = gql`
  ${REPORTE_INGRESOS_FRAGMENT}
  query GetReporteIngresos($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteIngresos(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteIngresosFields
    }
  }
`;

export const GET_REPORTE_HUESPEDES = gql`
  ${REPORTE_HUESPEDES_FRAGMENT}
  query GetReporteHuespedes($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteHuespedes(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteHuespedesFields
    }
  }
`;

export const GET_REPORTE_RESERVAS = gql`
  ${REPORTE_RESERVAS_FRAGMENT}
  query GetReporteReservas($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteReservas(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteReservasFields
    }
  }
`;

export const GET_REPORTE_INVENTARIO = gql`
  ${REPORTE_INVENTARIO_FRAGMENT}
  query GetReporteInventario($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteInventario(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteInventarioFields
    }
  }
`;

export const REPORTE_METODOS_PAGO_FRAGMENT = gql`
  fragment ReporteMetodosPagoFields on ReporteMetodosPago {
    fecha_desde
    fecha_hasta
    resumen {
      total_recaudado
      total_transacciones
      ticket_promedio_global
      metodo_mas_usado
      metodo_mayor_recaudo
    }
    detalle_por_metodo {
      metodo_pago_id
      metodo_nombre
      codigo_dian
      total
      num_transacciones
      ticket_promedio
      porcentaje
    }
    tendencia_diaria {
      fecha
      metodo_nombre
      total
    }
  }
`;

export const GET_REPORTE_METODOS_PAGO = gql`
  ${REPORTE_METODOS_PAGO_FRAGMENT}
  query GetReporteMetodosPago($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteMetodosPago(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteMetodosPagoFields
    }
  }
`;

export const REPORTE_CIERRE_CAJA_FRAGMENT = gql`
  fragment ReporteCierreCajaFields on ReporteCierreCaja {
    fecha
    resumen {
      total_ingresos
      ingresos_hospedaje
      ingresos_consumos
      total_pagos_recibidos
      saldo_pendiente
      num_checkouts
      num_facturas
    }
    pagos_por_metodo {
      metodo_pago_id
      metodo_nombre
      total
      num_transacciones
    }
    facturas_del_dia {
      factura_id
      numero_factura
      cliente_nombre
      hora
      total
      metodos_pago
      estado
    }
  }
`;

export const GET_REPORTE_CIERRE_CAJA = gql`
  ${REPORTE_CIERRE_CAJA_FRAGMENT}
  query GetReporteCierreCaja($fecha: Date!) {
    reporteCierreCaja(fecha: $fecha) {
      ...ReporteCierreCajaFields
    }
  }
`;

export const REPORTE_ADR_REVPAR_FRAGMENT = gql`
  fragment ReporteADRRevPARFields on ReporteADRRevPAR {
    fecha_desde
    fecha_hasta
    resumen {
      adr_global
      rev_par_global
      occupancy_rate_global
      total_habitaciones_promedio
      total_noches_vendidas
      ingresos_totales_hospedaje
      num_checkouts
    }
    tendencia_diaria {
      fecha
      adr
      rev_par
      occupancy_rate
      habitaciones_ocupadas
      noches_vendidas
      ingresos
    }
    promedios_por_tipo {
      tipo
      adr
      rev_par
      occupancy_rate
      total_habitaciones
      habitaciones_vendidas
      ingresos_totales
    }
  }
`;

export const GET_REPORTE_ADR_REVPAR = gql`
  ${REPORTE_ADR_REVPAR_FRAGMENT}
  query GetReporteADRRevPAR($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteADRRevPAR(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteADRRevPARFields
    }
  }
`;

export const REPORTE_COMPARATIVO_FRAGMENT = gql`
  fragment ReporteComparativoFields on ReporteComparativo {
    periodo_actual {
      fecha_desde
      fecha_hasta
      dias
      etiqueta
    }
    periodo_anterior {
      fecha_desde
      fecha_hasta
      dias
      etiqueta
    }
    metricas_actual {
      ingresos_totales
      ingresos_hospedaje
      ingresos_consumos
      ocupacion_promedio
      adr
      rev_par
      num_checkouts
      num_reservas
      noches_vendidas
      ticket_promedio
    }
    metricas_anterior {
      ingresos_totales
      ingresos_hospedaje
      ingresos_consumos
      ocupacion_promedio
      adr
      rev_par
      num_checkouts
      num_reservas
      noches_vendidas
      ticket_promedio
    }
    comparaciones {
      metrica
      periodo_actual
      periodo_anterior
      variacion_absoluta
      variacion_porcentual
      tendencia
    }
  }
`;

export const GET_REPORTE_COMPARATIVO = gql`
  ${REPORTE_COMPARATIVO_FRAGMENT}
  query GetReporteComparativo(
    $fechaDesdeActual: Date!
    $fechaHastaActual: Date!
    $fechaDesdeAnterior: Date!
    $fechaHastaAnterior: Date!
  ) {
    reporteComparativo(
      fecha_desde_actual: $fechaDesdeActual
      fecha_hasta_actual: $fechaHastaActual
      fecha_desde_anterior: $fechaDesdeAnterior
      fecha_hasta_anterior: $fechaHastaAnterior
    ) {
      ...ReporteComparativoFields
    }
  }
`;

// ============================================================================
// REPORTE FUENTES DE RESERVA (CANALES)
// ============================================================================

export const REPORTE_FUENTES_RESERVA_FRAGMENT = gql`
  fragment ReporteFuentesReservaFields on ReporteFuentesReserva {
    fecha_desde
    fecha_hasta
    resumen {
      total_reservas
      total_confirmadas
      total_canceladas
      total_noshow
      ingresos_totales
      canal_principal
      pct_directo
      pct_otas
      comisiones_estimadas
    }
    canales {
      canal
      canal_nombre
      color
      total_reservas
      confirmadas
      canceladas
      no_show
      tasa_confirmacion
      tasa_cancelacion
      ingresos_totales
      ingresos_promedio
      comision_pct
      comision_estimada
      noches_totales
    }
    tendencia_diaria {
      fecha
      directo
      booking
      airbnb
      expedia
      telefono
      web
      walk_in
      otros
    }
  }
`;

export const GET_REPORTE_FUENTES_RESERVA = gql`
  ${REPORTE_FUENTES_RESERVA_FRAGMENT}
  query GetReporteFuentesReserva($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteFuentesReserva(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteFuentesReservaFields
    }
  }
`;

// ============================================================================
// REPORTE ANÁLISIS DE CANCELACIONES
// ============================================================================

export const REPORTE_CANCELACIONES_FRAGMENT = gql`
  fragment ReporteCancelacionesFields on ReporteCancelaciones {
    fecha_desde
    fecha_hasta
    resumen {
      total_reservas
      total_canceladas
      total_noshow
      total_completadas
      tasa_cancelacion
      tasa_noshow
      tasa_completitud
      ingresos_perdidos
      anticipos_perdidos
      lead_time_promedio
    }
    por_canal {
      canal
      canal_nombre
      total_reservas
      canceladas
      noshow
      tasa_cancelacion
      tasa_noshow
      ingresos_perdidos
    }
    por_dia_semana {
      dia_semana
      dia_nombre
      total_reservas
      canceladas
      tasa_cancelacion
    }
    por_anticipacion {
      rango
      total_reservas
      canceladas
      tasa_cancelacion
      descripcion
    }
    tendencia {
      fecha
      total_reservas
      canceladas
      noshow
      tasa_cancelacion
    }
  }
`;

export const GET_REPORTE_CANCELACIONES = gql`
  ${REPORTE_CANCELACIONES_FRAGMENT}
  query GetReporteCancelaciones($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteCancelaciones(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteCancelacionesFields
    }
  }
`;

// ============================================================================
// REPORTES FISCALES DIAN
// ============================================================================

const REPORTE_LIBRO_VENTAS_FRAGMENT = gql`
  fragment ReporteLibroVentasFields on ReporteLibroVentas {
    fecha_desde
    fecha_hasta
    resumen {
      total_facturas
      total_facturas_aceptadas
      total_facturas_rechazadas
      total_facturas_pendientes
      total_facturas_no_transmitidas
      base_gravable_total
      iva_total
      gran_total
    }
    facturas {
      factura_electronica_id
      numero_factura_dian
      numero_factura_interna
      fecha_factura
      cufe
      tipo_documento
      cliente_nombre
      cliente_tipo_documento
      cliente_numero_documento
      base_gravable
      iva
      total
      estado_dian
      fecha_envio
    }
    por_estado {
      estado_dian
      cantidad
      base_gravable
      iva
      total
    }
  }
`;

export const GET_REPORTE_LIBRO_VENTAS = gql`
  ${REPORTE_LIBRO_VENTAS_FRAGMENT}
  query GetReporteLibroVentas($fechaDesde: Date!, $fechaHasta: Date!) {
    reporteLibroVentas(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta) {
      ...ReporteLibroVentasFields
    }
  }
`;

// ============================================================================
// REPORTE DE IVA
// ============================================================================

export const GET_REPORTE_IVA = gql`
  query GetReporteIVA($fechaDesde: String!, $fechaHasta: String!) {
    reporteIVA(fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) {
      resumen {
        total_facturas
        base_gravable_total
        base_exenta_total
        iva_hospedaje
        iva_consumos
        iva_servicios
        iva_total
        gran_total
      }
      detalles {
        factura_id
        numero_factura
        fecha
        cliente_nombre
        cliente_documento
        base_gravable
        tarifa_iva
        iva_generado
        total
        categoria
      }
      por_tarifa {
        tarifa
        base_gravable
        iva_generado
        cantidad
      }
      por_categoria {
        categoria
        base_gravable
        iva
        cantidad
      }
    }
  }
`;

// ============================================================================
// REPORTE DE ICA
// ============================================================================

export const GET_REPORTE_ICA = gql`
  query GetReporteICA($fechaDesde: String!, $fechaHasta: String!) {
    reporteICA(fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) {
      resumen {
        ingresos_brutos_total
        tarifa_ica
        ica_total
        total_facturas
        aplica_ica
      }
      detalles {
        factura_id
        numero_factura
        fecha
        cliente_nombre
        ingresos
        ica_calculado
      }
      por_mes {
        mes
        ingresos
        ica
        cantidad
      }
    }
  }
`;
