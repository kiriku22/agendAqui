const pool = require('../config/database');

const tiposDocumentoDianResolvers = {
  Query: {
    /**
     * Obtener todos los tipos de documento DIAN
     */
    tiposDocumentoDian: async (_, { activo }) => {
      try {
        let query = 'SELECT * FROM tipos_documento_dian';
        const params = [];

        if (activo !== undefined) {
          query += ' WHERE activo = $1';
          params.push(activo);
        }

        query += ' ORDER BY codigo_dian';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error al obtener tipos de documento DIAN:', error);
        throw new Error('Error al obtener los tipos de documento DIAN');
      }
    },

    /**
     * Obtener un tipo de documento DIAN por código
     */
    tipoDocumentoDian: async (_, { codigo_dian }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM tipos_documento_dian WHERE codigo_dian = $1',
          [codigo_dian]
        );

        if (result.rows.length === 0) {
          throw new Error(`No se encontró el tipo de documento DIAN con código ${codigo_dian}`);
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error al obtener tipo de documento DIAN:', error);
        throw error;
      }
    }
  }
};

module.exports = tiposDocumentoDianResolvers;
