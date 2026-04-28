import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const IMPRESORA_FRAGMENT = gql`
  fragment ImpresoraFields on Impresora {
    id
    nombre
    tipo
    nombre_sistema
    descripcion
    activa
    es_predeterminada
    ancho_papel
    created_at
    updated_at
  }
`;

export const IMPRESORA_SISTEMA_FRAGMENT = gql`
  fragment ImpresoraSistemaFields on ImpresoraSistema {
    nombre
    nombre_driver
    estado
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_IMPRESORAS = gql`
  ${IMPRESORA_FRAGMENT}
  query GetImpresoras {
    impresoras {
      ...ImpresoraFields
    }
  }
`;

export const GET_IMPRESORA = gql`
  ${IMPRESORA_FRAGMENT}
  query GetImpresora($id: Int!) {
    impresora(id: $id) {
      ...ImpresoraFields
    }
  }
`;

export const GET_IMPRESORAS_ACTIVAS = gql`
  ${IMPRESORA_FRAGMENT}
  query GetImpresorasActivas {
    impresorasActivas {
      ...ImpresoraFields
    }
  }
`;

export const GET_IMPRESORAS_POR_TIPO = gql`
  ${IMPRESORA_FRAGMENT}
  query GetImpresorasPorTipo($tipo: String!) {
    impresorasPorTipo(tipo: $tipo) {
      ...ImpresoraFields
    }
  }
`;

export const GET_IMPRESORA_PREDETERMINADA = gql`
  ${IMPRESORA_FRAGMENT}
  query GetImpresoraPredeterminada($tipo: String!) {
    impresoraPredeterminada(tipo: $tipo) {
      ...ImpresoraFields
    }
  }
`;

export const GET_IMPRESORAS_DEL_SISTEMA = gql`
  ${IMPRESORA_SISTEMA_FRAGMENT}
  query GetImpresorasDelSistema {
    impresorasDelSistema {
      ...ImpresoraSistemaFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREAR_IMPRESORA = gql`
  ${IMPRESORA_FRAGMENT}
  mutation CrearImpresora($input: CrearImpresoraInput!) {
    crearImpresora(input: $input) {
      ...ImpresoraFields
    }
  }
`;

export const ACTUALIZAR_IMPRESORA = gql`
  ${IMPRESORA_FRAGMENT}
  mutation ActualizarImpresora($id: Int!, $input: ActualizarImpresoraInput!) {
    actualizarImpresora(id: $id, input: $input) {
      ...ImpresoraFields
    }
  }
`;

export const ELIMINAR_IMPRESORA = gql`
  mutation EliminarImpresora($id: Int!) {
    eliminarImpresora(id: $id)
  }
`;

export const ESTABLECER_IMPRESORA_PREDETERMINADA = gql`
  ${IMPRESORA_FRAGMENT}
  mutation EstablecerImpresoraPredeterminada($id: Int!) {
    establecerImpresoraPredeterminada(id: $id) {
      ...ImpresoraFields
    }
  }
`;
