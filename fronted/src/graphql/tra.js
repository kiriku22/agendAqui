import { gql } from '@apollo/client';

// ============================================================================
// QUERIES TRA
// ============================================================================

export const GET_CONFIGURACION_TRA = gql`
  query GetConfiguracionTRA {
    configuracionTRA {
      id
      token
      rnt
      nombre_establecimiento
      tipo_acomodacion
      endpoint
      activo
      ultimo_envio_exitoso
      total_envios_exitosos
      total_envios_fallidos
      created_at
      updated_at
    }
  }
`;

export const GET_REPORTES_TRA_POR_HOSPEDAJE = gql`
  query GetReportesTRAPorHospedaje($hospedaje_id: Int!) {
    reportesTRAPorHospedaje(hospedaje_id: $hospedaje_id) {
      id
      hospedaje_id
      huesped_id
      estado
      fecha_envio
      codigo_confirmacion
      code_principal
      errores
      intentos
      datos_enviados
      enviado_por
      created_at
    }
  }
`;

export const GET_REPORTES_TRA_PENDIENTES = gql`
  query GetReportesTRAPendientes {
    reportesTRAPendientes {
      id
      hospedaje_id
      huesped_id
      estado
      fecha_envio
      errores
      intentos
      created_at
      hospedaje {
        id
        codigo
        fecha_entrada
      }
      huesped {
        id
        nombre_completo
        numero_documento
      }
    }
  }
`;

// ============================================================================
// MUTATIONS TRA
// ============================================================================

export const ACTUALIZAR_CONFIGURACION_TRA = gql`
  mutation ActualizarConfiguracionTRA($input: ConfiguracionTRAInput!) {
    actualizarConfiguracionTRA(input: $input) {
      id
      token
      rnt
      nombre_establecimiento
      tipo_acomodacion
      endpoint
      activo
      ultimo_envio_exitoso
      total_envios_exitosos
      total_envios_fallidos
      updated_at
    }
  }
`;

export const PROBAR_CONEXION_TRA = gql`
  mutation ProbarConexionTRA {
    probarConexionTRA {
      success
      message
      data
    }
  }
`;

export const ENVIAR_TRA = gql`
  mutation EnviarTRA($hospedaje_id: Int!) {
    enviarTRA(hospedaje_id: $hospedaje_id) {
      id
      estado
      fecha_envio
      codigo_confirmacion
      errores
      intentos
    }
  }
`;

export const REINTENTAR_TRA = gql`
  mutation ReintentarTRA($reporte_id: Int!) {
    reintentarTRA(reporte_id: $reporte_id) {
      id
      estado
      fecha_envio
      codigo_confirmacion
      errores
      intentos
    }
  }
`;
