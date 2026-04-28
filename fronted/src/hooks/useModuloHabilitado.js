import { useQuery } from '@apollo/client';
import { GET_LICENCIA_SISTEMA } from '../graphql/licencia';

/**
 * Lista de modulos Core del sistema
 * Estos modulos siempre estan habilitados independientemente de la licencia
 */
const MODULOS_CORE = [
  'habitaciones',
  'reservas',
  'hospedajes',
  'huespedes',
  'clientes',
  'servicios',
  'inventario',
  'pos',
  'caja',
  'reportes',
  'configuracion',
  'facturacion_electronica'
];

/**
 * Hook para verificar si un modulo especifico esta habilitado
 *
 * @param {string} codigoModulo - Codigo del modulo a verificar
 * @returns {boolean} - true si el modulo esta habilitado
 *
 * Comportamiento:
 * - Modulos Core: Siempre habilitados (retorna true)
 * - Modulos Premium: Solo si estan en la lista de modulos de la licencia
 * - Sin licencia activa: Solo modulos Core habilitados
 *
 * @example
 * // En un componente
 * const whatsappHabilitado = useModuloHabilitado('pedidos_whatsapp');
 * if (!whatsappHabilitado) return <ModuloNoDisponible />;
 */
export function useModuloHabilitado(codigoModulo) {
  const { data, loading } = useQuery(GET_LICENCIA_SISTEMA, {
    fetchPolicy: 'cache-first'
  });

  // Si es modulo core, siempre habilitado
  if (MODULOS_CORE.includes(codigoModulo)) {
    return true;
  }

  // Si esta cargando, asumir no habilitado (conservador)
  if (loading) {
    return false;
  }

  // Si no hay licencia activa, solo modulos core
  if (!data?.licenciaSistema?.activa) {
    return false;
  }

  // Verificar si el modulo esta en la lista de la licencia
  const modulosLicencia = data?.licenciaSistema?.modulos || [];
  return modulosLicencia.includes(codigoModulo);
}

/**
 * Hook para obtener la lista de todos los modulos habilitados
 *
 * @returns {string[]} - Array de codigos de modulos habilitados
 *
 * Retorna los modulos Core + los modulos Premium de la licencia
 *
 * @example
 * const modulosHabilitados = useModulosHabilitados();
 * console.log(modulosHabilitados); // ['habitaciones', 'reservas', ..., 'pedidos_whatsapp']
 */
export function useModulosHabilitados() {
  const { data } = useQuery(GET_LICENCIA_SISTEMA, {
    fetchPolicy: 'cache-first'
  });

  const modulosLicencia = data?.licenciaSistema?.modulos || [];

  // Combinar Core + Premium (sin duplicados)
  const todosModulos = [
    ...MODULOS_CORE,
    ...modulosLicencia.filter(m => !MODULOS_CORE.includes(m))
  ];

  return todosModulos;
}

/**
 * Hook para obtener informacion de carga del estado de modulos
 *
 * @returns {Object} - { loading, error, modulosCore, modulosPremium }
 *
 * Util para mostrar estados de carga o errores en la UI
 */
export function useEstadoModulos() {
  const { data, loading, error } = useQuery(GET_LICENCIA_SISTEMA, {
    fetchPolicy: 'cache-first'
  });

  const modulosLicencia = data?.licenciaSistema?.modulos || [];
  const modulosPremium = modulosLicencia.filter(m => !MODULOS_CORE.includes(m));

  return {
    loading,
    error,
    licenciaActiva: data?.licenciaSistema?.activa || false,
    modulosCore: MODULOS_CORE,
    modulosPremium,
    totalModulosHabilitados: MODULOS_CORE.length + modulosPremium.length
  };
}

// Exportar lista de modulos core para uso externo
export { MODULOS_CORE };

export default useModuloHabilitado;
