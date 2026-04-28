/**
 * Utilidades de fecha con zona horaria Colombia (America/Bogota)
 * Todas las funciones formatean fechas en zona horaria colombiana
 */

const TIMEZONE = 'America/Bogota';
const LOCALE = 'es-CO';

/**
 * Formatea fecha completa con hora
 * @param {string|Date} fecha
 * @returns {string} "23/02/2026, 10:30 a.m."
 */
export function formatFechaHora(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea solo fecha sin hora
 * @param {string|Date} fecha
 * @returns {string} "23/02/2026"
 */
export function formatFecha(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea fecha larga
 * @param {string|Date} fecha
 * @returns {string} "23 de febrero de 2026"
 */
export function formatFechaLarga(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(LOCALE, {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatea fecha corta para reportes/graficas
 * @param {string|Date} fecha
 * @returns {string} "23 feb"
 */
export function formatFechaCorta(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(LOCALE, {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formatea solo hora
 * @param {string|Date} fecha
 * @returns {string} "10:30 a.m."
 */
export function formatHora(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString(LOCALE, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtiene la fecha actual en Colombia como string YYYY-MM-DD
 * Util para comparaciones de fecha sin problemas de timezone
 * @returns {string} "2026-02-23"
 */
export function fechaHoyColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Obtiene un Date ajustado a Colombia para comparaciones
 * @param {string|Date} fecha
 * @returns {Date}
 */
export function dateEnColombia(fecha) {
  const str = new Date(fecha).toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(str);
}

export default {
  formatFechaHora,
  formatFecha,
  formatFechaLarga,
  formatFechaCorta,
  formatHora,
  fechaHoyColombia,
  dateEnColombia
};
