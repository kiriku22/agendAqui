import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const HABITACION_FRAGMENT = gql`
  fragment HabitacionFields on Habitacion {
    id
    numero
    piso
    tipo
    capacidad
    precio_noche
    descripcion
    comodidades
    estado
    activa
    imagen_url
    ultima_limpieza
    ultima_mantenimiento
    notas_mantenimiento
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_HABITACIONES = gql`
  ${HABITACION_FRAGMENT}
  query GetHabitaciones($estado: EstadoHabitacion, $piso: Int) {
    habitaciones(estado: $estado, piso: $piso) {
      ...HabitacionFields
    }
  }
`;

export const GET_HABITACION = gql`
  ${HABITACION_FRAGMENT}
  query GetHabitacion($id: Int!) {
    habitacion(id: $id) {
      ...HabitacionFields
    }
  }
`;

export const GET_HABITACION_POR_NUMERO = gql`
  ${HABITACION_FRAGMENT}
  query GetHabitacionPorNumero($numero: String!) {
    habitacionPorNumero(numero: $numero) {
      ...HabitacionFields
    }
  }
`;

export const GET_HABITACIONES_DISPONIBLES = gql`
  ${HABITACION_FRAGMENT}
  query GetHabitacionesDisponibles(
    $fechaEntrada: Date!
    $fechaSalida: Date!
    $tipo: TipoHabitacion
  ) {
    habitacionesDisponibles(
      fecha_entrada: $fechaEntrada
      fecha_salida: $fechaSalida
      tipo: $tipo
    ) {
      ...HabitacionFields
    }
  }
`;

export const GET_ESTADISTICAS_HABITACIONES = gql`
  query GetEstadisticasHabitaciones {
    estadisticasHabitaciones {
      total
      disponibles
      ocupadas
      limpieza
      mantenimiento
      reservadas
      porcentaje_ocupacion
    }
  }
`;

export const GET_OCUPACION_POR_TIPO = gql`
  query GetOcupacionPorTipo {
    ocupacionPorTipo
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREAR_HABITACION = gql`
  ${HABITACION_FRAGMENT}
  mutation CrearHabitacion($input: CrearHabitacionInput!) {
    crearHabitacion(input: $input) {
      ...HabitacionFields
    }
  }
`;

export const ACTUALIZAR_HABITACION = gql`
  ${HABITACION_FRAGMENT}
  mutation ActualizarHabitacion($id: Int!, $input: ActualizarHabitacionInput!) {
    actualizarHabitacion(id: $id, input: $input) {
      ...HabitacionFields
    }
  }
`;

export const CAMBIAR_ESTADO_HABITACION = gql`
  ${HABITACION_FRAGMENT}
  mutation CambiarEstadoHabitacion($id: Int!, $estado: EstadoHabitacion!) {
    cambiarEstadoHabitacion(id: $id, estado: $estado) {
      ...HabitacionFields
    }
  }
`;

export const REGISTRAR_LIMPIEZA = gql`
  ${HABITACION_FRAGMENT}
  mutation RegistrarLimpieza($habitacionId: Int!) {
    registrarLimpieza(habitacion_id: $habitacionId) {
      ...HabitacionFields
    }
  }
`;

export const REGISTRAR_MANTENIMIENTO = gql`
  ${HABITACION_FRAGMENT}
  mutation RegistrarMantenimiento($habitacionId: Int!, $notas: String) {
    registrarMantenimiento(habitacion_id: $habitacionId, notas: $notas) {
      ...HabitacionFields
    }
  }
`;
