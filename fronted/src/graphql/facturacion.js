import { gql } from '@apollo/client';

// ============================================================================
// QUERIES - FACTURAS (HISTORIAL)
// ============================================================================

export const GET_FACTURAS = gql`
  query GetFacturas($fechaDesde: Date, $fechaHasta: Date, $busqueda: String, $tipoFactura: String, $limite: Int) {
    facturas(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta, busqueda: $busqueda, tipo_factura: $tipoFactura, limite: $limite) {
      id
      numero
      prefijo
      numero_factura_display
      fecha
      subtotal
      impuestos
      descuento
      total
      cliente_id
      hospedaje_id
      observaciones
      metodos_pago
      created_at
    }
  }
`;

export const GET_FACTURA = gql`
  query GetFactura($id: Int!) {
    factura(id: $id) {
      id
      numero
      prefijo
      numero_factura_display
      fecha
      subtotal
      impuestos
      descuento
      total
      cliente_id
      hospedaje_id
      observaciones
      metodos_pago
      created_at
    }
  }
`;

// ============================================================================
// QUERIES - FACTURACIÓN ELECTRÓNICA
// ============================================================================

/**
 * Obtener configuración de Factus
 */
export const GET_CONFIGURACION_FACTUS = gql`
  query GetConfiguracionFactus {
    configuracionFactus {
      id
      endpoint
      email
      client_id
      ambiente
      email_facturacion
      activo
      iva_hospedaje
      iva_consumos
      iva_servicios
      created_at
      updated_at
    }
  }
`;

/**
 * Listar facturas electrónicas
 */
export const GET_FACTURAS_ELECTRONICAS = gql`
  query GetFacturasElectronicas($limite: Int, $facturaId: Int) {
    facturasElectronicas(limite: $limite, factura_id: $facturaId) {
      id
      factura_id
      factus_id
      cufe
      numero_factura_dian
      prefijo
      url_pdf
      url_xml
      estado_dian
      fecha_envio
      fecha_respuesta_dian
      created_at
      factura {
        numero
        total
        fecha
      }
    }
  }
`;

/**
 * Obtener factura electrónica por ID
 */
export const GET_FACTURA_ELECTRONICA = gql`
  query GetFacturaElectronica($id: Int!) {
    facturaElectronica(id: $id) {
      id
      factura_id
      factus_id
      cufe
      numero_factura_dian
      prefijo
      url_pdf
      url_xml
      estado_dian
      fecha_envio
      fecha_respuesta_dian
      errores_validacion
      datos_cliente_snapshot
      datos_factura_snapshot
      respuesta_factus
      created_at
      factura {
        numero
        total
        fecha
        observaciones
      }
    }
  }
`;

/**
 * Obtener factura electrónica por factura_id
 */
export const GET_FACTURA_ELECTRONICA_POR_FACTURA_ID = gql`
  query GetFacturaElectronicaPorFacturaId($facturaId: Int!) {
    facturaElectronicaPorFacturaId(factura_id: $facturaId) {
      id
      factura_id
      factus_id
      cufe
      numero_factura_dian
      prefijo
      url_pdf
      url_xml
      estado_dian
      fecha_envio
      fecha_respuesta_dian
      created_at
    }
  }
`;

/**
 * Listar notas de crédito
 */
export const GET_NOTAS_CREDITO = gql`
  query GetNotasCredito($facturaElectronicaId: Int) {
    notasCredito(factura_electronica_id: $facturaElectronicaId) {
      id
      factura_electronica_id
      factus_id
      cufe
      numero_nota_credito
      motivo
      url_pdf
      url_xml
      estado_dian
      valor_total
      items
      fecha_envio
      created_at
      factura_electronica {
        numero_factura_dian
        cufe
      }
    }
  }
`;

/**
 * Obtener tipos de documento DIAN
 */
export const GET_TIPOS_DOCUMENTO_DIAN = gql`
  query GetTiposDocumentoDian($activo: Boolean) {
    tiposDocumentoDian(activo: $activo) {
      codigo_dian
      codigo_interno
      descripcion
      requiere_digito_verificacion
      patron_validacion
      longitud_minima
      longitud_maxima
      activo
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Actualizar configuración de Factus
 */
export const ACTUALIZAR_CONFIGURACION_FACTUS = gql`
  mutation ActualizarConfiguracionFactus($input: ConfiguracionFactusInput!) {
    actualizarConfiguracionFactus(input: $input) {
      id
      endpoint
      email
      client_id
      ambiente
      email_facturacion
      activo
      iva_hospedaje
      iva_consumos
      iva_servicios
      updated_at
    }
  }
`;

/**
 * Probar conexión con Factus
 */
export const PROBAR_CONEXION_FACTUS = gql`
  mutation ProbarConexionFactus {
    probarConexionFactus {
      success
      message
      endpoint
      ambiente
      token_obtenido
      expires_in
      error
    }
  }
`;

/**
 * Crear nota de crédito
 */
export const CREAR_NOTA_CREDITO = gql`
  mutation CrearNotaCredito($input: CrearNotaCreditoInput!) {
    crearNotaCredito(input: $input) {
      id
      factura_electronica_id
      factus_id
      cufe
      numero_nota_credito
      motivo
      url_pdf
      url_xml
      estado_dian
      valor_total
      items
      fecha_envio
      created_at
    }
  }
`;
