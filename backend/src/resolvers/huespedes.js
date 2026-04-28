const { existeCodigoMunicipio } = require('../data/municipios-loader');

// ========== FUNCIONES DE VALIDACIÓN ==========

/**
 * Validar formato de documento según el tipo
 * @param {String} tipoDocumento - Tipo de documento (CC, CE, Pasaporte, NIT)
 * @param {String} numeroDocumento - Número de documento
 * @throws {Error} Si el formato es inválido
 */
function validarFormatoDocumento(tipoDocumento, numeroDocumento) {
  if (!numeroDocumento || !numeroDocumento.trim()) {
    throw new Error('El número de documento es obligatorio');
  }

  const numero = numeroDocumento.trim();

  switch (tipoDocumento) {
    case 'CC': // Cédula de Ciudadanía
      if (!/^\d{6,10}$/.test(numero)) {
        throw new Error('La Cédula de Ciudadanía debe tener entre 6 y 10 dígitos numéricos');
      }
      break;

    case 'CE': // Cédula de Extranjería
      if (!/^\d{5,7}$/.test(numero)) {
        throw new Error('La Cédula de Extranjería debe tener entre 5 y 7 dígitos numéricos');
      }
      break;

    case 'PA':       // Pasaporte (código corto)
    case 'Pasaporte': // Pasaporte (nombre completo - legacy)
      if (!/^[A-Z0-9]{6,9}$/i.test(numero)) {
        throw new Error('El Pasaporte debe tener entre 6 y 9 caracteres alfanuméricos');
      }
      break;

    case 'NIT':
      if (!/^\d{9,10}$/.test(numero.replace(/-/g, ''))) {
        throw new Error('El NIT debe tener 9 o 10 dígitos (sin contar el dígito de verificación)');
      }
      break;

    default:
      // Otros tipos de documento: validación genérica
      if (numero.length < 5 || numero.length > 20) {
        throw new Error('El número de documento debe tener entre 5 y 20 caracteres');
      }
  }
}

/**
 * Validar formato de email
 * @param {String} email - Email a validar
 * @throws {Error} Si el formato es inválido
 */
function validarEmail(email) {
  if (!email || !email.trim()) {
    return; // El email es opcional en algunos casos
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) {
    throw new Error('El formato del email es inválido');
  }
}

/**
 * Validar formato de teléfono colombiano
 * @param {String} telefono - Teléfono a validar
 * @throws {Error} Si el formato es inválido
 */
function validarTelefono(telefono) {
  if (!telefono || !telefono.trim()) {
    return; // El teléfono es opcional en algunos casos
  }

  const telefonoLimpio = telefono.replace(/[\s()-]/g, '');

  // Validar teléfonos colombianos:
  // Celulares: 10 dígitos, empiezan con 3
  // Fijos: 7 dígitos (sin código de área) o 10 dígitos (con código de área)
  if (!/^3\d{9}$/.test(telefonoLimpio) && !/^\d{7}$/.test(telefonoLimpio) && !/^[1-8]\d{6,9}$/.test(telefonoLimpio)) {
    throw new Error('El teléfono debe ser un número colombiano válido (celular: 10 dígitos iniciando con 3, fijo: 7 dígitos)');
  }
}

// ========== RESOLVERS ==========

const huespedesResolvers = {
  Query: {
    /**
     * Obtener todos los clientes con filtros opcionales
     * @param {String} busqueda - Búsqueda por nombre, apellido o documento
     * @param {Boolean} activo - Filtro por estado activo
     * @returns {Array} Lista de clientes
     */
    clientes: async (_, { busqueda, activo }, { pool }) => {
      try {
        let query = 'SELECT * FROM clientes WHERE 1=1';
        const params = [];

        if (activo !== undefined) {
          params.push(activo);
          query += ` AND activo = $${params.length}`;
        }

        if (busqueda) {
          params.push(`%${busqueda}%`);
          query += ` AND (nombre ILIKE $${params.length} OR apellido ILIKE $${params.length} OR numero_documento ILIKE $${params.length})`;
        }

        query += ' ORDER BY nombre, apellido';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en clientes query:', error);
        throw new Error('Error al obtener clientes');
      }
    },

    /**
     * Obtener un cliente por ID
     * @param {Number} id - ID del cliente
     * @returns {Object} Cliente
     */
    cliente: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM clientes WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en cliente query:', error);
        throw error;
      }
    },

    /**
     * Obtener todos los huéspedes
     * @returns {Array} Lista de huéspedes
     */
    huespedes: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT h.*,
                 c.nombre as cliente_nombre,
                 c.apellido as cliente_apellido
          FROM huespedes h
          JOIN clientes c ON c.id = h.cliente_id
          ORDER BY h.created_at DESC
        `);

        return result.rows;
      } catch (error) {
        console.error('Error en huespedes query:', error);
        throw new Error('Error al obtener huéspedes');
      }
    },

    /**
     * Obtener un huésped por ID
     * @param {Number} id - ID del huésped
     * @returns {Object} Huésped
     */
    huesped: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM huespedes WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Huésped no encontrado');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en huesped query:', error);
        throw error;
      }
    },

    /**
     * Obtener un huésped por número de documento
     * @param {String} numero_documento - Número de documento
     * @returns {Object} Huésped
     */
    huespedPorDocumento: async (_, { numero_documento }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM huespedes WHERE numero_documento = $1',
          [numero_documento]
        );

        if (result.rows.length === 0) {
          return null; // Retornar null en lugar de error para permitir crear nuevo
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en huespedPorDocumento query:', error);
        throw new Error('Error al buscar huésped por documento');
      }
    },

    /**
     * Obtener todos los huéspedes de un cliente
     * @param {Int} cliente_id - ID del cliente
     * @returns {Array} Lista de huéspedes del cliente
     */
    huespedesDelCliente: async (_, { cliente_id }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT h.*,
                  CONCAT(h.nombre, ' ', COALESCE(h.apellido, '')) as nombre_completo
           FROM huespedes h
           LEFT JOIN clientes c ON h.cliente_id = c.id
           WHERE h.cliente_id = $1
           ORDER BY h.created_at DESC`,
          [cliente_id]
        );
        return result.rows;
      } catch (error) {
        console.error('Error al obtener huéspedes del cliente:', error);
        throw new Error('Error al obtener huéspedes del cliente');
      }
    },
  },

  Mutation: {
    /**
     * Crear un nuevo cliente
     * @param {Object} input - Datos del cliente
     * @returns {Object} Cliente creado
     */
    crearCliente: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // VALIDACIONES DE DATOS PERSONALES
        const tipoDoc = input.tipo_documento || 'CC';

        // ============ VALIDACIÓN CRÍTICA: Asegurar tipo_documento_dian ============
        const mapeoLegacyToDian = {
          'CC': 13, 'CE': 22, 'TI': 12, 'RC': 11, 'NIT': 31, 'PA': 41,
          'Pasaporte': 41, 'Otro': 43
        };
        const CODIGOS_DIAN_VALIDOS = [11, 12, 13, 21, 22, 31, 41, 42, 43, 44, 50, 91];

        let codigoDian = input.tipo_documento_dian;

        // Si viene tipo_documento_dian, asegurar que sea un entero válido
        if (codigoDian !== undefined && codigoDian !== null) {
          codigoDian = parseInt(codigoDian);
        }

        // Si no viene o no es válido, calcularlo desde tipo_documento
        if (!codigoDian || !CODIGOS_DIAN_VALIDOS.includes(codigoDian)) {
          codigoDian = mapeoLegacyToDian[tipoDoc] || 13;
        }

        // Validación final: asegurar que el código existe en tipos_documento_dian
        if (!CODIGOS_DIAN_VALIDOS.includes(codigoDian)) {
          throw new Error(`Tipo de documento DIAN inválido (código ${codigoDian}). Tipos válidos: CC, CE, TI, RC, NIT, PA.`);
        }

        // Validar formato de documento
        if (input.numero_documento) {
          validarFormatoDocumento(tipoDoc, input.numero_documento);
        }

        // Validar email
        if (input.email) {
          validarEmail(input.email);
        }

        // Validar teléfono
        if (input.telefono) {
          validarTelefono(input.telefono);
        }

        // ============ VALIDACIÓN OBLIGATORIA: Código Municipio DANE ============
        // Validar que se proporcione el código de municipio (OBLIGATORIO)
        if (!input.codigo_municipio) {
          throw new Error('El código de municipio DANE es obligatorio para crear un cliente');
        }

        // Validar formato del código municipio (debe ser 5 dígitos numéricos)
        if (!/^\d{5}$/.test(input.codigo_municipio)) {
          throw new Error('El código de municipio DANE debe tener exactamente 5 dígitos numéricos');
        }

        // Validar que el código municipio exista en los datos de municipios DANE
        if (!existeCodigoMunicipio(input.codigo_municipio)) {
          throw new Error(`El código de municipio DANE '${input.codigo_municipio}' no es válido. Por favor seleccione un municipio de la lista.`);
        }

        // Verificar si ya existe un cliente con el mismo documento
        if (input.numero_documento) {
          const existente = await pool.query(
            'SELECT id FROM clientes WHERE numero_documento = $1 AND tipo_documento = $2',
            [input.numero_documento, tipoDoc]
          );

          if (existente.rows.length > 0) {
            throw new Error(`Ya existe un cliente con el documento ${tipoDoc} ${input.numero_documento}`);
          }
        }

        // Insertar cliente con campos DIAN (tipo_documento_dian GARANTIZADO como INT válido)
        const result = await pool.query(
          `INSERT INTO clientes (
            nombre, apellido, tipo_documento, tipo_documento_dian, numero_documento,
            digito_verificacion, telefono, email, direccion, ciudad, codigo_municipio,
            pais, fecha_nacimiento, regimen_tributario, responsable_iva, observaciones
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            input.nombre,
            input.apellido || null,
            tipoDoc,
            codigoDian,  // ✅ SIEMPRE será un INT válido que existe en tipos_documento_dian
            input.numero_documento || null,
            input.digito_verificacion || null,
            input.telefono || null,
            input.email || null,
            input.direccion || null,
            input.ciudad || null,
            input.codigo_municipio || null,
            input.pais || 'Colombia',
            input.fecha_nacimiento || null,
            input.regimen_tributario || null,
            input.responsable_iva || false,
            input.observaciones || null,
          ]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en crearCliente mutation:', error);
        throw error;
      }
    },

    /**
     * Actualizar un cliente existente
     * @param {Number} id - ID del cliente
     * @param {Object} input - Datos a actualizar
     * @returns {Object} Cliente actualizado
     */
    actualizarCliente: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que el cliente existe
        const cliente = await pool.query(
          'SELECT * FROM clientes WHERE id = $1',
          [id]
        );

        if (cliente.rows.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        // VALIDACIÓN: Verificar que no se intente cambiar numero_documento (campo inmutable)
        if (input.numero_documento) {
          const documentoActual = cliente.rows[0].numero_documento;
          if (documentoActual && input.numero_documento !== documentoActual) {
            throw new Error(
              'No se puede modificar el número de documento de un cliente existente. ' +
              'Este campo es inmutable por razones de integridad de datos.'
            );
          }
        }

        // ============ VALIDACIÓN: Asegurar tipo_documento_dian si se proporciona ============
        const mapeoLegacyToDian = {
          'CC': 13, 'CE': 22, 'TI': 12, 'RC': 11, 'NIT': 31, 'PA': 41,
          'Pasaporte': 41, 'Otro': 43
        };
        const CODIGOS_DIAN_VALIDOS = [11, 12, 13, 21, 22, 31, 41, 42, 43, 44, 50, 91];

        let codigoDian = input.tipo_documento_dian;

        if (codigoDian !== undefined && codigoDian !== null) {
          codigoDian = parseInt(codigoDian);
        }

        if (input.tipo_documento || input.tipo_documento_dian) {
          const tipoDoc = input.tipo_documento || cliente.rows[0].tipo_documento || 'CC';

          if (!codigoDian || !CODIGOS_DIAN_VALIDOS.includes(codigoDian)) {
            codigoDian = mapeoLegacyToDian[tipoDoc] || 13;
          }

          if (!CODIGOS_DIAN_VALIDOS.includes(codigoDian)) {
            throw new Error(`Tipo de documento DIAN inválido (código ${codigoDian}). Tipos válidos: CC, CE, TI, RC, NIT, PA.`);
          }
        }

        // Si se actualiza el documento, verificar que no exista otro cliente con ese documento
        if (input.numero_documento && input.numero_documento !== cliente.rows[0].numero_documento) {
          const existente = await pool.query(
            'SELECT id FROM clientes WHERE numero_documento = $1 AND tipo_documento = $2 AND id != $3',
            [input.numero_documento, input.tipo_documento || cliente.rows[0].tipo_documento, id]
          );

          if (existente.rows.length > 0) {
            throw new Error(`Ya existe otro cliente con el documento ${input.tipo_documento || cliente.rows[0].tipo_documento} ${input.numero_documento}`);
          }
        }

        // ============ VALIDACIÓN OBLIGATORIA: Código Municipio DANE en actualización ============
        const codigoMunicipio = input.codigo_municipio || cliente.rows[0].codigo_municipio;

        // Validar que haya código municipio (nuevo o existente)
        if (!codigoMunicipio) {
          throw new Error('El código de municipio DANE es obligatorio. Por favor proporcione un código de municipio válido.');
        }

        // Validar formato del código municipio si se proporciona uno nuevo
        if (input.codigo_municipio && !/^\d{5}$/.test(input.codigo_municipio)) {
          throw new Error('El código de municipio DANE debe tener exactamente 5 dígitos numéricos');
        }

        // Validar que el código municipio exista en los datos de municipios DANE
        if (input.codigo_municipio && !existeCodigoMunicipio(input.codigo_municipio)) {
          throw new Error(`El código de municipio DANE '${input.codigo_municipio}' no es válido. Por favor seleccione un municipio de la lista.`);
        }

        // Actualizar cliente con todos los campos DIAN
        const result = await pool.query(
          `UPDATE clientes SET
            nombre = COALESCE($1, nombre),
            apellido = $2,
            tipo_documento = COALESCE($3, tipo_documento),
            tipo_documento_dian = COALESCE($4, tipo_documento_dian),
            numero_documento = COALESCE($5, numero_documento),
            digito_verificacion = $6,
            telefono = $7,
            email = $8,
            direccion = $9,
            ciudad = $10,
            codigo_municipio = $11,
            pais = COALESCE($12, pais),
            fecha_nacimiento = $13,
            regimen_tributario = $14,
            responsable_iva = COALESCE($15, responsable_iva),
            observaciones = $16,
            activo = COALESCE($17, activo),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $18
          RETURNING *`,
          [
            input.nombre,
            input.apellido || null,
            input.tipo_documento,
            codigoDian || null,
            input.numero_documento,
            input.digito_verificacion || null,
            input.telefono || null,
            input.email || null,
            input.direccion || null,
            input.ciudad || null,
            input.codigo_municipio || null,
            input.pais,
            input.fecha_nacimiento || null,
            input.regimen_tributario || null,
            input.responsable_iva,
            input.observaciones || null,
            input.activo,
            id,
          ]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en actualizarCliente mutation:', error);
        throw error;
      }
    },

    /**
     * Eliminar (soft delete) un cliente
     * @param {Number} id - ID del cliente
     * @returns {Boolean} true si se eliminó correctamente
     */
    eliminarCliente: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que no tenga huéspedes registrados
        const huespedesActivos = await pool.query(
          'SELECT COUNT(*) FROM huespedes WHERE cliente_id = $1',
          [id]
        );

        if (parseInt(huespedesActivos.rows[0].count) > 0) {
          throw new Error('No se puede eliminar un cliente con huéspedes registrados');
        }

        // Soft delete
        const result = await pool.query(
          'UPDATE clientes SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        return true;
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        throw error;
      }
    },

    /**
     * Crear un nuevo huésped (extiende información de cliente)
     * @param {Object} input - Datos del huésped
     * @returns {Object} Huésped creado
     */
    crearHuesped: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // VALIDACIONES DE DATOS PERSONALES
        // Validar formato de documento
        validarFormatoDocumento(input.tipo_documento, input.numero_documento);

        // Validar email
        if (input.email) {
          validarEmail(input.email);
        }

        // Validar teléfono
        if (input.telefono) {
          validarTelefono(input.telefono);
        }

        // Validar teléfono de emergencia
        if (input.telefono_emergencia) {
          validarTelefono(input.telefono_emergencia);
        }

        // Verificar que el cliente existe
        const cliente = await pool.query(
          'SELECT id FROM clientes WHERE id = $1',
          [input.cliente_id]
        );

        if (cliente.rows.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        // Verificar que no exista otro huésped con el mismo documento
        const existente = await pool.query(
          'SELECT id FROM huespedes WHERE numero_documento = $1',
          [input.numero_documento]
        );

        if (existente.rows.length > 0) {
          throw new Error(`Ya existe un huésped registrado con el documento ${input.numero_documento}`);
        }

        // Insertar huésped
        const result = await pool.query(
          `INSERT INTO huespedes (
            cliente_id, nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento,
            nacionalidad, telefono, email, direccion, ciudad, pais,
            contacto_emergencia, telefono_emergencia, observaciones, preferencias,
            lugar_residencia, lugar_procedencia, motivo_viaje
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING *`,
          [
            input.cliente_id,
            input.nombre,
            input.apellido || null,
            input.tipo_documento,
            input.numero_documento,
            input.fecha_nacimiento || null,
            input.nacionalidad || 'Colombiana',
            input.telefono || null,
            input.email || null,
            input.direccion || null,
            input.ciudad || null,
            input.pais || 'Colombia',
            input.contacto_emergencia || null,
            input.telefono_emergencia || null,
            input.observaciones || null,
            input.preferencias || '{}',
            input.lugar_residencia || null,
            input.lugar_procedencia || null,
            input.motivo_viaje || null,
          ]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en crearHuesped mutation:', error);
        throw error;
      }
    },

    /**
     * Actualizar un huésped existente
     * @param {Number} id - ID del huésped
     * @param {Object} input - Datos a actualizar
     * @returns {Object} Huésped actualizado
     */
    actualizarHuesped: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que el huésped existe
        const huesped = await pool.query(
          'SELECT * FROM huespedes WHERE id = $1',
          [id]
        );

        if (huesped.rows.length === 0) {
          throw new Error('Huésped no encontrado');
        }

        // Si se actualiza el documento, verificar que no exista otro huésped con ese documento
        if (input.numero_documento && input.numero_documento !== huesped.rows[0].numero_documento) {
          const existente = await pool.query(
            'SELECT id FROM huespedes WHERE numero_documento = $1 AND id != $2',
            [input.numero_documento, id]
          );

          if (existente.rows.length > 0) {
            throw new Error(`Ya existe otro huésped con el documento ${input.numero_documento}`);
          }
        }

        // Actualizar huésped
        const result = await pool.query(
          `UPDATE huespedes SET
            cliente_id = $1,
            tipo_documento = $2,
            numero_documento = $3,
            fecha_nacimiento = $4,
            nacionalidad = $5,
            telefono = $6,
            email = $7,
            direccion = $8,
            ciudad = $9,
            pais = $10,
            contacto_emergencia = $11,
            telefono_emergencia = $12,
            observaciones = $13,
            preferencias = $14,
            lugar_residencia = $15,
            lugar_procedencia = $16,
            motivo_viaje = $17,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $18
          RETURNING *`,
          [
            input.cliente_id,
            input.tipo_documento,
            input.numero_documento,
            input.fecha_nacimiento || null,
            input.nacionalidad || 'Colombiana',
            input.telefono || null,
            input.email || null,
            input.direccion || null,
            input.ciudad || null,
            input.pais || 'Colombia',
            input.contacto_emergencia || null,
            input.telefono_emergencia || null,
            input.observaciones || null,
            input.preferencias || '{}',
            input.lugar_residencia || null,
            input.lugar_procedencia || null,
            input.motivo_viaje || null,
            id,
          ]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en actualizarHuesped mutation:', error);
        throw error;
      }
    },
  },

  // Resolvers de campos
  Huesped: {
    /**
     * Resolver de campo para nombre_completo
     * Construye el nombre completo desde los campos nombre y apellido del huésped
     */
    nombre_completo: (parent) => {
      // Si ya viene nombre_completo del query, usarlo
      if (parent.nombre_completo) {
        return parent.nombre_completo;
      }
      // Construir desde los campos nombre y apellido del HUÉSPED
      const nombre = parent.nombre || '';
      const apellido = parent.apellido || '';
      return `${nombre} ${apellido}`.trim() || null;
    }
  },

  // Field Resolvers para Cliente
  Cliente: {
    /**
     * Resolver para obtener los huéspedes de un cliente
     */
    huespedes: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT h.*,
                  CONCAT(h.nombre, ' ', COALESCE(h.apellido, '')) as nombre_completo
           FROM huespedes h
           WHERE h.cliente_id = $1
           ORDER BY h.created_at DESC`,
          [parent.id]
        );
        return result.rows;
      } catch (error) {
        console.error('Error al obtener huéspedes del cliente:', error);
        return [];
      }
    }
  }
};

module.exports = huespedesResolvers;
