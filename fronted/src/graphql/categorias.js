import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const CATEGORIA_INVENTARIO_FRAGMENT = gql`
  fragment CategoriaInventarioFields on CategoriaInventario {
    id
    nombre
    descripcion
    tipo
    color
    icono
    orden
    activa
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_CATEGORIAS_INVENTARIO = gql`
  ${CATEGORIA_INVENTARIO_FRAGMENT}
  query GetCategoriasInventario($tipo: TipoCategoria, $activa: Boolean) {
    categoriasInventario(tipo: $tipo, activa: $activa) {
      ...CategoriaInventarioFields
    }
  }
`;

export const GET_CATEGORIA_INVENTARIO = gql`
  ${CATEGORIA_INVENTARIO_FRAGMENT}
  query GetCategoriaInventario($id: Int!) {
    categoriaInventario(id: $id) {
      ...CategoriaInventarioFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREAR_CATEGORIA_INVENTARIO = gql`
  ${CATEGORIA_INVENTARIO_FRAGMENT}
  mutation CrearCategoriaInventario($input: CrearCategoriaInput!) {
    crearCategoriaInventario(input: $input) {
      ...CategoriaInventarioFields
    }
  }
`;

export const ACTUALIZAR_CATEGORIA_INVENTARIO = gql`
  ${CATEGORIA_INVENTARIO_FRAGMENT}
  mutation ActualizarCategoriaInventario($id: Int!, $input: ActualizarCategoriaInput!) {
    actualizarCategoriaInventario(id: $id, input: $input) {
      ...CategoriaInventarioFields
    }
  }
`;

export const ELIMINAR_CATEGORIA_INVENTARIO = gql`
  ${CATEGORIA_INVENTARIO_FRAGMENT}
  mutation EliminarCategoriaInventario($id: Int!) {
    eliminarCategoriaInventario(id: $id) {
      ...CategoriaInventarioFields
    }
  }
`;
