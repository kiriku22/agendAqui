import { gql } from '@apollo/client';

// =============================================================================
// QUERIES DE PERMISOS
// =============================================================================

/**
 * Obtener catálogo de permisos
 */
export const GET_PERMISOS = gql`
  query GetPermisos($modulo: String, $activo: Boolean) {
    permisos(modulo: $modulo, activo: $activo) {
      id
      codigo
      nombre
      descripcion
      modulo
      categoria
      orden
      activo
    }
  }
`;

/**
 * Obtener permisos de un rol agrupados por módulo
 */
export const GET_PERMISOS_ROL_AGRUPADOS = gql`
  query GetPermisosRolAgrupados($rol: RolUsuario!) {
    permisosRolAgrupados(rol: $rol) {
      modulo
      permisos {
        id
        codigo
        nombre
        descripcion
        modulo
        categoria
        asignado
        origen
        editable
      }
    }
  }
`;

/**
 * Obtener permisos de un usuario agrupados por módulo
 */
export const GET_PERMISOS_USUARIO_AGRUPADOS = gql`
  query GetPermisosUsuarioAgrupados($usuario_id: Int!) {
    permisosUsuarioAgrupados(usuario_id: $usuario_id) {
      modulo
      permisos {
        id
        codigo
        nombre
        descripcion
        modulo
        categoria
        asignado
        origen
        editable
      }
    }
  }
`;

/**
 * Verificar si el usuario actual tiene un permiso
 */
export const TIENE_PERMISO = gql`
  query TienePermiso($codigo: String!) {
    tienePermiso(codigo: $codigo)
  }
`;

// =============================================================================
// MUTATIONS DE PERMISOS
// =============================================================================

/**
 * Asignar permisos a un rol
 */
export const ASIGNAR_PERMISOS_ROL = gql`
  mutation AsignarPermisosRol($rol: RolUsuario!, $permisos_ids: [Int!]!) {
    asignarPermisosRol(rol: $rol, permisos_ids: $permisos_ids)
  }
`;

/**
 * Asignar permiso a un usuario
 */
export const ASIGNAR_PERMISO_USUARIO = gql`
  mutation AsignarPermisoUsuario(
    $usuario_id: Int!
    $permiso_id: Int!
    $tipo_asignacion: TipoAsignacionPermiso!
    $motivo: String
  ) {
    asignarPermisoUsuario(
      usuario_id: $usuario_id
      permiso_id: $permiso_id
      tipo_asignacion: $tipo_asignacion
      motivo: $motivo
    )
  }
`;

/**
 * Quitar permiso de un usuario
 */
export const QUITAR_PERMISO_USUARIO = gql`
  mutation QuitarPermisoUsuario($usuario_id: Int!, $permiso_id: Int!) {
    quitarPermisoUsuario(usuario_id: $usuario_id, permiso_id: $permiso_id)
  }
`;
