import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, FileText, Loader, AlertCircle, CheckCircle, Zap, RefreshCw } from 'lucide-react';
import {
  GET_CONFIGURACION_FACTUS,
  ACTUALIZAR_CONFIGURACION_FACTUS,
  PROBAR_CONEXION_FACTUS
} from '../../graphql/facturacion';
import './ConfiguracionFacturacion.css';

function ConfiguracionFacturacion({ onClose }) {
  const [formData, setFormData] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);

  // Query para obtener configuración actual
  const { data, loading, error } = useQuery(GET_CONFIGURACION_FACTUS);

  // Mutation para actualizar configuración
  const [actualizarConfiguracion, { loading: saving }] = useMutation(ACTUALIZAR_CONFIGURACION_FACTUS, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Configuración actualizada exitosamente' });
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
    },
  });

  // Mutation para probar conexión
  const [probarConexion] = useMutation(PROBAR_CONEXION_FACTUS, {
    onCompleted: (data) => {
      setTestingConnection(false);
      setConnectionResult(data.probarConexionFactus);
      if (data.probarConexionFactus.success) {
        setMensaje({
          tipo: 'success',
          texto: 'Conexión exitosa con Factus'
        });
      } else {
        setMensaje({
          tipo: 'error',
          texto: `Error: ${data.probarConexionFactus.message}`
        });
      }
    },
    onError: (error) => {
      setTestingConnection(false);
      setMensaje({ tipo: 'error', texto: error.message });
    },
  });

  // Cargar datos cuando estén disponibles
  useEffect(() => {
    if (data?.configuracionFactus) {
      setFormData(data.configuracionFactus);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Preparar input (excluir campos que no se deben actualizar)
    const { id, created_at, updated_at, ultima_sincronizacion, __typename, ...input } = formData;

    await actualizarConfiguracion({
      variables: { input }
    });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    setMensaje(null);
    await probarConexion();
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando configuración...</p>
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
            <p style={{ marginTop: '1rem', color: '#ef4444' }}>Error al cargar configuración: {error.message}</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
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
          <div className="modal-config__header-icon modal-config__header-icon--factus">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Facturación Electrónica - Factus</h2>
            <p className="modal-config__subtitle">Configuración de integración con Factus para FE-DIAN</p>
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

        {/* Estado de Facturación Electrónica */}
        <div className="facturacion-status">
          <div className="facturacion-status__indicator">
            <div className={`status-dot ${formData.activo ? 'status-dot--active' : 'status-dot--inactive'}`}></div>
            <div>
              <h3 className="facturacion-status__title">
                {formData.activo ? 'Facturación Electrónica ACTIVA' : 'Facturación Electrónica INACTIVA'}
              </h3>
              <p className="facturacion-status__subtitle">
                {formData.activo
                  ? 'Las facturas se están enviando automáticamente a DIAN vía Factus'
                  : 'Active la facturación electrónica para comenzar a enviar facturas a DIAN'}
              </p>
            </div>
          </div>
          {formData.updated_at && (
            <p className="facturacion-status__last-sync">
              Última actualización: {new Date(formData.updated_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
            </p>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-config__form">
          <div className="form-grid">
            {/* Sección 1: Credenciales Factus */}
            <div className="form-section form-section--full">
              <h3 className="form-section__title">Credenciales de Factus</h3>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="endpoint">Endpoint API *</label>
                  <input
                    type="url"
                    id="endpoint"
                    name="endpoint"
                    value={formData.endpoint || ''}
                    onChange={handleChange}
                    required
                    placeholder="https://api.factus.co"
                  />
                  <small className="form-field__help">
                    URL del API de Factus (producción o pruebas)
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="ambiente">Ambiente *</label>
                  <select
                    id="ambiente"
                    name="ambiente"
                    value={formData.ambiente || 'pruebas'}
                    onChange={handleChange}
                    required
                  >
                    <option value="pruebas">Pruebas (Habilitación)</option>
                    <option value="produccion">Producción</option>
                  </select>
                  <small className="form-field__help">
                    Ambiente DIAN configurado en Factus
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="email">Email (Usuario) *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    required
                    placeholder="usuario@empresa.com"
                  />
                  <small className="form-field__help">
                    Email de acceso al panel de Factus
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password || ''}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <small className="form-field__help">
                    Dejar en blanco para mantener la contraseña actual
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="client_id">Client ID *</label>
                  <input
                    type="text"
                    id="client_id"
                    name="client_id"
                    value={formData.client_id || ''}
                    onChange={handleChange}
                    required
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <small className="form-field__help">
                    Client ID OAuth2 de Factus
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="email_facturacion">Email Facturación</label>
                  <input
                    type="email"
                    id="email_facturacion"
                    name="email_facturacion"
                    value={formData.email_facturacion || ''}
                    onChange={handleChange}
                    placeholder="facturacion@empresa.com"
                  />
                  <small className="form-field__help">
                    Email desde donde se envían las facturas
                  </small>
                </div>
              </div>
            </div>

            {/* Sección 2: Tasas de IVA */}
            <div className="form-section">
              <h3 className="form-section__title">Tasas de IVA</h3>

              <div className="form-field">
                <label htmlFor="iva_hospedaje">IVA Hospedaje (%) *</label>
                <input
                  type="number"
                  id="iva_hospedaje"
                  name="iva_hospedaje"
                  value={formData.iva_hospedaje || 0}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
                <small className="form-field__help">
                  IVA aplicado al servicio de hospedaje
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="iva_consumos">IVA Consumos (%) *</label>
                <input
                  type="number"
                  id="iva_consumos"
                  name="iva_consumos"
                  value={formData.iva_consumos || 19}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
                <small className="form-field__help">
                  IVA aplicado a consumos (minibar, restaurante, etc.)
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="iva_servicios">IVA Servicios (%) *</label>
                <input
                  type="number"
                  id="iva_servicios"
                  name="iva_servicios"
                  value={formData.iva_servicios || 19}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
                <small className="form-field__help">
                  IVA aplicado a servicios adicionales (spa, lavandería, etc.)
                </small>
              </div>
            </div>

            {/* Sección 3: Activación */}
            <div className="form-section">
              <h3 className="form-section__title">Activación</h3>

              <div className="form-checkboxes">
                <label className="checkbox-label checkbox-label--highlighted">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo || false}
                    onChange={handleChange}
                  />
                  <span>
                    <strong>Activar Facturación Electrónica</strong>
                    <br />
                    <small>
                      Al activar, todas las facturas se enviarán automáticamente a DIAN vía Factus durante el checkout
                    </small>
                  </span>
                </label>
              </div>

              <div className="test-connection-box">
                <p className="test-connection-box__title">
                  <Zap size={18} />
                  Probar Conexión con Factus
                </p>
                <p className="test-connection-box__description">
                  Verifica que las credenciales sean correctas y que la conexión con el API de Factus funcione correctamente
                </p>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="btn-test-connection"
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <Loader size={16} className="spinner" />
                      <span>Probando conexión...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span>Probar Conexión</span>
                    </>
                  )}
                </button>

                {connectionResult && (
                  <div className={`connection-result connection-result--${connectionResult.success ? 'success' : 'error'}`}>
                    {connectionResult.success ? (
                      <>
                        <CheckCircle size={20} />
                        <div>
                          <p className="connection-result__title">✅ Conexión Exitosa</p>
                          <p className="connection-result__detail">
                            Endpoint: {connectionResult.endpoint}
                          </p>
                          <p className="connection-result__detail">
                            Ambiente: {connectionResult.ambiente}
                          </p>
                          {connectionResult.token_obtenido && (
                            <p className="connection-result__detail">
                              Token OAuth2: ✅ Obtenido (expira en {connectionResult.expires_in}s)
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={20} />
                        <div>
                          <p className="connection-result__title">❌ Error de Conexión</p>
                          <p className="connection-result__detail">
                            {connectionResult.error || connectionResult.message}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con botones */}
          <div className="modal-config__footer">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader size={16} className="spinner" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConfiguracionFacturacion;
