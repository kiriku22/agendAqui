import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  X, FileText, Loader, AlertCircle, CheckCircle,
  Zap, RefreshCw, ExternalLink, Info, Eye, EyeOff,
} from 'lucide-react';
import {
  GET_CONFIGURACION_TRA,
  ACTUALIZAR_CONFIGURACION_TRA,
  PROBAR_CONEXION_TRA,
  GET_REPORTES_TRA_PENDIENTES,
  REINTENTAR_TRA,
} from '../../graphql/tra';
import './ModalConfig.css';

function ModalTRA({ onClose }) {
  const [formData, setFormData] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  const { data, loading, error } = useQuery(GET_CONFIGURACION_TRA);

  const { data: reportesData, loading: reportesLoading, refetch: refetchReportes } = useQuery(GET_REPORTES_TRA_PENDIENTES, {
    skip: activeTab !== 'reportes',
  });

  const [actualizarConfiguracion, { loading: saving }] = useMutation(ACTUALIZAR_CONFIGURACION_TRA, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Configuracion TRA actualizada exitosamente' });
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (err) => {
      setMensaje({ tipo: 'error', texto: err.message });
    },
    refetchQueries: [{ query: GET_CONFIGURACION_TRA }],
  });

  const [probarConexion] = useMutation(PROBAR_CONEXION_TRA, {
    onCompleted: (data) => {
      setTestingConnection(false);
      if (data.probarConexionTRA.success) {
        setMensaje({ tipo: 'success', texto: data.probarConexionTRA.message });
      } else {
        setMensaje({ tipo: 'error', texto: data.probarConexionTRA.message });
      }
    },
    onError: (err) => {
      setTestingConnection(false);
      setMensaje({ tipo: 'error', texto: err.message });
    },
  });

  const [reintentarReporte] = useMutation(REINTENTAR_TRA, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Reintento ejecutado' });
      refetchReportes();
    },
    onError: (err) => {
      setMensaje({ tipo: 'error', texto: err.message });
    },
  });

  useEffect(() => {
    if (data?.configuracionTRA) {
      setFormData(data.configuracionTRA);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = {
      token: formData.token || null,
      rnt: formData.rnt || null,
      nombre_establecimiento: formData.nombre_establecimiento || null,
      tipo_acomodacion: formData.tipo_acomodacion || 'Hotel',
      endpoint: formData.endpoint || 'https://pms.mincit.gov.co',
      activo: formData.activo || false,
    };
    await actualizarConfiguracion({ variables: { input } });
  };

  const handleProbarConexion = async () => {
    setTestingConnection(true);
    setMensaje(null);
    await probarConexion();
  };

  const handleReintentar = async (reporteId) => {
    await reintentarReporte({ variables: { reporte_id: reporteId } });
  };

  const pendientesCount = reportesData?.reportesTRAPendientes?.length || 0;

  // Loading state
  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config modal-config--large" onClick={e => e.stopPropagation()}>
          <div className="empty-state">
            <Loader size={40} className="spinner" />
            <p>Cargando configuracion TRA...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div className="empty-state">
            <AlertCircle size={40} color="#ef4444" />
            <h3>Error al cargar</h3>
            <p>{error.message}</p>
            <button onClick={onClose} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-config modal-config--large" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">TRA - Tarjeta de Registro de Alojamiento</h2>
            <p className="modal-config__subtitle">MinCIT Colombia - Ley 2068 de 2020</p>
          </div>
          <button className="modal-config__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-config__tabs">
          <button
            className={`modal-config__tab modal-config__tab--teal ${activeTab === 'config' ? 'modal-config__tab--active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuracion
          </button>
          <button
            className={`modal-config__tab modal-config__tab--teal ${activeTab === 'reportes' ? 'modal-config__tab--active' : ''}`}
            onClick={() => { setActiveTab('reportes'); refetchReportes(); }}
          >
            Reportes Pendientes{pendientesCount > 0 ? ` (${pendientesCount})` : ''}
          </button>
        </div>

        {/* Alert message */}
        {mensaje && (
          <div style={{ padding: '0 1.5rem', paddingTop: '1rem' }}>
            <div className={`alert alert--${mensaje.tipo}`}>
              {mensaje.tipo === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{mensaje.texto}</span>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB: Configuracion
            ================================================================ */}
        {activeTab === 'config' && (
          <form onSubmit={handleSubmit}>
            <div className="modal-config__body">

              {/* Info card */}
              <div className="info-card info-card--teal">
                <Info size={18} className="info-card__icon" />
                <div>
                  <p style={{ margin: 0, marginBottom: '0.5rem' }}>
                    <strong>Resolucion 409 de 2022</strong> — Cada hotel necesita su propio TOKEN vinculado a su RNT.
                    Al hacer check-in, se envia automaticamente el registro al MinCIT (API /one/ y /two/).
                  </p>
                  <a
                    href="https://pms.mincit.gov.co/token/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Obtener TOKEN en pms.mincit.gov.co <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                </div>
              </div>

              {/* Section: Credenciales */}
              <h3 className="form-section__title form-section__title--teal">Credenciales TRA</h3>

              {/* Token field */}
              <div className="form-field">
                <label>TOKEN del Establecimiento</label>
                <div className="input-with-action">
                  <input
                    type={showToken ? 'text' : 'password'}
                    name="token"
                    value={formData.token || ''}
                    onChange={handleChange}
                    placeholder="Token obtenido de pms.mincit.gov.co"
                  />
                  <button
                    type="button"
                    className="input-with-action__btn"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showToken ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              {/* RNT + Nombre Establecimiento */}
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-field">
                  <label>RNT (Registro Nacional de Turismo)</label>
                  <input
                    type="text"
                    name="rnt"
                    value={formData.rnt || ''}
                    onChange={handleChange}
                    placeholder="Ej: 12345"
                  />
                </div>
                <div className="form-field">
                  <label>Nombre del Establecimiento</label>
                  <input
                    type="text"
                    name="nombre_establecimiento"
                    value={formData.nombre_establecimiento || ''}
                    onChange={handleChange}
                    placeholder="Ej: Hotel Ejemplo Bogota"
                  />
                </div>
              </div>

              {/* Tipo Acomodacion + Endpoint */}
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-field">
                  <label>Tipo de Acomodacion</label>
                  <select
                    name="tipo_acomodacion"
                    value={formData.tipo_acomodacion || 'Hotel'}
                    onChange={handleChange}
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="Hostal">Hostal</option>
                    <option value="Apartahotel">Apartahotel</option>
                    <option value="Finca Hotel">Finca Hotel</option>
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Cabana">Cabana</option>
                    <option value="Glamping">Glamping</option>
                    <option value="Posada">Posada</option>
                    <option value="Refugio">Refugio</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Endpoint API</label>
                  <input
                    type="text"
                    name="endpoint"
                    value={formData.endpoint || 'https://pms.mincit.gov.co'}
                    onChange={handleChange}
                  />
                  <span className="form-field__help">No modificar a menos que MinCIT indique otro endpoint</span>
                </div>
              </div>

              {/* Toggle TRA Activo */}
              <div
                className="toggle-switch"
                onClick={() => setFormData(prev => ({ ...prev, activo: !prev.activo }))}
              >
                <div className={`toggle-switch__track ${formData.activo ? 'toggle-switch__track--active' : ''}`}>
                  <div className="toggle-switch__thumb" />
                </div>
                <div className="toggle-switch__text">
                  <span className="toggle-switch__label">TRA Activo</span>
                  <span className="toggle-switch__description">
                    Enviar registros automaticamente al MinCIT al hacer check-in
                  </span>
                </div>
              </div>

              {/* Estadisticas */}
              {(formData.total_envios_exitosos > 0 || formData.total_envios_fallidos > 0) && (
                <div className="stats-grid">
                  <div className="stats-card">
                    <div className="stats-card__value stats-card__value--success">
                      {formData.total_envios_exitosos || 0}
                    </div>
                    <div className="stats-card__label">Exitosos</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__value stats-card__value--danger">
                      {formData.total_envios_fallidos || 0}
                    </div>
                    <div className="stats-card__label">Fallidos</div>
                  </div>
                  {formData.ultimo_envio_exitoso && (
                    <div className="stats-card" style={{ flex: 2 }}>
                      <div className="stats-card__value stats-card__value--info" style={{ fontSize: '0.95rem' }}>
                        {new Date(formData.ultimo_envio_exitoso).toLocaleString('es-CO')}
                      </div>
                      <div className="stats-card__label">Ultimo envio exitoso</div>
                    </div>
                  )}
                </div>
              )}

              {/* Probar conexion */}
              <button
                type="button"
                className="btn-teal"
                onClick={handleProbarConexion}
                disabled={testingConnection || !formData.token || !formData.rnt || !formData.nombre_establecimiento}
              >
                {testingConnection ? <Loader size={16} className="spinner" /> : <Zap size={16} />}
                {testingConnection ? 'Probando...' : 'Probar Conexion'}
              </button>
            </div>

            {/* Footer */}
            <div className="modal-config__footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary btn-primary--teal">
                {saving ? <Loader size={16} className="spinner" /> : null}
                {saving ? 'Guardando...' : 'Guardar Configuracion'}
              </button>
            </div>
          </form>
        )}

        {/* ================================================================
            TAB: Reportes Pendientes
            ================================================================ */}
        {activeTab === 'reportes' && (
          <div className="modal-config__body">
            {reportesLoading ? (
              <div className="empty-state">
                <Loader size={32} className="spinner" />
                <p>Cargando reportes...</p>
              </div>
            ) : !reportesData?.reportesTRAPendientes?.length ? (
              <div className="empty-state">
                <CheckCircle size={48} color="#10b981" />
                <h3>Sin pendientes</h3>
                <p>No hay reportes pendientes o con error</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Hospedaje</th>
                      <th>Huesped</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Intentos</th>
                      <th>Error</th>
                      <th style={{ textAlign: 'center' }}>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesData.reportesTRAPendientes.map(reporte => (
                      <tr key={reporte.id}>
                        <td>{reporte.hospedaje?.codigo || `#${reporte.hospedaje_id}`}</td>
                        <td>{reporte.huesped?.nombre_completo || reporte.huesped?.numero_documento || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${reporte.estado === 'error' ? 'badge--danger' : 'badge--warning'}`}>
                            {reporte.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{reporte.intentos}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={reporte.errores || ''}
                        >
                          {reporte.errores || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleReintentar(reporte.id)}
                            className="config-table__btn config-table__btn--edit"
                            title="Reintentar envio"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModalTRA;
