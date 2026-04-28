const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authResolvers = {
  Query: {
    /**
     * Obtener información del usuario autenticado actual
     * @param {Object} context - Contexto de GraphQL con user y pool
     * @returns {Object} Usuario actual
     */
    me: async (_, __, { user, pool }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        const result = await pool.query(
          `SELECT id, nombre, apellido, usuario, rol, email, telefono, foto_url, activo, created_at
           FROM usuarios
           WHERE id = $1 AND activo = true`,
          [user.id]
        );

        if (result.rows.length === 0) {
          throw new Error('Usuario no encontrado');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en me query:', error);
        throw new Error('Error al obtener información del usuario');
      }
    },
  },

  Mutation: {
    /**
     * Login con usuario y contraseña
     * @param {String} usuario - Nombre de usuario
     * @param {String} password - Contraseña
     * @returns {Object} Token JWT y datos del usuario
     */
    login: async (_, { usuario, password }, { pool }) => {
      try {
        // Buscar usuario activo
        const result = await pool.query(
          'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
          [usuario]
        );

        if (result.rows.length === 0) {
          throw new Error('Usuario o contraseña incorrectos');
        }

        const user = result.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
          throw new Error('Usuario o contraseña incorrectos');
        }

        // Generar token JWT
        const token = jwt.sign(
          {
            id: user.id,
            usuario: user.usuario,
            rol: user.rol,
          },
          process.env.JWT_SECRET || 'default_secret_key',
          { expiresIn: '24h' }
        );

        // Retornar token y usuario (sin password)
        return {
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            rol: user.rol,
            email: user.email,
            telefono: user.telefono,
            foto_url: user.foto_url,
            activo: user.activo,
            created_at: user.created_at,
          },
        };
      } catch (error) {
        console.error('Error en login:', error);
        throw error;
      }
    },

    /**
     * Login con PIN (acceso rápido)
     * @param {String} pin - PIN de 4-6 dígitos
     * @returns {Object} Token JWT y datos del usuario
     */
    loginPIN: async (_, { pin }, { pool }) => {
      try {
        // Validar formato de PIN
        if (!pin || pin.length < 4 || pin.length > 6) {
          throw new Error('PIN inválido');
        }

        // Buscar usuario por PIN
        const result = await pool.query(
          'SELECT * FROM usuarios WHERE pin = $1 AND activo = true',
          [pin]
        );

        if (result.rows.length === 0) {
          throw new Error('PIN incorrecto');
        }

        const user = result.rows[0];

        // Generar token JWT
        const token = jwt.sign(
          {
            id: user.id,
            usuario: user.usuario,
            rol: user.rol,
          },
          process.env.JWT_SECRET || 'default_secret_key',
          { expiresIn: '24h' }
        );

        // Retornar token y usuario (sin password)
        return {
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            rol: user.rol,
            email: user.email,
            telefono: user.telefono,
            foto_url: user.foto_url,
            activo: user.activo,
            created_at: user.created_at,
          },
        };
      } catch (error) {
        console.error('Error en loginPIN:', error);
        throw error;
      }
    },
  },

  // Field resolvers para Usuario
  Usuario: {
    nombre_completo: (parent) => {
      if (parent.apellido) {
        return `${parent.nombre} ${parent.apellido}`;
      }
      return parent.nombre;
    },
  },
};

module.exports = authResolvers;
