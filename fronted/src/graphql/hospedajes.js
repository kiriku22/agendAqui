import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const HOSPEDAJE_FRAGMENT = gql`
  fragment HospedajeFields on Hospedaje {
    id
    codigo
    reserva_id
    habitacion_id
    huesped_id
    acompanantes
    fecha_entrada
    fecha_salida_prevista
    fecha_salida_real
    noches_previstas
    noches_reales
    precio_noche
    precio_total_hospedaje
    estado
    observaciones
    notas_especiales
    forma_pago_anticipo
    monto_anticipo
    created_by
    checked_out_at
    checked_out_by
    tra_estado
    costo_alojamiento_tra
    created_at
    updated_at
  }
`;

export const CUENTA_HOSPEDAJE_FRAGMENT = gql`
  fragment CuentaHospedajeFields on CuentaHospedaje {
    hospedaje_id
    codigo
    noches
    precio_noche
    subtotal_hospedaje
    consumos
    subtotal_consumos
    total
    pagado
    saldo
  }
`;

export const FACTURA_FRAGMENT = gql`
  fragment FacturaFields on Factura {
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
    usuario_id
    metodos_pago
    created_at
    tiene_factura_electronica
    factura_electronica {
      id
      cufe
      numero_factura_dian
      numero_factus
      url_pdf
      url_xml
      estado_dian
      fecha_envio
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_HOSPEDAJES = gql`
  ${HOSPEDAJE_FRAGMENT}
  query GetHospedajes($estado: EstadoHospedaje) {
    hospedajes(estado: $estado) {
      ...HospedajeFields
      habitacion {
        id
        numero
        tipo
        estado
      }
      huesped {
        id
        nombre_completo
        tipo_documento
        numero_documento
        telefono
        email
      }
      reserva {
        id
        codigo
      }
    }
  }
`;

export const GET_HOSPEDAJE = gql`
  ${HOSPEDAJE_FRAGMENT}
  query GetHospedaje($id: Int!) {
    hospedaje(id: $id) {
      ...HospedajeFields
      habitacion {
        id
        numero
        tipo
        estado
      }
      huesped {
        id
        nombre_completo
        tipo_documento
        numero_documento
        telefono
        email
      }
      reserva {
        id
        codigo
      }
    }
  }
`;

export const GET_HOSPEDAJE_POR_CODIGO = gql`
  ${HOSPEDAJE_FRAGMENT}
  query GetHospedajePorCodigo($codigo: String!) {
    hospedajePorCodigo(codigo: $codigo) {
      ...HospedajeFields
    }
  }
`;

export const GET_HOSPEDAJES_ACTIVOS = gql`
  ${HOSPEDAJE_FRAGMENT}
  query GetHospedajesActivos {
    hospedajesActivos {
      ...HospedajeFields
      huesped {
        id
        nombre_completo
        tipo_documento
        numero_documento
      }
      habitacion {
        id
        numero
        tipo
      }
    }
  }
`;

export const GET_CUENTA_HOSPEDAJE = gql`
  ${CUENTA_HOSPEDAJE_FRAGMENT}
  query GetCuentaHospedaje($hospedajeId: Int!, $fechaSalida: DateTime) {
    cuentaHospedaje(hospedaje_id: $hospedajeId, fecha_salida: $fechaSalida) {
      ...CuentaHospedajeFields
    }
  }
`;

export const VERIFY_HOSPEDAJE_ESTADO = gql`
  query VerifyHospedajeEstado($id: Int!) {
    hospedaje(id: $id) {
      id
      codigo
      estado
      checked_out_at
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CHECK_IN = gql`
  ${HOSPEDAJE_FRAGMENT}
  mutation CheckIn($input: CheckInInput!) {
    checkIn(input: $input) {
      ...HospedajeFields
    }
  }
`;

export const CHECK_OUT = gql`
  ${FACTURA_FRAGMENT}
  mutation CheckOut($input: CheckOutInput!) {
    checkOut(input: $input) {
      ...FacturaFields
    }
  }
`;

export const CANCELAR_HOSPEDAJE = gql`
  ${HOSPEDAJE_FRAGMENT}
  mutation CancelarHospedaje($id: Int!, $motivo: String!) {
    cancelarHospedaje(id: $id, motivo: $motivo) {
      ...HospedajeFields
    }
  }
`;

export const CAMBIAR_HABITACION_HOSPEDAJE = gql`
  ${HOSPEDAJE_FRAGMENT}
  mutation CambiarHabitacionHospedaje($id: Int!, $nueva_habitacion_id: Int!) {
    cambiarHabitacionHospedaje(id: $id, nueva_habitacion_id: $nueva_habitacion_id) {
      ...HospedajeFields
    }
  }
`;
