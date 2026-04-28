import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const CLIENTE_FRAGMENT = gql`
  fragment ClienteFields on Cliente {
    id
    nombre
    apellido
    tipo_documento
    tipo_documento_dian
    numero_documento
    digito_verificacion
    telefono
    email
    direccion
    ciudad
    codigo_municipio
    pais
    fecha_nacimiento
    regimen_tributario
    responsable_iva
    observaciones
    activo
    created_at
  }
`;

export const HUESPED_FRAGMENT = gql`
  fragment HuespedFields on Huesped {
    id
    cliente_id
    nombre_completo
    tipo_documento
    numero_documento
    fecha_nacimiento
    nacionalidad
    telefono
    email
    direccion
    ciudad
    pais
    contacto_emergencia
    telefono_emergencia
    observaciones
    preferencias
    created_at
    lugar_residencia
    lugar_procedencia
    motivo_viaje
  }
`;

// ============================================================================
// QUERIES - CLIENTES
// ============================================================================

export const GET_CLIENTES = gql`
  ${CLIENTE_FRAGMENT}
  query GetClientes($busqueda: String, $activo: Boolean) {
    clientes(busqueda: $busqueda, activo: $activo) {
      ...ClienteFields
    }
  }
`;

export const GET_CLIENTE = gql`
  ${CLIENTE_FRAGMENT}
  query GetCliente($id: Int!) {
    cliente(id: $id) {
      ...ClienteFields
    }
  }
`;

// ============================================================================
// QUERIES - HUÉSPEDES
// ============================================================================

export const GET_HUESPEDES = gql`
  ${HUESPED_FRAGMENT}
  query GetHuespedes {
    huespedes {
      ...HuespedFields
    }
  }
`;

export const GET_HUESPED = gql`
  ${HUESPED_FRAGMENT}
  query GetHuesped($id: Int!) {
    huesped(id: $id) {
      ...HuespedFields
    }
  }
`;

export const GET_HUESPED_POR_DOCUMENTO = gql`
  ${HUESPED_FRAGMENT}
  query GetHuespedPorDocumento($numero_documento: String!) {
    huespedPorDocumento(numero_documento: $numero_documento) {
      ...HuespedFields
    }
  }
`;

// ============================================================================
// MUTATIONS - CLIENTES
// ============================================================================

export const CREAR_CLIENTE = gql`
  ${CLIENTE_FRAGMENT}
  mutation CrearCliente($input: CrearClienteInput!) {
    crearCliente(input: $input) {
      ...ClienteFields
    }
  }
`;

export const ACTUALIZAR_CLIENTE = gql`
  ${CLIENTE_FRAGMENT}
  mutation ActualizarCliente($id: Int!, $input: CrearClienteInput!) {
    actualizarCliente(id: $id, input: $input) {
      ...ClienteFields
    }
  }
`;

export const ELIMINAR_CLIENTE = gql`
  mutation EliminarCliente($id: Int!) {
    eliminarCliente(id: $id)
  }
`;

// ============================================================================
// MUTATIONS - HUÉSPEDES
// ============================================================================

export const CREAR_HUESPED = gql`
  ${HUESPED_FRAGMENT}
  mutation CrearHuesped($input: CrearHuespedInput!) {
    crearHuesped(input: $input) {
      ...HuespedFields
    }
  }
`;

export const ACTUALIZAR_HUESPED = gql`
  ${HUESPED_FRAGMENT}
  mutation ActualizarHuesped($id: Int!, $input: CrearHuespedInput!) {
    actualizarHuesped(id: $id, input: $input) {
      ...HuespedFields
    }
  }
`;

// ============================================================================
// QUERY - HUÉSPEDES DE UN CLIENTE
// ============================================================================

export const GET_HUESPEDES_DEL_CLIENTE = gql`
  ${HUESPED_FRAGMENT}
  query HuespedesDelCliente($cliente_id: Int!) {
    huespedesDelCliente(cliente_id: $cliente_id) {
      ...HuespedFields
    }
  }
`;
