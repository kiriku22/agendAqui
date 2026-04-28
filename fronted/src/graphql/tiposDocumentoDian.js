import { gql } from '@apollo/client';

// Query para obtener todos los tipos de documento DIAN
export const GET_TIPOS_DOCUMENTO_DIAN = gql`
  query GetTiposDocumentoDian($activo: Boolean) {
    tiposDocumentoDian(activo: $activo) {
      codigo_dian
      codigo_interno
      descripcion
      requiere_digito_verificacion
      patron_validacion
      longitud_minima
      longitud_maxima
      activo
    }
  }
`;

// Query para obtener un tipo de documento DIAN específico
export const GET_TIPO_DOCUMENTO_DIAN = gql`
  query GetTipoDocumentoDian($codigo_dian: Int!) {
    tipoDocumentoDian(codigo_dian: $codigo_dian) {
      codigo_dian
      codigo_interno
      descripcion
      requiere_digito_verificacion
      patron_validacion
      longitud_minima
      longitud_maxima
      activo
    }
  }
`;
