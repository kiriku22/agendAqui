import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Users, Loader, AlertCircle, CheckCircle, Plus, Edit2, Trash2, Key, Mail, Phone } from 'lucide-react';
import {
  GET_USUARIOS,
  CREATE_USUARIO,
  UPDATE_USUARIO,
  CAMBIAR_PASSWORD_USUARIO,
  DESACTIVAR_USUARIO
} from '../../graphql/configuracion';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmModal from '../shared/ConfirmModal';
import './ModalConfig.css';

function ModalUsuarios({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalPassword, setModalPassword] = useState(null);
  const [nuevoPassword, setNuevoPassword] = useState('');
  const { state: confirmState, confirm, execute, close } = useConfirmation();

  // Query para obtener usuarios
  const { data, loading, error, refetch } = useQuery(GET_USUARIOS);

  // Mutations
  const [crearUsuario] = useMutation(CREATE_USUARIO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Usuario creado exitosamente' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [actualizarUsuario] = useMutation(UPDATE_USUARIO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Usuario actualizado' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [cambiarPassword] = useMutation(CAMBIAR_PASSWORD_USUARIO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Contraseña actualizada' });
      setModalPassword(null);
      setNuevoPassword('');
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [desactivarUsuario] = useMutation(DESACTIVAR_USUARIO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Usuario desactivado' });
      refetch();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modoEdicion === 'crear') {
      const { usuario, nombre, apellido, email, password, pin, rol, telefono, activo } = formData;

      if (!password && !pin) {
        setMensaje({ tipo: 'error', texto: 'Debe proporcionar password o PIN' });
        return;
      }

      await crearUsuario({
        variables: {
          input: {
            usuario,
            nombre: nombre || null,
            apellido: apellido || null,
            email: email || null,
            password: password || null,
            pin: pin || null,
            rol: rol || 'recepcionista',
            telefono: telefono || null,
            activo: activo !== undefined ? activo : true
          }
        }
      });
    } else if (modoEdicion?.tipo === 'editar') {
      const { __typename, id, created_at, password, pin, ...input } = formData;

      await actualizarUsuario({
        variables: { id: parseInt(id), input }
      });
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();

    if (!nuevoPassword || nuevoPassword.length < 4) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 4 caracteres' });
      return;
    }

    await cambiarPassword({
      variables: {
        id: parseInt(modalPassword.id),
        password: nuevoPassword
      }
    });
  };

  const handleDesactivar = (id) => {
    confirm(
      async () => {
        await desactivarUsuario({ variables: { id: parseInt(id) } });
        refetch();
      },
      {
        title: 'Desactivar Usuario',
        message: '¿Está seguro de desactivar este usuario? No podrá acceder al sistema hasta que sea reactivado.',
        variant: 'warning',
        confirmText: 'Desactivar',
        cancelText: 'Cancelar'
      }
    );
  };

  const abrirFormularioCrear = () => {
    setFormData({
      usuario: '',
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      pin: '',
      rol: 'recepcionista',
      telefono: '',
      activo: true
    });
    setModoEdicion('crear');
  };

  const abrirFormularioEditar = (usuario) => {
    setFormData(usuario);
    setModoEdicion({ tipo: 'editar', data: usuario });
  };

  const cerrarFormulario = () => {
    setFormData({});
    setModoEdicion(null);
    setTimeout(() => setMensaje(null), 3000);
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config modal-config--xlarge" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando usuarios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config modal-config--xlarge" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} color="#ef4444" />
            <p style={{ marginTop: '1rem', color: '#ef4444' }}>Error: {error.message}</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usuarios = data?.usuarios || [];

  const getRolBadgeColor = (rol) => {
    const colors = {
      admin: 'danger',
      gerente: 'warning',
      recepcionista: 'info',
      limpieza: 'success',
      mantenimiento: 'secondary'
    };
    return colors[rol] || 'info';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Users size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-config__title">Usuarios y Roles</h2>
            <p className="modal-config__subtitle">Gestionar usuarios, permisos y contraseñas</p>
          </div>
          {!modoEdicion && (
            <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginRight: '3rem' }}>
              <Plus size={16} />
              <span>Nuevo Usuario</span>
            </button>
          )}
          <button onClick={onClose} className="modal-config__close">
            <X size={20} />
          </button>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div className={`alert alert--${mensaje.tipo}`}>
            {mensaje.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Contenido */}
        <div className="modal-config__form">
          {modoEdicion ? (
            // Formulario de Creación/Edición
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-section">
                  <h3 className="form-section__title">Información de Acceso</h3>

                  <div className="form-field">
                    <label htmlFor="usuario">Usuario *</label>
                    <input
                      type="text"
                      id="usuario"
                      name="usuario"
                      value={formData.usuario || ''}
                      onChange={handleChange}
                      required
                      disabled={modoEdicion?.tipo === 'editar'}
                    />
                  </div>

                  {modoEdicion === 'crear' && (
                    <>
                      <div className="form-field">
                        <label htmlFor="password">Password</label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password || ''}
                          onChange={handleChange}
                          placeholder="Mínimo 4 caracteres"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="pin">PIN (alternativo)</label>
                        <input
                          type="text"
                          id="pin"
                          name="pin"
                          value={formData.pin || ''}
                          onChange={handleChange}
                          placeholder="4-6 dígitos"
                          maxLength="6"
                        />
                        <small className="form-field__help">
                          Puede usar password o PIN para acceder
                        </small>
                      </div>
                    </>
                  )}

                  <div className="form-field">
                    <label htmlFor="rol">Rol *</label>
                    <select
                      id="rol"
                      name="rol"
                      value={formData.rol || 'recepcionista'}
                      onChange={handleChange}
                      required
                    >
                      <option value="admin">Administrador</option>
                      <option value="gerente">Gerente</option>
                      <option value="recepcionista">Recepcionista</option>
                      <option value="limpieza">Limpieza</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </div>

                  <div className="form-checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="activo"
                        checked={formData.activo || false}
                        onChange={handleChange}
                      />
                      <span>Usuario Activo</span>
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section__title">Información Personal</h3>

                  <div className="form-field">
                    <label htmlFor="nombre">Nombre</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre || ''}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="apellido">Apellido</label>
                    <input
                      type="text"
                      id="apellido"
                      name="apellido"
                      value={formData.apellido || ''}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="telefono">Teléfono</label>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-config__footer">
                <button type="button" onClick={cerrarFormulario} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {modoEdicion === 'crear' ? 'Crear Usuario' : 'Actualizar Usuario'}
                </button>
              </div>
            </form>
          ) : (
            // Tabla de Usuarios
            <>
              {usuarios.length === 0 ? (
                <div className="empty-state">
                  <Users size={64} />
                  <h3>No hay usuarios</h3>
                  <p>Crea el primer usuario para comenzar</p>
                  <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginTop: '1rem' }}>
                    <Plus size={16} />
                    <span>Crear Primer Usuario</span>
                  </button>
                </div>
              ) : (
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombre Completo</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th style={{ width: '180px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(usuario => (
                      <tr key={usuario.id}>
                        <td style={{ fontWeight: 600, color: '#1f2937' }}>{usuario.usuario}</td>
                        <td>{[usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || '-'}</td>
                        <td>
                          {usuario.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280' }}>
                              <Mail size={14} />
                              <span>{usuario.email}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {usuario.telefono ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280' }}>
                              <Phone size={14} />
                              <span>{usuario.telefono}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          <span className={`badge badge--${getRolBadgeColor(usuario.rol)}`}>
                            {usuario.rol}
                          </span>
                        </td>
                        <td>
                          {usuario.activo ? (
                            <span className="badge badge--success">Activo</span>
                          ) : (
                            <span className="badge badge--danger">Inactivo</span>
                          )}
                        </td>
                        <td>
                          <div className="config-table__actions">
                            <button
                              onClick={() => abrirFormularioEditar(usuario)}
                              className="config-table__btn config-table__btn--edit"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setModalPassword(usuario)}
                              className="config-table__btn"
                              style={{ color: '#f59e0b' }}
                              title="Cambiar Contraseña"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              onClick={() => handleDesactivar(usuario.id)}
                              className="config-table__btn config-table__btn--delete"
                              title="Desactivar"
                              disabled={!usuario.activo}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!modoEdicion && (
          <div className="modal-config__footer">
            <button onClick={onClose} className="btn-primary">
              Cerrar
            </button>
          </div>
        )}

        {/* Modal Cambiar Contraseña */}
        {modalPassword && (
          <div className="modal-overlay" onClick={() => setModalPassword(null)}>
            <div
              className="modal-config"
              style={{ maxWidth: '400px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-config__header">
                <div className="modal-config__header-icon">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="modal-config__title" style={{ fontSize: '1.25rem' }}>Cambiar Contraseña</h2>
                  <p className="modal-config__subtitle">Usuario: {modalPassword.usuario}</p>
                </div>
                <button onClick={() => setModalPassword(null)} className="modal-config__close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCambiarPassword} style={{ padding: '1.5rem' }}>
                <div className="form-field">
                  <label htmlFor="nuevo_password">Nueva Contraseña *</label>
                  <input
                    type="password"
                    id="nuevo_password"
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    required
                    placeholder="Mínimo 4 caracteres"
                    autoFocus
                  />
                </div>

                <div className="modal-config__footer" style={{ marginTop: '1rem' }}>
                  <button type="button" onClick={() => setModalPassword(null)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Cambiar Contraseña
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        {...confirmState}
        onConfirm={execute}
        onClose={close}
      />
    </div>
  );
}

export default ModalUsuarios;
