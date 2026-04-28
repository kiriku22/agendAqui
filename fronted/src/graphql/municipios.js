import { gql } from '@apollo/client';

/**
 * Query para obtener todos los municipios DANE de Colombia
 * Total: 1,122 municipios con códigos DIVIPOLA
 */
export const GET_MUNICIPIOS_DANE = gql`
  query MunicipiosDane {
    municipiosDane {
      codigo
      nombre
      departamento
      codigoDepartamento
      region
    }
  }
`;
