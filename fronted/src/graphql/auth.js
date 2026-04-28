import { gql } from '@apollo/client';

// ============================================================================
// QUERIES
// ============================================================================

export const ME = gql`
  query Me {
    me {
      id
      nombre
      apellido
      usuario
      rol
      email
      telefono
      foto_url
      activo
      created_at
      permisos_efectivos
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const LOGIN = gql`
  mutation Login($usuario: String!, $password: String!) {
    login(usuario: $usuario, password: $password) {
      token
      user {
        id
        nombre
        apellido
        usuario
        rol
        email
        telefono
        foto_url
      }
    }
  }
`;

export const LOGIN_PIN = gql`
  mutation LoginPIN($pin: String!) {
    loginPIN(pin: $pin) {
      token
      user {
        id
        nombre
        apellido
        usuario
        rol
        email
        telefono
        foto_url
      }
    }
  }
`;
