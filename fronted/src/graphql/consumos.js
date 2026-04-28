import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const CONSUMO_FRAGMENT = gql`
  fragment ConsumoFields on ConsumoHabitacion {
    id
    hospedaje_id
    habitacion_id
    producto_id
    servicio_id
    descripcion
    cantidad
    precio_unitario
    precio_total
    iva
    fecha_consumo
    facturado
    factura_id
    usuario_id
    notas
    producto_nombre
    servicio_nombre
    usuario_registro
    created_at
  }
`;

export const RESUMEN_CONSUMOS_FRAGMENT = gql`
  fragment ResumenConsumosFields on ResumenConsumos {
    total_items
    total_consumos
    items_facturados
    total_facturado
    items_pendientes
    total_pendiente
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_CONSUMOS_POR_HOSPEDAJE = gql`
  ${CONSUMO_FRAGMENT}
  query GetConsumosPorHospedaje($hospedajeId: Int!) {
    consumosPorHospedaje(hospedaje_id: $hospedajeId) {
      ...ConsumoFields
    }
  }
`;

export const GET_CONSUMO = gql`
  ${CONSUMO_FRAGMENT}
  query GetConsumo($id: Int!) {
    consumo(id: $id) {
      ...ConsumoFields
    }
  }
`;

export const GET_CONSUMOS_NO_FACTURADOS = gql`
  ${CONSUMO_FRAGMENT}
  query GetConsumosNoFacturados($hospedajeId: Int) {
    consumosNoFacturados(hospedaje_id: $hospedajeId) {
      ...ConsumoFields
    }
  }
`;

export const GET_RESUMEN_CONSUMOS = gql`
  ${RESUMEN_CONSUMOS_FRAGMENT}
  query GetResumenConsumos($hospedajeId: Int!) {
    resumenConsumos(hospedaje_id: $hospedajeId) {
      ...ResumenConsumosFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const AGREGAR_CONSUMO = gql`
  ${CONSUMO_FRAGMENT}
  mutation AgregarConsumo($input: AgregarConsumoInput!) {
    agregarConsumo(input: $input) {
      ...ConsumoFields
    }
  }
`;

export const ACTUALIZAR_CONSUMO = gql`
  ${CONSUMO_FRAGMENT}
  mutation ActualizarConsumo($id: Int!, $input: ActualizarConsumoInput!) {
    actualizarConsumo(id: $id, input: $input) {
      ...ConsumoFields
    }
  }
`;

export const ELIMINAR_CONSUMO = gql`
  ${CONSUMO_FRAGMENT}
  mutation EliminarConsumo($id: Int!) {
    eliminarConsumo(id: $id) {
      ...ConsumoFields
    }
  }
`;

export const MARCAR_CONSUMOS_FACTURADOS = gql`
  ${CONSUMO_FRAGMENT}
  mutation MarcarConsumosFacturados($hospedajeId: Int!) {
    marcarConsumosFacturados(hospedaje_id: $hospedajeId) {
      ...ConsumoFields
    }
  }
`;
