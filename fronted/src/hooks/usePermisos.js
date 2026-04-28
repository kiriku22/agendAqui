import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { ME } from '../graphql/auth';

/**
 * Hook para gestionar permisos del usuario actual
 *
 * @returns {Object} Objeto con permisos y funciones de verificación
 *
 * @example
 * const { tienePermiso, permisos, isAdmin } = usePermisos();
 *
 * if (tienePermiso('habitaciones.crear')) {
 *   // Mostrar botón de crear
 * }
 */
export function usePermisos() {
  const { data, loading, error } = useQuery(ME, {
    fetchPolicy: 'cache-first'
  });

  const permisos = useMemo(() => {
    return data?.me?.permisos_efectivos || [];
  }, [data]);

  const rol = data?.me?.rol;
  const isAdmin = rol === 'admin';
  const usuario = data?.me;

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} codigo - Código del permiso (ej: 'habitaciones.ver')
   * @returns {boolean}
   */
  const tienePermiso = (codigo) => {
    if (loading) return false;
    if (isAdmin) return true;
    return permisos.includes(codigo);
  };

  /**
   * Verifica si el usuario tiene TODOS los permisos especificados
   * @param {string[]} codigos - Array de códigos de permiso
   * @returns {boolean}
   */
  const tieneTodosPermisos = (codigos) => {
    if (loading) return false;
    if (isAdmin) return true;
    return codigos.every(codigo => permisos.includes(codigo));
  };

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos especificados
   * @param {string[]} codigos - Array de códigos de permiso
   * @returns {boolean}
   */
  const tieneAlgunPermiso = (codigos) => {
    if (loading) return false;
    if (isAdmin) return true;
    return codigos.some(codigo => permisos.includes(codigo));
  };

  /**
   * Filtra permisos por módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {string[]} Array de códigos de permiso del módulo
   */
  const permisosModulo = (modulo) => {
    return permisos.filter(p => p.startsWith(`${modulo}.`));
  };

  /**
   * Verifica si tiene permiso para un módulo (cualquier permiso del módulo)
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  const tieneAccesoModulo = (modulo) => {
    if (loading) return false;
    if (isAdmin) return true;
    return permisos.some(p => p.startsWith(`${modulo}.`));
  };

  return {
    permisos,
    rol,
    isAdmin,
    usuario,
    loading,
    error,
    tienePermiso,
    tieneTodosPermisos,
    tieneAlgunPermiso,
    permisosModulo,
    tieneAccesoModulo
  };
}

export default usePermisos;
