import { useState } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  X, Hash, Loader, AlertCircle, CheckCircle, Plus, Edit2, Power, PowerOff, Save, FileText, FileX, FileCheck, RefreshCw
} from 'lucide-react';
import {
  GET_RESOLUCIONES,
  CREAR_RESOLUCION,
  ACTUALIZAR_RESOLUCION,
  ACTIVAR_RESOLUCION,
  DESACTIVAR_RESOLUCION,
  GET_FACTUS_NUMBERING_RANGES
} from '../../graphql/consecutivos';
import './ModalConfig.css';

const TIPOS_DOCUMENTO = [
  { value: 'factura', label: 'Facturas Electr\u00f3nicas', icon: FileCheck, color: '#10b981' },
  { value: 'nota_credito', label: 'Notas de Crédito', icon: FileX, color: '#f59e0b' },
  { value: 'doc_soporte', label: 'Documentos Soporte', icon: FileText, color: '#6366f1' }
];

function ModalConsecutivos({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [resolucionEnEdicion, setResolucionEnEdicion] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [formData, setFormData] = useState({
    tipo_documento: 'factura',
    nombre: '',
    resolucion: '',
    prefijo: '',
    numero_inicial: '',
    numero_final: '',
    numero_actual: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
    factus_numbering_range_id: '',
    transmision_automatica: false
  });

  const [rangosFactus, setRangosFactus] = useState([]);
  const [cargandoRangos, setCargandoRangos] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_RESOLUCIONES);

  const [cargarRangosFactus] = useLazyQuery(GET_FACTUS_NUMBERING_RANGES, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setCargandoRangos(false);
      const rangos = data?.factusNumberingRanges || [];
      setRangosFactus(rangos);
      if (rangos.length > 0) {
        setMensaje({ tipo: 'success', texto: `Se encontraron ${rangos.length} rangos de numeración en Factus` });
        setTimeout(() => setMensaje(null), 3000);
      } else {
        setMensaje({ tipo: 'error', texto: 'No se encontraron rangos de numeración en Factus' });
        setTimeout(() => setMensaje(null), 5000);
      }
    },
    onError: (error) => {
      setCargandoRangos(false);
      setMensaje({ tipo: 'error', texto: `Error al cargar rangos: ${error.message}` });
      setTimeout(() => setMensaje(null), 5000);
    }
  });

  const handleCargarRangos = () => {
    setCargandoRangos(true);
    setMensaje(null);
    cargarRangosFactus();
  };

  const handleSeleccionarRango = (rango) => {
    setFormData(prev => ({
      ...prev,
      factus_numbering_range_id: rango.id.toString(),
      prefijo: rango.prefix || prev.prefijo,
      numero_inicial: rango.from?.toString() || prev.numero_inicial,
      numero_final: rango.to?.toString() || prev.numero_final,
      numero_actual: rango.current?.toString() || prev.numero_actual,
      resolucion: rango.resolution_number || prev.resolucion
    }));
  };

  const [crearResolucion, { loading: creando }] = useMutation(CREAR_RESOLUCION, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Resolución creada exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [actualizarResolucion, { loading: actualizando }] = useMutation(ACTUALIZAR_RESOLUCION, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Resolución actualizada exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [activarResolucion, { loading: activando }] = useMutation(ACTIVAR_RESOLUCION, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Resolución activada. Las demás del mismo tipo fueron desactivadas.' });
      refetch();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [desactivarResolucion, { loading: desactivando }] = useMutation(DESACTIVAR_RESOLUCION, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Resolución desactivada' });
      refetch();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const resetForm = () => {
    setFormData({
      tipo_documento: 'factura',
      nombre: '',
      resolucion: '',
      prefijo: '',
      numero_inicial: '',
      numero_final: '',
      numero_actual: '',
      fecha_inicio: '',
      fecha_fin: '',
      activo: true,
      factus_numbering_range_id: '',
      transmision_automatica: false
    });
    setModoEdicion(false);
    setResolucionEnEdicion(null);
    setMostrarFormulario(false);
  };

  const handleEditar = (resolucion) => {
    setFormData({
      tipo_documento: resolucion.tipo_documento,
      nombre: resolucion.nombre,
      resolucion: resolucion.resolucion || '',
      prefijo: resolucion.prefijo,
      numero_inicial: resolucion.numero_inicial,
      numero_final: resolucion.numero_final,
      numero_actual: resolucion.numero_actual,
      fecha_inicio: resolucion.fecha_inicio ? resolucion.fecha_inicio.split('T')[0] : '',
      fecha_fin: resolucion.fecha_fin ? resolucion.fecha_fin.split('T')[0] : '',
      activo: resolucion.activo,
      factus_numbering_range_id: resolucion.factus_numbering_range_id?.toString() || '',
      transmision_automatica: resolucion.transmision_automatica || false
    });
    setModoEdicion(true);
    setResolucionEnEdicion(resolucion);
    setMostrarFormulario(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const input = {
      tipo_documento: formData.tipo_documento,
      nombre: formData.nombre,
      resolucion: formData.resolucion || null,
      prefijo: formData.prefijo,
      numero_inicial: formData.numero_inicial,
      numero_final: formData.numero_final,
      numero_actual: formData.numero_actual || formData.numero_inicial,
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
      activo: formData.activo,
      factus_numbering_range_id: formData.factus_numbering_range_id ? parseInt(formData.factus_numbering_range_id) : null,
      transmision_automatica: formData.transmision_automatica
    };

    if (modoEdicion && resolucionEnEdicion) {
      await actualizarResolucion({
        variables: { id: resolucionEnEdicion.id, input }
      });
    } else {
      await crearResolucion({ variables: { input } });
    }
  };

  const handleToggleActivo = async (resolucion) => {
    if (resolucion.activo) {
      await desactivarResolucion({ variables: { id: resolucion.id } });
    } else {
      await activarResolucion({ variables: { id: resolucion.id } });
    }
  };

  const getResolucionesPorTipo = (tipo) => {
    if (!data?.resoluciones) return [];
    return data.resoluciones.filter(r => r.tipo_documento === tipo);
  };

  const formatNumero = (num) => {
    return parseInt(num).toLocaleString('es-CO');
  };

  const renderProgressBar = (porcentaje) => {
    const color = porcentaje > 90 ? '#ef4444' : porcentaje > 70 ? '#f59e0b' : '#10b981';
    return (
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(porcentaje, 100)}%`, backgroundColor: color }}
        />
        <span className="progress-bar-text">{porcentaje.toFixed(2)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-config">
          <div className="modal-config__header">
            <div className="modal-config__header-icon">
              <Hash size={24} />
            </div>
            <div>
              <h2 className="modal-config__title">Consecutivos DIAN</h2>
              <p className="modal-config__subtitle">Cargando resoluciones...</p>
            </div>
          </div>
          <div className="modal-config__form" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader className="spinner" size={40} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-config">
          <div className="modal-config__header">
            <div className="modal-config__header-icon">
              <Hash size={24} />
            </div>
            <div>
              <h2 className="modal-config__title">Consecutivos DIAN</h2>
            </div>
            <button className="modal-config__close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="modal-config__form">
            <div className="alert alert--error">
              <AlertCircle size={20} />
              Error al cargar resoluciones: {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--large">
        <div className="modal-config__header">
          <div className="modal-config__header-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
            <Hash size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Consecutivos DIAN</h2>
            <p className="modal-config__subtitle">Gestionar resoluciones de numeración para documentos electrónicos</p>
          </div>
          <button className="modal-config__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-config__form">
          {mensaje && (
            <div className={`alert alert--${mensaje.tipo}`}>
              {mensaje.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {mensaje.texto}
            </div>
          )}

          {!mostrarFormulario ? (
            <>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-primary"
                  onClick={() => setMostrarFormulario(true)}
                >
                  <Plus size={18} />
                  Nueva Resolución
                </button>
              </div>

              {TIPOS_DOCUMENTO.map(tipo => {
                const Icon = tipo.icon;
                const resoluciones = getResolucionesPorTipo(tipo.value);

                return (
                  <div key={tipo.value} className="consecutivos-seccion">
                    <div className="consecutivos-seccion__header" style={{ borderColor: tipo.color }}>
                      <Icon size={20} style={{ color: tipo.color }} />
                      <h3>{tipo.label}</h3>
                    </div>

                    {resoluciones.length === 0 ? (
                      <div className="empty-state" style={{ padding: '1.5rem' }}>
                        <p style={{ margin: 0 }}>No hay resoluciones configuradas para este tipo de documento.</p>
                      </div>
                    ) : (
                      <div className="consecutivos-lista">
                        {resoluciones.map(resolucion => (
                          <div
                            key={resolucion.id}
                            className={`consecutivo-card ${resolucion.activo ? 'consecutivo-card--activo' : ''}`}
                          >
                            <div className="consecutivo-card__header">
                              <div className="consecutivo-card__info">
                                <span className="consecutivo-card__nombre">{resolucion.nombre}</span>
                                <span className={`badge ${resolucion.activo ? 'badge--success' : 'badge--danger'}`}>
                                  {resolucion.activo ? 'Activa' : 'Inactiva'}
                                </span>
                              </div>
                              <div className="consecutivo-card__actions">
                                <button
                                  className="config-table__btn config-table__btn--edit"
                                  onClick={() => handleEditar(resolucion)}
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className={`config-table__btn ${resolucion.activo ? 'config-table__btn--delete' : 'config-table__btn--edit'}`}
                                  onClick={() => handleToggleActivo(resolucion)}
                                  disabled={activando || desactivando}
                                  title={resolucion.activo ? 'Desactivar' : 'Activar'}
                                >
                                  {resolucion.activo ? <PowerOff size={16} /> : <Power size={16} />}
                                </button>
                              </div>
                            </div>

                            <div className="consecutivo-card__details">
                              <div className="consecutivo-card__detail">
                                <span className="detail-label">Resolución:</span>
                                <span className="detail-value">{resolucion.resolucion || 'N/A'}</span>
                              </div>
                              <div className="consecutivo-card__detail">
                                <span className="detail-label">Prefijo:</span>
                                <span className="detail-value" style={{ fontWeight: 600, color: tipo.color }}>
                                  {resolucion.prefijo}
                                </span>
                              </div>
                              <div className="consecutivo-card__detail">
                                <span className="detail-label">Rango:</span>
                                <span className="detail-value">
                                  {formatNumero(resolucion.numero_inicial)} - {formatNumero(resolucion.numero_final)}
                                </span>
                              </div>
                              <div className="consecutivo-card__detail">
                                <span className="detail-label">Actual:</span>
                                <span className="detail-value" style={{ fontWeight: 600 }}>
                                  {formatNumero(resolucion.numero_actual)}
                                </span>
                              </div>
                              <div className="consecutivo-card__detail">
                                <span className="detail-label">Disponibles:</span>
                                <span className="detail-value">
                                  {formatNumero(resolucion.numeros_disponibles)}
                                </span>
                              </div>
                              {resolucion.factus_numbering_range_id && (
                                <div className="consecutivo-card__detail">
                                  <span className="detail-label">Rango Factus:</span>
                                  <span className="detail-value" style={{ fontWeight: 600, color: '#8b5cf6' }}>
                                    ID: {resolucion.factus_numbering_range_id}
                                  </span>
                                </div>
                              )}
                              {resolucion.transmision_automatica && (
                                <div className="consecutivo-card__detail">
                                  <span className="detail-label">Transmisión:</span>
                                  <span className="detail-value" style={{ fontWeight: 600, color: '#10b981' }}>
                                    Automática
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="consecutivo-card__progress">
                              {renderProgressBar(resolucion.porcentaje_uso)}
                            </div>

                            {resolucion.fecha_inicio && (
                              <div className="consecutivo-card__vigencia">
                                Vigencia: {new Date(resolucion.fecha_inicio).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}
                                {resolucion.fecha_fin && ` - ${new Date(resolucion.fecha_fin).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`}
                              </div>
                            )}

                            {resolucion.porcentaje_uso > 90 && (
                              <div className="alert alert--warning" style={{ marginTop: '0.5rem', padding: '0.5rem' }}>
                                <AlertCircle size={16} />
                                Rango próximo a agotarse
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                  {modoEdicion ? 'Editar Resolución' : 'Nueva Resolución'}
                </h3>
              </div>

              <div className="form-grid">
                <div className="form-section">
                  <h4 className="form-section__title">Información Básica</h4>

                  <div className="form-field">
                    <label>Tipo de Documento *</label>
                    <select
                      value={formData.tipo_documento}
                      onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                      disabled={modoEdicion}
                      required
                    >
                      {TIPOS_DOCUMENTO.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Nombre Descriptivo *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Facturas 2025"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Número de Resolución DIAN</label>
                    <input
                      type="text"
                      value={formData.resolucion}
                      onChange={(e) => setFormData({ ...formData, resolucion: e.target.value })}
                      placeholder="Ej: 18760000001"
                    />
                    <span className="form-field__help">Opcional para notas crédito y documentos soporte</span>
                  </div>

                  <div className="form-field">
                    <label>Prefijo *</label>
                    <input
                      type="text"
                      value={formData.prefijo}
                      onChange={(e) => setFormData({ ...formData, prefijo: e.target.value.toUpperCase() })}
                      placeholder="Ej: SETP, NC, DS"
                      maxLength={10}
                      required
                    />
                    <span className="form-field__help">El prefijo que aparecerá antes del número (ej: SETP990000001)</span>
                  </div>

                  {/* Rango de Numeración de Factus */}
                  <div className="form-field">
                    <label>Rango Factus (Numbering Range ID)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input
                        type="number"
                        value={formData.factus_numbering_range_id}
                        onChange={(e) => setFormData({ ...formData, factus_numbering_range_id: e.target.value })}
                        placeholder="ID del rango en Factus"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCargarRangos}
                        disabled={cargandoRangos}
                        style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        {cargandoRangos ? (
                          <Loader className="spinner" size={14} />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        {cargandoRangos ? ' Cargando...' : ' Cargar Rangos'}
                      </button>
                    </div>
                    <span className="form-field__help">
                      ID del rango de numeración en Factus. Indica a Factus qué prefijo y consecutivo usar al transmitir.
                    </span>
                  </div>

                  {/* Lista de rangos disponibles */}
                  {rangosFactus.length > 0 && (
                    <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '0.75rem', marginTop: '0.25rem' }}>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#1e40af' }}>
                        Rangos disponibles en Factus:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {rangosFactus.map(rango => (
                          <div
                            key={rango.id}
                            onClick={() => handleSeleccionarRango(rango)}
                            style={{
                              background: formData.factus_numbering_range_id === rango.id.toString() ? '#dbeafe' : 'white',
                              border: formData.factus_numbering_range_id === rango.id.toString() ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div>
                              <strong>ID: {rango.id}</strong> — Prefijo: <strong>{rango.prefix || 'N/A'}</strong>
                              <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                ({rango.from?.toLocaleString()} - {rango.to?.toLocaleString()})
                              </span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                              <span style={{ color: '#6b7280' }}>Actual: {rango.current?.toLocaleString()}</span>
                              {rango.is_expired && (
                                <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 600 }}>EXPIRADO</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Haz clic en un rango para seleccionarlo y auto-llenar los campos.
                      </p>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h4 className="form-section__title">Rango de Numeración</h4>

                  <div className="form-field">
                    <label>Número Inicial *</label>
                    <input
                      type="number"
                      value={formData.numero_inicial}
                      onChange={(e) => setFormData({ ...formData, numero_inicial: e.target.value })}
                      placeholder="Ej: 990000001"
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Número Final *</label>
                    <input
                      type="number"
                      value={formData.numero_final}
                      onChange={(e) => setFormData({ ...formData, numero_final: e.target.value })}
                      placeholder="Ej: 999999999"
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Número Actual</label>
                    <input
                      type="number"
                      value={formData.numero_actual}
                      onChange={(e) => setFormData({ ...formData, numero_actual: e.target.value })}
                      placeholder="Siguiente número a usar"
                      min="1"
                    />
                    <span className="form-field__help">Si no se especifica, se usará el número inicial</span>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Fecha Inicio Vigencia</label>
                      <input
                        type="date"
                        value={formData.fecha_inicio}
                        onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>Fecha Fin Vigencia</label>
                      <input
                        type="date"
                        value={formData.fecha_fin}
                        onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      />
                      Activar resolución (desactivará otras del mismo tipo)
                    </label>
                  </div>

                  {formData.tipo_documento === 'factura' && (
                    <div className="form-field">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.transmision_automatica}
                          onChange={(e) => setFormData({ ...formData, transmision_automatica: e.target.checked })}
                        />
                        Transmisión automática a DIAN
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '0.25rem' }}>
                        Las facturas POS se envían automáticamente a la DIAN al momento de la venta
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-config__footer" style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creando || actualizando}
                >
                  {(creando || actualizando) ? (
                    <>
                      <Loader className="spinner" size={18} />
                      {modoEdicion ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {modoEdicion ? 'Actualizar' : 'Crear Resolución'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {!mostrarFormulario && (
          <div className="modal-config__footer">
            <button className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>

      <style>{`
        .consecutivos-seccion {
          margin-bottom: 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          overflow: hidden;
        }

        .consecutivos-seccion__header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid;
        }

        .consecutivos-seccion__header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .consecutivos-lista {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .consecutivo-card {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .consecutivo-card--activo {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }

        .consecutivo-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .consecutivo-card__info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .consecutivo-card__nombre {
          font-weight: 600;
          color: #1f2937;
        }

        .consecutivo-card__actions {
          display: flex;
          gap: 0.25rem;
        }

        .consecutivo-card__details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .consecutivo-card__detail {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .detail-value {
          font-size: 0.875rem;
          color: #1f2937;
        }

        .consecutivo-card__progress {
          margin-bottom: 0.5rem;
        }

        .progress-bar-container {
          position: relative;
          height: 20px;
          background: #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .progress-bar-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
        }

        .consecutivo-card__vigencia {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}

export default ModalConsecutivos;
