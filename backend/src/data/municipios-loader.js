/**
 * Módulo singleton para cargar y consultar municipios DANE desde el JSON.
 * Evita que los resolvers consulten una tabla `municipios_dane` que no existe.
 */
const fs = require('fs');
const path = require('path');

let municipiosDaneData = [];
let municipiosIndex = new Map(); // codigo → municipio (lookup rápido)

try {
  const municipiosPath = path.join(__dirname, 'municipios-dane.json');
  const municipiosRaw = fs.readFileSync(municipiosPath, 'utf8');
  municipiosDaneData = JSON.parse(municipiosRaw);

  // Construir índice por código DANE
  municipiosDaneData.forEach(m => {
    municipiosIndex.set(m.municipioDANE, m);
  });

  console.log(`✅ Cargados ${municipiosDaneData.length} municipios DANE en memoria`);
} catch (error) {
  console.error('⚠️ Error al cargar municipios DANE:', error.message);
}

/**
 * Validar que un código de municipio DANE existe
 * @param {string} codigo - Código DANE de 5 dígitos
 * @returns {boolean}
 */
function existeCodigoMunicipio(codigo) {
  return municipiosIndex.has(codigo);
}

/**
 * Obtener todos los municipios formateados para GraphQL
 * @returns {Array}
 */
function getMunicipiosFormateados() {
  return municipiosDaneData.map(m => ({
    codigo: m.municipioDANE,
    nombre: m.municipio,
    departamento: m.departamento,
    codigoDepartamento: m.departamentoDANE,
    region: m.region
  }));
}

module.exports = {
  existeCodigoMunicipio,
  getMunicipiosFormateados,
  municipiosDaneData
};
