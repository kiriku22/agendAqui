/**
 * Helper para verificar permisos en resolvers GraphQL
 *
 * Uso:
 *   const { verificarPermiso } = require('../utils/verificarPermiso');
 *
 *   crearHabitacion: async (_, { input }, context) => {
 *     verificarPermiso(context, 'habitaciones.crear', 'No tiene permiso para crear habitaciones');
 *     // ... resto del código
 *   }
 */

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {Object} context - Contexto de GraphQL ({ user, pool, permisos, tienePermiso })
 * @param {string} codigo - Código del permiso requerido (ej: 'habitaciones.crear')
 * @param {string} [mensajeError] - Mensaje de error personalizado
 * @throws {Error} Si no está autenticado o no tiene el permiso
 */
function verificarPermiso(context, codigo, mensajeError) {
  if (!context.user) {
    throw new Error('No autenticado');
  }

  // Admin siempre tiene todos los permisos
  if (context.user.rol === 'admin') {
    return;
  }

  // Verificar usando la función del contexto
  if (context.tienePermiso && !context.tienePermiso(codigo)) {
    throw new Error(mensajeError || `No tiene permiso para: ${codigo}`);
  }

  // Fallback: verificar contra array de permisos
  if (context.permisos && !context.permisos.includes(codigo)) {
    throw new Error(mensajeError || `No tiene permiso para: ${codigo}`);
  }
}

/**
 * Verifica si el usuario tiene al menos uno de los permisos especificados
 * @param {Object} context - Contexto de GraphQL
 * @param {string[]} codigos - Array de códigos de permiso
 * @param {string} [mensajeError] - Mensaje de error personalizado
 * @throws {Error} Si no tiene ningún permiso
 */
function verificarAlgunPermiso(context, codigos, mensajeError) {
  if (!context.user) {
    throw new Error('No autenticado');
  }

  // Admin siempre tiene todos los permisos
  if (context.user.rol === 'admin') {
    return;
  }

  const tieneAlguno = codigos.some(codigo => {
    if (context.tienePermiso) {
      return context.tienePermiso(codigo);
    }
    if (context.permisos) {
      return context.permisos.includes(codigo);
    }
    return false;
  });

  if (!tieneAlguno) {
    throw new Error(mensajeError || 'No tiene permisos suficientes para esta operación');
  }
}

/**
 * Verifica si el usuario tiene TODOS los permisos especificados
 * @param {Object} context - Contexto de GraphQL
 * @param {string[]} codigos - Array de códigos de permiso
 * @param {string} [mensajeError] - Mensaje de error personalizado
 * @throws {Error} Si no tiene todos los permisos
 */
function verificarTodosPermisos(context, codigos, mensajeError) {
  if (!context.user) {
    throw new Error('No autenticado');
  }

  // Admin siempre tiene todos los permisos
  if (context.user.rol === 'admin') {
    return;
  }

  const tieneTodos = codigos.every(codigo => {
    if (context.tienePermiso) {
      return context.tienePermiso(codigo);
    }
    if (context.permisos) {
      return context.permisos.includes(codigo);
    }
    return false;
  });

  if (!tieneTodos) {
    throw new Error(mensajeError || 'No tiene todos los permisos requeridos para esta operación');
  }
}

/**
 * Verifica si el usuario es admin
 * @param {Object} context - Contexto de GraphQL
 * @param {string} [mensajeError] - Mensaje de error personalizado
 * @throws {Error} Si no es admin
 */
function verificarAdmin(context, mensajeError) {
  if (!context.user) {
    throw new Error('No autenticado');
  }

  if (context.user.rol !== 'admin') {
    throw new Error(mensajeError || 'Esta operación requiere permisos de administrador');
  }
}

/**
 * Verifica autenticación básica (sin verificar permisos específicos)
 * @param {Object} context - Contexto de GraphQL
 * @param {string} [mensajeError] - Mensaje de error personalizado
 * @throws {Error} Si no está autenticado
 */
function verificarAutenticado(context, mensajeError) {
  if (!context.user) {
    throw new Error(mensajeError || 'No autenticado');
  }
}

module.exports = {
  verificarPermiso,
  verificarAlgunPermiso,
  verificarTodosPermisos,
  verificarAdmin,
  verificarAutenticado
};
