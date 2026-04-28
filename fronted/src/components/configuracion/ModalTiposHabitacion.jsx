import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Bed, Loader, AlertCircle, CheckCircle, Plus, Edit2, Trash2, Users } from 'lucide-react';
import {
  GET_TIPOS_HABITACION_CONFIG,
  CREATE_TIPO_HABITACION_CONFIG,
  UPDATE_TIPO_HABITACION_CONFIG,
  DELETE_TIPO_HABITACION_CONFIG
} from '../../graphql/configuracion';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmModal from '../shared/ConfirmModal';
import './ModalConfig.css';

function ModalTiposHabitacion({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(null); // null | 'crear' | { tipo: 'editar', data: {...} }
  const [formData, setFormData] = useState({});
  const { state: confirmState, confirm, execute, close } = useConfirmation();

  // Query para obtener tipos de habitación
  const { data, loading, error, refetch } = useQuery(GET_TIPOS_HABITACION_CONFIG);

  // Mutations
  const [crearTipo] = useMutation(CREATE_TIPO_HABITACION_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Tipo de habitación creado exitosamente' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [actualizarTipo] = useMutation(UPDATE_TIPO_HABITACION_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Tipo de habitación actualizado' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [eliminarTipo] = useMutation(DELETE_TIPO_HABITACION_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Tipo de habitación eliminado' });
      refetch();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modoEdicion === 'crear') {
      const { codigo, nombre, precio_base, descripcion, capacidad_adultos, capacidad_ninos, metros_cuadrados, orden, activo } = formData;

      await crearTipo({
        variables: {
          input: {
            codigo,
            nombre,
            precio_base,
            descripcion: descripcion || null,
            capacidad_adultos: capacidad_adultos || 2,
            capacidad_ninos: capacidad_ninos || 0,
            metros_cuadrados: metros_cuadrados || null,
            orden: orden || 1,
            activo: activo !== undefined ? activo : true
          }
        }
      });
    } else if (modoEdicion?.tipo === 'editar') {
      const { __typename, id, created_at, updated_at, codigo, ...input } = formData;

      await actualizarTipo({
        variables: { codigo, input }
      });
    }
  };

  const handleEliminar = (codigo) => {
    confirm(
      async () => {
        await eliminarTipo({ variables: { codigo } });
        refetch();
      },
      {
        title: 'Eliminar Tipo de Habitación',
        message: '¿Está seguro de eliminar este tipo de habitación? Esta acción no se puede deshacer.',
        variant: 'danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    );
  };

  const abrirFormularioCrear = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      capacidad_adultos: 2,
      capacidad_ninos: 0,
      precio_base: 0,
      metros_cuadrados: 0,
      orden: 1,
      activo: true
    });
    setModoEdicion('crear');
  };

  const abrirFormularioEditar = (tipo) => {
    setFormData(tipo);
    setModoEdicion({ tipo: 'editar', data: tipo });
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
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando tipos de habitación...</p>
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

  const tipos = data?.tiposHabitacionConfig || [];

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Bed size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-config__title">Tipos de Habitación</h2>
            <p className="modal-config__subtitle">Gestionar catálogo de tipos, capacidades y precios base</p>
          </div>
          {!modoEdicion && (
            <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginRight: '2rem' }}>
              <Plus size={16} />
              <span>Nuevo Tipo</span>
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
                  <h3 className="form-section__title">Información Básica</h3>

                  <div className="form-field">
                    <label htmlFor="codigo">Código *</label>
                    <input
                      type="text"
                      id="codigo"
                      name="codigo"
                      value={formData.codigo || ''}
                      onChange={handleChange}
                      required
                      disabled={modoEdicion?.tipo === 'editar'}
                      placeholder="Ej: SGL, DBL, STE"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="nombre">Nombre *</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre || ''}
                      onChange={handleChange}
                      required
                      placeholder="Ej: Habitación Sencilla"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      value={formData.descripcion || ''}
                      onChange={handleChange}
                      placeholder="Descripción del tipo de habitación"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="precio_base">Precio Base (COP) *</label>
                    <input
                      type="number"
                      id="precio_base"
                      name="precio_base"
                      value={formData.precio_base || ''}
                      onChange={handleChange}
                      required
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section__title">Capacidad y Características</h3>

                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="capacidad_adultos">Capacidad Adultos</label>
                      <input
                        type="number"
                        id="capacidad_adultos"
                        name="capacidad_adultos"
                        value={formData.capacidad_adultos || ''}
                        onChange={handleChange}
                        min="1"
                        max="10"
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="capacidad_ninos">Capacidad Niños</label>
                      <input
                        type="number"
                        id="capacidad_ninos"
                        name="capacidad_ninos"
                        value={formData.capacidad_ninos || ''}
                        onChange={handleChange}
                        min="0"
                        max="10"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="metros_cuadrados">Metros Cuadrados</label>
                    <input
                      type="number"
                      id="metros_cuadrados"
                      name="metros_cuadrados"
                      value={formData.metros_cuadrados || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="orden">Orden de Visualización</label>
                    <input
                      type="number"
                      id="orden"
                      name="orden"
                      value={formData.orden || ''}
                      onChange={handleChange}
                      min="1"
                    />
                  </div>

                  <div className="form-checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="activo"
                        checked={formData.activo || false}
                        onChange={handleChange}
                      />
                      <span>Activo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-config__footer">
                <button type="button" onClick={cerrarFormulario} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {modoEdicion === 'crear' ? 'Crear Tipo' : 'Actualizar Tipo'}
                </button>
              </div>
            </form>
          ) : (
            // Tabla de Tipos
            <>
              {tipos.length === 0 ? (
                <div className="empty-state">
                  <Bed size={64} />
                  <h3>No hay tipos de habitación</h3>
                  <p>Crea el primer tipo de habitación para comenzar</p>
                  <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginTop: '1rem' }}>
                    <Plus size={16} />
                    <span>Crear Primer Tipo</span>
                  </button>
                </div>
              ) : (
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Capacidad</th>
                      <th>Precio Base</th>
                      <th>m²</th>
                      <th>Orden</th>
                      <th>Estado</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipos.map(tipo => (
                      <tr key={tipo.codigo}>
                        <td>
                          <code style={{
                            background: '#f3f4f6',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#1f2937'
                          }}>
                            {tipo.codigo}
                          </code>
                        </td>
                        <td style={{ fontWeight: 600 }}>{tipo.nombre}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={14} />
                            <span>{tipo.capacidad_adultos} adultos</span>
                            {tipo.capacidad_ninos > 0 && (
                              <span style={{ color: '#6b7280' }}>+ {tipo.capacidad_ninos} niños</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>
                          ${tipo.precio_base?.toLocaleString('es-CO')}
                        </td>
                        <td>{tipo.metros_cuadrados || '-'}</td>
                        <td>{tipo.orden}</td>
                        <td>
                          {tipo.activo ? (
                            <span className="badge badge--success">Activo</span>
                          ) : (
                            <span className="badge badge--danger">Inactivo</span>
                          )}
                        </td>
                        <td>
                          <div className="config-table__actions">
                            <button
                              onClick={() => abrirFormularioEditar(tipo)}
                              className="config-table__btn config-table__btn--edit"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleEliminar(tipo.codigo)}
                              className="config-table__btn config-table__btn--delete"
                              title="Eliminar"
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
      </div>

      <ConfirmModal
        {...confirmState}
        onConfirm={execute}
        onClose={close}
      />
    </div>
  );
}

export default ModalTiposHabitacion;
