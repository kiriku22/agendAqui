import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const RESERVA_FRAGMENT = gql`
  fragment ReservaFields on Reserva {
    id
    codigo
    habitacion_id
    huesped_id
    fecha_entrada
    fecha_salida
    noches
    precio_noche
    precio_total
    anticipo
    saldo_pendiente
    estado
    canal_reserva
    observaciones
    notas_especiales
    created_by
    confirmed_at
    cancelled_at
    motivo_cancelacion
    created_at
    updated_at
    habitacion {
      id
      numero
      tipo
      piso
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
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_RESERVAS = gql`
  ${RESERVA_FRAGMENT}
  query GetReservas(
    $estado: EstadoReserva
    $fechaDesde: Date
    $fechaHasta: Date
  ) {
    reservas(
      estado: $estado
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
    ) {
      ...ReservaFields
    }
  }
`;

export const GET_RESERVA = gql`
  ${RESERVA_FRAGMENT}
  query GetReserva($id: Int!) {
    reserva(id: $id) {
      ...ReservaFields
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
    }
  }
`;

export const GET_RESERVA_POR_CODIGO = gql`
  ${RESERVA_FRAGMENT}
  query GetReservaPorCodigo($codigo: String!) {
    reservaPorCodigo(codigo: $codigo) {
      ...ReservaFields
    }
  }
`;

export const GET_RESERVAS_DEL_DIA = gql`
  ${RESERVA_FRAGMENT}
  query GetReservasDelDia {
    reservasDelDia {
      ...ReservaFields
    }
  }
`;

export const GET_RESERVAS_PROXIMAS = gql`
  ${RESERVA_FRAGMENT}
  query GetReservasProximas($dias: Int) {
    reservasProximas(dias: $dias) {
      ...ReservaFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREAR_RESERVA = gql`
  ${RESERVA_FRAGMENT}
  mutation CrearReserva($input: CrearReservaInput!) {
    crearReserva(input: $input) {
      ...ReservaFields
    }
  }
`;

export const ACTUALIZAR_RESERVA = gql`
  ${RESERVA_FRAGMENT}
  mutation ActualizarReserva($id: Int!, $input: ActualizarReservaInput!) {
    actualizarReserva(id: $id, input: $input) {
      ...ReservaFields
    }
  }
`;

export const CONFIRMAR_RESERVA = gql`
  ${RESERVA_FRAGMENT}
  mutation ConfirmarReserva($id: Int!) {
    confirmarReserva(id: $id) {
      ...ReservaFields
    }
  }
`;

export const CANCELAR_RESERVA = gql`
  ${RESERVA_FRAGMENT}
  mutation CancelarReserva($id: Int!, $motivo: String) {
    cancelarReserva(id: $id, motivo: $motivo) {
      ...ReservaFields
    }
  }
`;

export const GET_ALERTAS_RESERVAS = gql`
  query AlertasReservas {
    alertasReservas {
      llegadasHoy
      enCurso
      salidasHoy
      lateCheckouts
      pendientesSinConfirmar
    }
  }
`;
