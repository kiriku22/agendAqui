import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, CreditCard, Loader, AlertCircle, CheckCircle, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import {
  GET_METODOS_PAGO,
  CREAR_METODO_PAGO,
  ACTUALIZAR_METODO_PAGO,
  ELIMINAR_METODO_PAGO
} from '../../graphql/metodosPago';
import './ModalConfig.css';

// Catálogo de códigos DIAN organizados por tipo
const CODIGOS_DIAN_POR_TIPO = {
  efectivo: [
    { codigo: '10', nombre: 'Efectivo' }
  ],
  tarjeta: [
    { codigo: '42', nombre: 'Tarjeta Crédito' },
    { codigo: '43', nombre: 'Tarjeta Débito' },
    { codigo: '44', nombre: 'Bono/Tarjeta Regalo' }
  ],
  transferencia: [
    { codigo: '47', nombre: 'Transferencia Bancaria' },
    { codigo: '41', nombre: 'ACH' },
    { codigo: '48', nombre: 'PSE' }
  ],
  digital: [
    { codigo: '49', nombre: 'Billetera Digital (Nequi, Daviplata, etc.)' }
  ],
  credito: [
    { codigo: '30', nombre: 'Crédito' }
  ],
  cheque: [
    { codigo: '20', nombre: 'Cheque' }
  ],
  mixto: [
    { codigo: '71', nombre: 'Pago Mixto' }
  ]
};

const TIPOS_DISPONIBLES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'digital', label: 'Digital' },
  { value: 'credito', label: 'Crédito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mixto', label: 'Mixto' }
];

function ModalMetodosPago({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false); // false = crear, true = editar
  const [metodoEnEdicion, setMetodoEnEdicion] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    codigo_dian: '',
    requiere_referencia: false,
    icono: '',
    orden: ''
  });

  // Query para obtener métodos de pago
  const { data, loading, error, refetch } = useQuery(GET_METODOS_PAGO);

  // Mutations
  const [crearMetodo, { loading: creando }] = useMutation(CREAR_METODO_PAGO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Método de pago creado exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [actualizarMetodo, { loading: actualizando }] = useMutation(ACTUALIZAR_METODO_PAGO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Método de pago actualizado exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [eliminarMetodo, { loading: eliminando }] = useMutation(ELIMINAR_METODO_PAGO, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Método de pago eliminado exitosamente' });
      refetch();
      setConfirmacionEliminar(null);
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setConfirmacionEliminar(null);
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: '',
      codigo_dian: '',
      requiere_referencia: false,
      icono: '',
      orden: ''
    });
    setModoEdicion(false);
    setMetodoEnEdicion(null);
    setMostrarFormulario(false);
  };

  const handleNuevo = () => {
    resetForm();
    setMostrarFormulario(true);
  };

  const handleEditar = (metodo) => {
    setFormData({
      nombre: metodo.nombre,
      tipo: metodo.tipo,
      codigo_dian: metodo.codigo_dian,
      requiere_referencia: metodo.requiere_referencia || false,
      icono: metodo.icono || '',
      orden: metodo.orden || ''
    });
    setModoEdicion(true);
    setMetodoEnEdicion(metodo);
    setMostrarFormulario(true);
  };

  const handleToggle = async (metodo) => {
    await actualizarMetodo({
      variables: {
        id: parseInt(metodo.id),
        input: { activo: !metodo.activo }
      }
    });
  };

  const handleEliminar = (metodo) => {
    setConfirmacionEliminar(metodo);
  };

  const confirmarEliminar = async () => {
    if (confirmacionEliminar) {
      await eliminarMetodo({
        variables: { id: parseInt(confirmacionEliminar.id) }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const input = {
      nombre: formData.nombre.trim(),
      codigo_dian: formData.codigo_dian,
      tipo: formData.tipo,
      requiere_referencia: formData.requiere_referencia,
      icono: formData.icono.trim() || null,
      orden: formData.orden ? parseInt(formData.orden) : null
    };

    if (modoEdicion && metodoEnEdicion) {
      await actualizarMetodo({
        variables: { id: parseInt(metodoEnEdicion.id), input }
      });
    } else {
      await crearMetodo({
        variables: { input }
      });
    }
  };

  const handleTipoChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipo,
      codigo_dian: '' // Reset código DIAN cuando cambia el tipo
    }));
  };

  const codigosDianDisponibles = formData.tipo ? CODIGOS_DIAN_POR_TIPO[formData.tipo] || [] : [];

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando métodos de pago...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
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

  const metodos = data?.metodosPago || [];

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--large">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Métodos de Pago</h2>
            <p className="modal-config__subtitle">Gestionar métodos de pago y códigos DIAN</p>
          </div>
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
          {/* Botón Nuevo */}
          {!mostrarFormulario && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleNuevo}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={20} />
                Nuevo Método de Pago
              </button>
            </div>
          )}

          {/* Formulario */}
          {mostrarFormulario && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '2px solid #8b5cf6'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
                {modoEdicion ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Columna 1 */}
                  <div>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      placeholder="Ej: Tarjeta Visa Empresarial"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                      Tipo *
                    </label>
                    <select
                      className="form-input"
                      value={formData.tipo}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      required
                    >
                      <option value="">Seleccione un tipo</option>
                      {TIPOS_DISPONIBLES.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                      Código DIAN *
                    </label>
                    <select
                      className="form-input"
                      value={formData.codigo_dian}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo_dian: e.target.value }))}
                      required
                      disabled={!formData.tipo}
                    >
                      <option value="">
                        {formData.tipo ? 'Seleccione código DIAN' : 'Primero seleccione un tipo'}
                      </option>
                      {codigosDianDisponibles.map(({ codigo, nombre }) => (
                        <option key={codigo} value={codigo}>
                          {codigo} - {nombre}
                        </option>
                      ))}
                    </select>
                    {formData.tipo && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Seleccione el código oficial según la Resolución DIAN 000042/2020
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                      Icono (Emoji opcional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.icono}
                      onChange={(e) => setFormData(prev => ({ ...prev, icono: e.target.value }))}
                      placeholder="Ej: 💳"
                      maxLength="2"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                      Orden
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.orden}
                      onChange={(e) => setFormData(prev => ({ ...prev, orden: e.target.value }))}
                      placeholder="Ej: 1"
                      min="1"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.requiere_referencia}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiere_referencia: e.target.checked }))}
                      />
                      Requiere referencia (número de transacción, voucher, etc.)
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                    disabled={creando || actualizando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={creando || actualizando}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {(creando || actualizando) && <Loader size={16} className="spinner" />}
                    <Save size={16} />
                    {modoEdicion ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla */}
          {metodos.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={64} />
              <h3>No hay métodos de pago</h3>
              <p>Crea el primer método de pago usando el botón "Nuevo Método de Pago"</p>
            </div>
          ) : (
            <table className="config-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código DIAN</th>
                  <th>Tipo</th>
                  <th>Ref.</th>
                  <th>Orden</th>
                  <th>Estado</th>
                  <th style={{ width: '180px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {metodos.map(metodo => (
                  <tr key={metodo.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>{metodo.nombre}</span>
                    </td>
                    <td>
                      <code style={{
                        background: '#dbeafe',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        color: '#1e40af',
                        fontWeight: 600
                      }}>
                        {metodo.codigo_dian}
                      </code>
                    </td>
                    <td>
                      <code style={{
                        background: '#f3f4f6',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        {metodo.tipo}
                      </code>
                    </td>
                    <td>
                      {metodo.requiere_referencia ? (
                        <span className="badge badge--warning">Sí</span>
                      ) : (
                        <span className="badge badge--info">No</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#6b7280'
                      }}>
                        {metodo.orden || '-'}
                      </span>
                    </td>
                    <td>
                      {metodo.activo ? (
                        <span className="badge badge--success">Activo</span>
                      ) : (
                        <span className="badge badge--danger">Inactivo</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEditar(metodo)}
                          disabled={actualizando || eliminando}
                          className="config-table__btn"
                          style={{ color: '#3b82f6', padding: '0.5rem' }}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleToggle(metodo)}
                          disabled={actualizando || eliminando}
                          className="config-table__btn"
                          style={{ color: metodo.activo ? '#ef4444' : '#10b981', padding: '0.5rem' }}
                          title={metodo.activo ? 'Desactivar' : 'Activar'}
                        >
                          {metodo.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>

                        <button
                          onClick={() => handleEliminar(metodo)}
                          disabled={actualizando || eliminando}
                          className="config-table__btn"
                          style={{ color: '#ef4444', padding: '0.5rem' }}
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

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
              <strong>Nota:</strong> Los códigos DIAN son oficiales según la Resolución 000042 de 2020 para facturación electrónica. Asegúrese de seleccionar el código correcto según el tipo de pago.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-config__footer">
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {confirmacionEliminar && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal-config" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <AlertCircle size={48} color="#ef4444" />
              </div>
              <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: '0.5rem' }}>
                Confirmar Eliminación
              </h3>
              <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem' }}>
                ¿Está seguro de eliminar el método de pago <strong>{confirmacionEliminar.nombre}</strong>?
              </p>
              <p style={{ fontSize: '0.875rem', color: '#ef4444', textAlign: 'center', marginBottom: '1.5rem' }}>
                Esta acción no se puede deshacer. Si el método ya fue usado en facturas, no podrá eliminarse.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setConfirmacionEliminar(null)}
                  className="btn-secondary"
                  disabled={eliminando}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  className="btn-primary"
                  disabled={eliminando}
                  style={{
                    background: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {eliminando && <Loader size={16} className="spinner" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModalMetodosPago;
