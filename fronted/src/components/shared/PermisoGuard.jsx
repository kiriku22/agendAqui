import { usePermisos } from '../../hooks/usePermisos';

/**
 * Componente para proteger secciones de la UI por permiso
 *
 * @param {Object} props
 * @param {string} props.permiso - Código del permiso requerido
 * @param {string[]} props.permisos - Array de permisos (requiere al menos uno por defecto)
 * @param {boolean} props.todos - Si true, requiere todos los permisos del array
 * @param {ReactNode} props.children - Contenido a mostrar si tiene permiso
 * @param {ReactNode} props.fallback - Contenido alternativo si no tiene permiso
 * @param {boolean} props.ocultar - Si true, oculta completamente en lugar de mostrar fallback
 *
 * @example
 * // Un solo permiso
 * <PermisoGuard permiso="habitaciones.crear">
 *   <Button>Crear Habitación</Button>
 * </PermisoGuard>
 *
 * @example
 * // Múltiples permisos (al menos uno)
 * <PermisoGuard permisos={['pos.vender', 'pos.anular']}>
 *   <VentasPanel />
 * </PermisoGuard>
 *
 * @example
 * // Múltiples permisos (todos requeridos)
 * <PermisoGuard permisos={['caja.ver', 'caja.abrir']} todos>
 *   <AbrirCajaButton />
 * </PermisoGuard>
 *
 * @example
 * // Ocultar si no tiene permiso (sin fallback)
 * <PermisoGuard permiso="configuracion.usuarios" ocultar>
 *   <GestionUsuarios />
 * </PermisoGuard>
 */
function PermisoGuard({
  permiso,
  permisos = [],
  todos = false,
  children,
  fallback = null,
  ocultar = false
}) {
  const { tienePermiso, tieneAlgunPermiso, tieneTodosPermisos, loading } = usePermisos();

  // Mientras carga, no mostrar nada
  if (loading) return null;

  let autorizado = false;

  if (permiso) {
    // Verificar un solo permiso
    autorizado = tienePermiso(permiso);
  } else if (permisos.length > 0) {
    // Verificar múltiples permisos
    autorizado = todos ? tieneTodosPermisos(permisos) : tieneAlgunPermiso(permisos);
  } else {
    // Sin permisos especificados, mostrar contenido
    autorizado = true;
  }

  if (!autorizado) {
    if (ocultar) return null;
    return fallback;
  }

  return children;
}

export default PermisoGuard;
