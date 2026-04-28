import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { GET_TIPOS_DOCUMENTO_DIAN } from '../graphql/tiposDocumentoDian';

/**
 * Hook personalizado para obtener y trabajar con tipos de documento DIAN
 * @param {boolean} activo - Filtrar solo tipos activos
 * @returns {object} - Objeto con tipos de documento y utilidades
 */
export const useTiposDocumentoDian = (activo = true) => {
  const { data, loading, error } = useQuery(GET_TIPOS_DOCUMENTO_DIAN, {
    variables: { activo },
    fetchPolicy: 'cache-first', // Cachear los tipos de documento
  });

  // Mapeo de códigos legacy a códigos DIAN
  const legacyToDian = useMemo(() => ({
    'CC': 13,      // Cédula de Ciudadanía → código DIAN 13
    'CE': 22,      // Cédula de Extranjería → código DIAN 22
    'TI': 12,      // Tarjeta de Identidad → código DIAN 12
    'RC': 11,      // Registro Civil → código DIAN 11
    'NIT': 31,     // NIT → código DIAN 31
    'PA': 41,      // Pasaporte → código DIAN 41
    'Otro': 43,    // Otro → código DIAN 43 (SIDA)
  }), []);

  // Mapeo de códigos DIAN a códigos legacy (para compatibilidad)
  const dianToLegacy = useMemo(() => ({
    11: 'RC',       // Registro Civil
    12: 'TI',       // Tarjeta de Identidad
    13: 'CC',       // Cédula de Ciudadanía
    21: 'TE',       // Tarjeta de Extranjería
    22: 'CE',       // Cédula de Extranjería
    31: 'NIT',      // NIT
    41: 'PA',       // Pasaporte
    42: 'DIE',      // Documento de identificación extranjero
    43: 'Otro',     // SIDA
    44: 'DIEP',     // Documento de identificación extranjero persona jurídica
    50: 'NPA',      // NIT de otro país
    91: 'NUIP',     // Número Único de Identificación Personal
  }), []);

  // Tipos de documento como array
  const tiposDocumento = useMemo(() => {
    return data?.tiposDocumentoDian || [];
  }, [data]);

  // Tipos de documento para dropdown (opcion value + label)
  const tiposDocumentoOptions = useMemo(() => {
    return tiposDocumento.map(tipo => ({
      value: tipo.codigo_dian,
      label: `${tipo.codigo_interno} - ${tipo.descripcion}`,
      codigo_interno: tipo.codigo_interno,
      descripcion: tipo.descripcion,
      patron_validacion: tipo.patron_validacion,
      longitud_minima: tipo.longitud_minima,
      longitud_maxima: tipo.longitud_maxima,
      requiere_digito_verificacion: tipo.requiere_digito_verificacion,
    }));
  }, [tiposDocumento]);

  /**
   * Obtener información de un tipo de documento por código DIAN
   * @param {number} codigo_dian - Código DIAN del tipo de documento
   * @returns {object|null} - Información del tipo de documento
   */
  const getTipoDocumentoDianInfo = (codigo_dian) => {
    return tiposDocumento.find(tipo => tipo.codigo_dian === codigo_dian) || null;
  };

  /**
   * Convertir código legacy a código DIAN
   * @param {string} codigo_legacy - Código legacy (ej: 'CC', 'NIT')
   * @returns {number|null} - Código DIAN correspondiente
   */
  const legacyToDianCode = (codigo_legacy) => {
    return legacyToDian[codigo_legacy] || null;
  };

  /**
   * Convertir código DIAN a código legacy
   * @param {number} codigo_dian - Código DIAN
   * @returns {string|null} - Código legacy correspondiente
   */
  const dianToLegacyCode = (codigo_dian) => {
    return dianToLegacy[codigo_dian] || null;
  };

  /**
   * Validar número de documento según el tipo DIAN
   * @param {number} codigo_dian - Código DIAN del tipo de documento
   * @param {string} numero_documento - Número de documento a validar
   * @returns {object} - { valid: boolean, message: string }
   */
  const validarDocumento = (codigo_dian, numero_documento) => {
    const tipoInfo = getTipoDocumentoDianInfo(codigo_dian);

    if (!tipoInfo) {
      return { valid: false, message: 'Tipo de documento no válido' };
    }

    // Limpiar el número de documento (remover espacios, puntos, guiones)
    const numeroLimpio = numero_documento.replace(/[\s.-]/g, '');

    // Validar longitud
    if (tipoInfo.longitud_minima && numeroLimpio.length < tipoInfo.longitud_minima) {
      return {
        valid: false,
        message: `El ${tipoInfo.codigo_interno} debe tener mínimo ${tipoInfo.longitud_minima} caracteres`
      };
    }

    if (tipoInfo.longitud_maxima && numeroLimpio.length > tipoInfo.longitud_maxima) {
      return {
        valid: false,
        message: `El ${tipoInfo.codigo_interno} debe tener máximo ${tipoInfo.longitud_maxima} caracteres`
      };
    }

    // Validar patrón
    if (tipoInfo.patron_validacion) {
      const patron = new RegExp(tipoInfo.patron_validacion);
      if (!patron.test(numeroLimpio)) {
        return {
          valid: false,
          message: `Formato de ${tipoInfo.codigo_interno} no válido`
        };
      }
    }

    return { valid: true, message: 'Documento válido' };
  };

  return {
    tiposDocumento,
    tiposDocumentoOptions,
    loading,
    error,
    getTipoDocumentoDianInfo,
    legacyToDianCode,
    dianToLegacyCode,
    validarDocumento,
  };
};

export default useTiposDocumentoDian;
