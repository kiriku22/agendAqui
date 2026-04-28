import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Share2, Loader, AlertCircle, CheckCircle, Plus, Edit2, Trash2, Percent } from 'lucide-react';
import {
  GET_CANALES_RESERVA_CONFIG,
  CREATE_CANAL_RESERVA_CONFIG,
  UPDATE_CANAL_RESERVA_CONFIG,
  DELETE_CANAL_RESERVA_CONFIG
} from '../../graphql/configuracion';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmModal from '../shared/ConfirmModal';
import './ModalConfig.css';

function ModalCanalesReserva({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(null);
  const [formData, setFormData] = useState({});
  const { state: confirmState, confirm, execute, close } = useConfirmation();

  // Query para obtener canales
  const { data, loading, error, refetch } = useQuery(GET_CANALES_RESERVA_CONFIG);

  // Mutations
  const [crearCanal] = useMutation(CREATE_CANAL_RESERVA_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Canal de reserva creado exitosamente' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [actualizarCanal] = useMutation(UPDATE_CANAL_RESERVA_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Canal de reserva actualizado' });
      refetch();
      cerrarFormulario();
    },
    onError: (error) => setMensaje({ tipo: 'error', texto: error.message }),
  });

  const [eliminarCanal] = useMutation(DELETE_CANAL_RESERVA_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Canal de reserva eliminado' });
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
      const { codigo, nombre, descripcion, comision_pct, requiere_pago_anticipado, url_integracion, color_identificacion, icono, orden, activo } = formData;

      await crearCanal({
        variables: {
          input: {
            codigo,
            nombre,
            descripcion: descripcion || null,
            comision_pct: comision_pct || 0,
            requiere_pago_anticipado: requiere_pago_anticipado || false,
            url_integracion: url_integracion || null,
            color_identificacion: color_identificacion || null,
            icono: icono || null,
            orden: orden || 1,
            activo: activo !== undefined ? activo : true
          }
        }
      });
    } else if (modoEdicion?.tipo === 'editar') {
      const { __typename, id, created_at, updated_at, codigo, ...input } = formData;

      await actualizarCanal({
        variables: { codigo, input }
      });
    }
  };

  const handleEliminar = (codigo) => {
    confirm(
      async () => {
        await eliminarCanal({ variables: { codigo } });
        refetch();
      },
      {
        title: 'Eliminar Canal de Reserva',
        message: '¿Está seguro de eliminar este canal de reserva? Los datos asociados podrían verse afectados.',
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
      comision_pct: 0,
      requiere_pago_anticipado: false,
      url_integracion: '',
      color_identificacion: '#3b82f6',
      icono: '',
      orden: 1,
      activo: true
    });
    setModoEdicion('crear');
  };

  const abrirFormularioEditar = (canal) => {
    setFormData(canal);
    setModoEdicion({ tipo: 'editar', data: canal });
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
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando canales de reserva...</p>
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

  const canales = data?.canalesReservaConfig || [];

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Share2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-config__title">Canales de Reserva</h2>
            <p className="modal-config__subtitle">Configurar canales, comisiones e integraciones</p>
          </div>
          {!modoEdicion && (
            <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginRight: '1rem' }}>
              <Plus size={16} />
              <span>Nuevo Canal</span>
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
                      placeholder="Ej: BOOKING, AIRBNB, DIRECTO"
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
                      placeholder="Ej: Booking.com"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      value={formData.descripcion || ''}
                      onChange={handleChange}
                      placeholder="Descripción del canal de reserva"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="comision_pct">Comisión (%)</label>
                    <input
                      type="number"
                      id="comision_pct"
                      name="comision_pct"
                      value={formData.comision_pct || ''}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <small className="form-field__help">
                      Porcentaje de comisión que cobra el canal
                    </small>
                  </div>

                  <div className="form-checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="requiere_pago_anticipado"
                        checked={formData.requiere_pago_anticipado || false}
                        onChange={handleChange}
                      />
                      <span>Requiere Pago Anticipado</span>
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section__title">Integración y Apariencia</h3>

                  <div className="form-field">
                    <label htmlFor="url_integracion">URL de Integración</label>
                    <input
                      type="url"
                      id="url_integracion"
                      name="url_integracion"
                      value={formData.url_integracion || ''}
                      onChange={handleChange}
                      placeholder="https://api.booking.com/..."
                    />
                    <small className="form-field__help">
                      URL para integraciones API o webhooks
                    </small>
                  </div>

                  <div className="form-field">
                    <label htmlFor="color_identificacion">Color de Identificación</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="color"
                        id="color_identificacion"
                        name="color_identificacion"
                        value={formData.color_identificacion || '#3b82f6'}
                        onChange={handleChange}
                        style={{ width: '60px', height: '40px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={formData.color_identificacion || '#3b82f6'}
                        onChange={(e) => setFormData(prev => ({ ...prev, color_identificacion: e.target.value }))}
                        style={{ flex: 1 }}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="icono">Ícono (emoji o nombre)</label>
                    <input
                      type="text"
                      id="icono"
                      name="icono"
                      value={formData.icono || ''}
                      onChange={handleChange}
                      placeholder="🏨 o booking"
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
                  {modoEdicion === 'crear' ? 'Crear Canal' : 'Actualizar Canal'}
                </button>
              </div>
            </form>
          ) : (
            // Tabla de Canales
            <>
              {canales.length === 0 ? (
                <div className="empty-state">
                  <Share2 size={64} />
                  <h3>No hay canales de reserva</h3>
                  <p>Crea el primer canal de reserva para comenzar</p>
                  <button onClick={abrirFormularioCrear} className="btn-primary" style={{ marginTop: '1rem' }}>
                    <Plus size={16} />
                    <span>Crear Primer Canal</span>
                  </button>
                </div>
              ) : (
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Comisión</th>
                      <th>Pago Anticipado</th>
                      <th>Orden</th>
                      <th>Estado</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canales.map(canal => (
                      <tr key={canal.codigo}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {canal.color_identificacion && (
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '4px',
                                  background: canal.color_identificacion,
                                  border: '1px solid #d1d5db'
                                }}
                              />
                            )}
                            <code style={{
                              background: '#f3f4f6',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#1f2937'
                            }}>
                              {canal.codigo}
                            </code>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {canal.icono && <span>{canal.icono}</span>}
                            <span style={{ fontWeight: 600 }}>{canal.nombre}</span>
                          </div>
                        </td>
                        <td>
                          {canal.comision_pct > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b' }}>
                              <Percent size={14} />
                              <span style={{ fontWeight: 600 }}>{canal.comision_pct}%</span>
                            </div>
                          ) : (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Sin comisión</span>
                          )}
                        </td>
                        <td>
                          {canal.requiere_pago_anticipado ? (
                            <span className="badge badge--warning">Sí</span>
                          ) : (
                            <span className="badge badge--info">No</span>
                          )}
                        </td>
                        <td>{canal.orden}</td>
                        <td>
                          {canal.activo ? (
                            <span className="badge badge--success">Activo</span>
                          ) : (
                            <span className="badge badge--danger">Inactivo</span>
                          )}
                        </td>
                        <td>
                          <div className="config-table__actions">
                            <button
                              onClick={() => abrirFormularioEditar(canal)}
                              className="config-table__btn config-table__btn--edit"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleEliminar(canal.codigo)}
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

export default ModalCanalesReserva;
