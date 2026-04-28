import { gql } from '@apollo/client';

/**
 * Query para obtener eventos del calendario unificado
 * Combina reservas y hospedajes Walk-In
 */
export const GET_EVENTOS_CALENDARIO = gql`
  query GetEventosCalendario(
    $fechaDesde: Date
    $fechaHasta: Date
    $habitacionId: Int
  ) {
    eventosCalendario(
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
      habitacion_id: $habitacionId
    ) {
      id
      tipo
      codigo
      es_reserva
      es_walkIn
      habitacion_id
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
      fecha_entrada
      fecha_salida
      estado
      noches
      num_adultos
      num_ninos
      precio_noche
      precio_total
      anticipo
      saldo_pendiente
      noches_previstas
      canal_reserva
      observaciones
      notas_especiales
      created_at
      confirmed_at
      cancelled_at
      motivo_cancelacion
      reserva_id
    }
  }
`;
