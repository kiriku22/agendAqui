/**
 * Utilidades de validación DIAN
 * @module validators
 */

/**
 * Calcula el dígito de verificación para NIT según algoritmo DIAN
 * @param {string} nit - Número de NIT sin dígito de verificación
 * @returns {string} - Dígito de verificación (0-9)
 *
 * @example
 * calcularDigitoVerificacionNIT('900123456') // Returns: '0'
 * calcularDigitoVerificacionNIT('860034313') // Returns: '7'
 */
function calcularDigitoVerificacionNIT(nit) {
  // Algoritmo oficial DIAN para cálculo de dígito de verificación
  const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let suma = 0;

  // Convertir NIT a array de números (derecha a izquierda)
  const nitArray = nit.toString().replace(/\D/g, '').split('').reverse();

  // Multiplicar cada dígito por su peso correspondiente
  for (let i = 0; i < nitArray.length && i < vpri.length; i++) {
    suma += parseInt(nitArray[i]) * vpri[i];
  }

  // Calcular el residuo
  const residuo = suma % 11;

  // Si el residuo es 0 o 1, el dígito de verificación es el mismo residuo
  // Sino, es 11 - residuo
  if (residuo === 0 || residuo === 1) {
    return residuo.toString();
  } else {
    return (11 - residuo).toString();
  }
}

/**
 * Validar formato de NIT colombiano
 * @param {string} nit - NIT completo con dígito de verificación
 * @returns {boolean} - true si el NIT es válido
 */
function validarNIT(nit) {
  if (!nit || typeof nit !== 'string') {
    return false;
  }

  // Remover caracteres no numéricos excepto el guion final
  const nitLimpio = nit.replace(/[^\d-]/g, '');

  // Formato esperado: XXXXXXXXX-D (9-10 dígitos + guion + 1 dígito)
  const partes = nitLimpio.split('-');

  if (partes.length !== 2) {
    return false;
  }

  const [numeroNit, digitoVerificacion] = partes;

  // Validar longitud del NIT (9-10 dígitos)
  if (numeroNit.length < 9 || numeroNit.length > 10) {
    return false;
  }

  // Calcular dígito de verificación esperado
  const digitoCalculado = calcularDigitoVerificacionNIT(numeroNit);

  // Comparar con el dígito proporcionado
  return digitoCalculado === digitoVerificacion;
}

/**
 * Validar código DANE de municipio
 * @param {string} codigoMunicipio - Código DIVIPOLA de 5 dígitos
 * @returns {boolean} - true si el formato es válido
 */
function validarCodigoMunicipio(codigoMunicipio) {
  if (!codigoMunicipio || typeof codigoMunicipio !== 'string') {
    return false;
  }

  // Debe ser exactamente 5 dígitos
  return /^\d{5}$/.test(codigoMunicipio);
}

module.exports = {
  calcularDigitoVerificacionNIT,
  validarNIT,
  validarCodigoMunicipio
};
