/**
 * Catalogo de modulos del sistema Factufy Hotel
 *
 * Define todos los modulos disponibles en el sistema,
 * separados entre Core (incluidos en todas las licencias)
 * y Premium (requieren licencia especifica)
 */

// Catalogo completo de modulos
const MODULOS_SISTEMA = {
  // ============================================
  // MODULOS CORE - Incluidos en todas las licencias
  // ============================================
  habitaciones: {
    nombre: 'Habitaciones',
    descripcion: 'Gestion de habitaciones del hotel',
    core: true,
    ruta: '/habitaciones',
    icono: 'bed'
  },
  reservas: {
    nombre: 'Reservas',
    descripcion: 'Sistema de reservaciones',
    core: true,
    ruta: '/reservas',
    icono: 'calendar'
  },
  hospedajes: {
    nombre: 'Hospedajes',
    descripcion: 'Check-in y check-out de huespedes',
    core: true,
    ruta: '/hospedajes',
    icono: 'user-check'
  },
  huespedes: {
    nombre: 'Huespedes',
    descripcion: 'Registro de huespedes',
    core: true,
    ruta: '/huespedes',
    icono: 'users'
  },
  clientes: {
    nombre: 'Clientes',
    descripcion: 'Gestion de clientes',
    core: true,
    ruta: '/clientes',
    icono: 'contact'
  },
  servicios: {
    nombre: 'Servicios',
    descripcion: 'Servicios del hotel',
    core: true,
    ruta: '/servicios',
    icono: 'concierge-bell'
  },
  inventario: {
    nombre: 'Inventario',
    descripcion: 'Control de productos e inventario',
    core: true,
    ruta: '/inventario',
    icono: 'package'
  },
  pos: {
    nombre: 'Punto de Venta',
    descripcion: 'Ventas y facturacion rapida',
    core: true,
    ruta: '/pos',
    icono: 'shopping-cart'
  },
  caja: {
    nombre: 'Caja',
    descripcion: 'Apertura y cierre de caja',
    core: true,
    ruta: '/caja',
    icono: 'cash-register'
  },
  reportes: {
    nombre: 'Reportes',
    descripcion: 'Reportes y estadisticas',
    core: true,
    ruta: '/reportes',
    icono: 'bar-chart'
  },
  configuracion: {
    nombre: 'Configuracion',
    descripcion: 'Configuracion del sistema',
    core: true,
    ruta: '/configuracion',
    icono: 'settings'
  },
  facturacion_electronica: {
    nombre: 'Facturacion Electronica',
    descripcion: 'Integracion con DIAN via Factus',
    core: true,
    ruta: '/factubox',
    icono: 'file-text'
  },

  // ============================================
  // MODULOS ADICIONALES - Requieren licencia especifica
  // Unico modulo premium disponible: pedidos_whatsapp
  // ============================================
  pedidos_whatsapp: {
    nombre: 'Pedidos WhatsApp',
    descripcion: 'Recepcion y gestion de pedidos via WhatsApp con chatbot IA, pagos online y verificacion de transferencias',
    core: false,
    ruta: '/pedidos-whatsapp',
    icono: 'smartphone'
  }
};

// Lista de codigos de modulos Core
const MODULOS_CORE = Object.keys(MODULOS_SISTEMA).filter(
  codigo => MODULOS_SISTEMA[codigo].core
);

// Lista de codigos de modulos Premium
const MODULOS_PREMIUM = Object.keys(MODULOS_SISTEMA).filter(
  codigo => !MODULOS_SISTEMA[codigo].core
);

/**
 * Obtiene la lista de modulos habilitados para una licencia
 * @param {string[]} modulosLicencia - Array de codigos de modulos de la licencia
 * @returns {Object[]} - Array de modulos con flag habilitado
 */
function obtenerModulosConEstado(modulosLicencia = []) {
  return Object.entries(MODULOS_SISTEMA).map(([codigo, modulo]) => ({
    codigo,
    nombre: modulo.nombre,
    descripcion: modulo.descripcion,
    core: modulo.core,
    ruta: modulo.ruta,
    icono: modulo.icono,
    // Core siempre habilitado, premium solo si esta en la licencia
    habilitado: modulo.core || modulosLicencia.includes(codigo)
  }));
}

/**
 * Verifica si un modulo especifico esta habilitado
 * @param {string} codigoModulo - Codigo del modulo a verificar
 * @param {string[]} modulosLicencia - Array de codigos de modulos de la licencia
 * @returns {boolean}
 */
function moduloHabilitado(codigoModulo, modulosLicencia = []) {
  const modulo = MODULOS_SISTEMA[codigoModulo];
  if (!modulo) return false;
  return modulo.core || modulosLicencia.includes(codigoModulo);
}

module.exports = {
  MODULOS_SISTEMA,
  MODULOS_CORE,
  MODULOS_PREMIUM,
  obtenerModulosConEstado,
  moduloHabilitado
};
