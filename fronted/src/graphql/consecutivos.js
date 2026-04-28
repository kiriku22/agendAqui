import { gql } from '@apollo/client';

// ============================================================
// QUERIES - Resoluciones DIAN
// ============================================================

export const GET_RESOLUCIONES = gql`
  query GetResoluciones {
    resoluciones {
      id
      tipo_documento
      nombre
      resolucion
      prefijo
      numero_inicial
      numero_final
      numero_actual
      fecha_inicio
      fecha_fin
      activo
      factus_numbering_range_id
      transmision_automatica
      numeros_usados
      numeros_disponibles
      porcentaje_uso
      created_at
      updated_at
    }
  }
`;

export const GET_RESOLUCION = gql`
  query GetResolucion($id: Int!) {
    resolucion(id: $id) {
      id
      tipo_documento
      nombre
      resolucion
      prefijo
      numero_inicial
      numero_final
      numero_actual
      fecha_inicio
      fecha_fin
      activo
      factus_numbering_range_id
      transmision_automatica
      numeros_usados
      numeros_disponibles
      porcentaje_uso
      created_at
      updated_at
    }
  }
`;

export const GET_RESOLUCION_ACTIVA = gql`
  query GetResolucionActiva($tipo_documento: String!) {
    resolucionActiva(tipo_documento: $tipo_documento) {
      id
      tipo_documento
      nombre
      resolucion
      prefijo
      numero_inicial
      numero_final
      numero_actual
      fecha_inicio
      fecha_fin
      activo
      factus_numbering_range_id
      transmision_automatica
      numeros_usados
      numeros_disponibles
      porcentaje_uso
    }
  }
`;

// ============================================================
// MUTATIONS - Gestión de Resoluciones
// ============================================================

export const CREAR_RESOLUCION = gql`
  mutation CrearResolucion($input: ResolucionDianInput!) {
    crearResolucion(input: $input) {
      id
      tipo_documento
      nombre
      resolucion
      prefijo
      numero_inicial
      numero_final
      numero_actual
      fecha_inicio
      fecha_fin
      activo
      factus_numbering_range_id
      transmision_automatica
    }
  }
`;

export const ACTUALIZAR_RESOLUCION = gql`
  mutation ActualizarResolucion($id: Int!, $input: ResolucionDianInput!) {
    actualizarResolucion(id: $id, input: $input) {
      id
      tipo_documento
      nombre
      resolucion
      prefijo
      numero_inicial
      numero_final
      numero_actual
      fecha_inicio
      fecha_fin
      activo
      factus_numbering_range_id
      transmision_automatica
    }
  }
`;

export const GET_FACTUS_NUMBERING_RANGES = gql`
  query GetFactusNumberingRanges {
    factusNumberingRanges {
      id
      document
      prefix
      from
      to
      current
      resolution_number
      is_expired
    }
  }
`;

export const ACTIVAR_RESOLUCION = gql`
  mutation ActivarResolucion($id: Int!) {
    activarResolucion(id: $id) {
      id
      tipo_documento
      nombre
      activo
    }
  }
`;

export const DESACTIVAR_RESOLUCION = gql`
  mutation DesactivarResolucion($id: Int!) {
    desactivarResolucion(id: $id) {
      id
      tipo_documento
      nombre
      activo
    }
  }
`;
