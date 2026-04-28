import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const METODO_PAGO_FRAGMENT = gql`
  fragment MetodoPagoFields on MetodoPago {
    id
    nombre
    codigo_dian
    tipo
    requiere_referencia
    activo
    icono
    orden
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_METODOS_PAGO = gql`
  ${METODO_PAGO_FRAGMENT}
  query GetMetodosPago($activo: Boolean) {
    metodosPago(activo: $activo) {
      ...MetodoPagoFields
    }
  }
`;

export const GET_METODO_PAGO = gql`
  ${METODO_PAGO_FRAGMENT}
  query GetMetodoPago($id: Int!) {
    metodoPago(id: $id) {
      ...MetodoPagoFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREAR_METODO_PAGO = gql`
  ${METODO_PAGO_FRAGMENT}
  mutation CrearMetodoPago($input: CrearMetodoPagoInput!) {
    crearMetodoPago(input: $input) {
      ...MetodoPagoFields
    }
  }
`;

export const ACTUALIZAR_METODO_PAGO = gql`
  ${METODO_PAGO_FRAGMENT}
  mutation ActualizarMetodoPago($id: Int!, $input: ActualizarMetodoPagoInput!) {
    actualizarMetodoPago(id: $id, input: $input) {
      ...MetodoPagoFields
    }
  }
`;

export const ELIMINAR_METODO_PAGO = gql`
  mutation EliminarMetodoPago($id: Int!) {
    eliminarMetodoPago(id: $id)
  }
`;
