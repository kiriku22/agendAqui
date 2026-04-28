import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Bell, Loader, AlertCircle, CheckCircle, Mail, MessageSquare, Send } from 'lucide-react';
import { GET_NOTIFICACIONES_CONFIG, UPDATE_NOTIFICACIONES_CONFIG } from '../../graphql/configuracion';
import './ModalConfig.css';

function ModalNotificaciones({ onClose }) {
  const [formData, setFormData] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('email');

  // Query para obtener configuración actual
  const { data, loading, error } = useQuery(GET_NOTIFICACIONES_CONFIG);

  // Mutation para actualizar
  const [actualizarConfig, { loading: saving }] = useMutation(UPDATE_NOTIFICACIONES_CONFIG, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Configuración actualizada exitosamente' });
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
    },
  });

  // Cargar datos cuando estén disponibles
  useEffect(() => {
    if (data?.notificacionesConfig) {
      setFormData(data.notificacionesConfig);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Preparar input (excluir campos sensibles y metadatos)
    const { id, created_at, updated_at, __typename, ...input } = formData;

    await actualizarConfig({
      variables: { input }
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config modal-config--xlarge" onClick={e => e.stopPropagation()}>
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

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Notificaciones</h2>
            <p className="modal-config__subtitle">Configurar Email, SMS, WhatsApp y triggers de notificaciones</p>
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '0 1.5rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          {[
            { id: 'email', label: 'Email', icon: <Mail size={16} /> },
            { id: 'sms', label: 'SMS', icon: <MessageSquare size={16} /> },
            { id: 'whatsapp', label: 'WhatsApp', icon: <Send size={16} /> },
            { id: 'triggers', label: 'Triggers', icon: <Bell size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSeccionActiva(tab.id)}
              style={{
                padding: '1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: seccionActiva === tab.id ? '2px solid #1e40af' : '2px solid transparent',
                color: seccionActiva === tab.id ? '#1e40af' : '#6b7280',
                fontWeight: seccionActiva === tab.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                marginBottom: '-2px'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-config__form">
          {/* Email Configuration */}
          {seccionActiva === 'email' && (
            <div className="form-grid">
              <div className="form-section form-section--full">
                <h3 className="form-section__title">Configuración de Email (SMTP)</h3>

                <div className="form-checkboxes" style={{ marginBottom: '1rem' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="email_habilitado"
                      checked={formData.email_habilitado || false}
                      onChange={handleChange}
                    />
                    <span>Email Habilitado</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Servidor SMTP</h3>

                <div className="form-field">
                  <label htmlFor="email_servidor">Servidor SMTP</label>
                  <input
                    type="text"
                    id="email_servidor"
                    name="email_servidor"
                    value={formData.email_servidor || ''}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    disabled={!formData.email_habilitado}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email_puerto">Puerto</label>
                  <input
                    type="number"
                    id="email_puerto"
                    name="email_puerto"
                    value={formData.email_puerto || ''}
                    onChange={handleChange}
                    placeholder="587"
                    disabled={!formData.email_habilitado}
                  />
                </div>

                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="email_usa_tls"
                      checked={formData.email_usa_tls || false}
                      onChange={handleChange}
                      disabled={!formData.email_habilitado}
                    />
                    <span>Usar TLS/SSL</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Credenciales</h3>

                <div className="form-field">
                  <label htmlFor="email_usuario">Usuario</label>
                  <input
                    type="text"
                    id="email_usuario"
                    name="email_usuario"
                    value={formData.email_usuario || ''}
                    onChange={handleChange}
                    placeholder="tu-email@ejemplo.com"
                    disabled={!formData.email_habilitado}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email_remitente">Email Remitente</label>
                  <input
                    type="email"
                    id="email_remitente"
                    name="email_remitente"
                    value={formData.email_remitente || ''}
                    onChange={handleChange}
                    placeholder="noreply@hotel.com"
                    disabled={!formData.email_habilitado}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email_nombre_remitente">Nombre del Remitente</label>
                  <input
                    type="text"
                    id="email_nombre_remitente"
                    name="email_nombre_remitente"
                    value={formData.email_nombre_remitente || ''}
                    onChange={handleChange}
                    placeholder="Hotel Factufy"
                    disabled={!formData.email_habilitado}
                  />
                </div>
              </div>

              <div className="form-section form-section--full">
                <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                    <strong>Nota de Seguridad:</strong> La contraseña del email se gestiona por separado y no se muestra por seguridad. Para actualizarla, contacte al administrador del sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SMS Configuration */}
          {seccionActiva === 'sms' && (
            <div className="form-grid">
              <div className="form-section form-section--full">
                <h3 className="form-section__title">Configuración de SMS</h3>

                <div className="form-checkboxes" style={{ marginBottom: '1rem' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="sms_habilitado"
                      checked={formData.sms_habilitado || false}
                      onChange={handleChange}
                    />
                    <span>SMS Habilitado</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Proveedor SMS</h3>

                <div className="form-field">
                  <label htmlFor="sms_proveedor">Proveedor</label>
                  <select
                    id="sms_proveedor"
                    name="sms_proveedor"
                    value={formData.sms_proveedor || 'twilio'}
                    onChange={handleChange}
                    disabled={!formData.sms_habilitado}
                  >
                    <option value="twilio">Twilio</option>
                    <option value="messagebird">MessageBird</option>
                    <option value="nexmo">Nexmo</option>
                    <option value="local">Local/Custom</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="sms_remitente">Número Remitente</label>
                  <input
                    type="text"
                    id="sms_remitente"
                    name="sms_remitente"
                    value={formData.sms_remitente || ''}
                    onChange={handleChange}
                    placeholder="+57 300 1234567"
                    disabled={!formData.sms_habilitado}
                  />
                </div>
              </div>

              <div className="form-section">
                <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
                    <strong>Credenciales API:</strong> Las claves API y secretos se gestionan por separado por seguridad y no se muestran aquí.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Configuration */}
          {seccionActiva === 'whatsapp' && (
            <div className="form-grid">
              <div className="form-section form-section--full">
                <h3 className="form-section__title">Configuración de WhatsApp</h3>

                <div className="form-checkboxes" style={{ marginBottom: '1rem' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="whatsapp_habilitado"
                      checked={formData.whatsapp_habilitado || false}
                      onChange={handleChange}
                    />
                    <span>WhatsApp Habilitado</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Proveedor WhatsApp Business</h3>

                <div className="form-field">
                  <label htmlFor="whatsapp_proveedor">Proveedor</label>
                  <select
                    id="whatsapp_proveedor"
                    name="whatsapp_proveedor"
                    value={formData.whatsapp_proveedor || 'twilio'}
                    onChange={handleChange}
                    disabled={!formData.whatsapp_habilitado}
                  >
                    <option value="twilio">Twilio</option>
                    <option value="messagebird">MessageBird</option>
                    <option value="gupshup">Gupshup</option>
                    <option value="api_oficial">WhatsApp Business API (Oficial)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="whatsapp_numero">Número WhatsApp Business</label>
                  <input
                    type="text"
                    id="whatsapp_numero"
                    name="whatsapp_numero"
                    value={formData.whatsapp_numero || ''}
                    onChange={handleChange}
                    placeholder="+57 300 1234567"
                    disabled={!formData.whatsapp_habilitado}
                  />
                </div>
              </div>

              <div className="form-section">
                <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#065f46' }}>
                    <strong>WhatsApp Business API:</strong> Requiere cuenta verificada de WhatsApp Business. Las credenciales se gestionan por separado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Triggers Configuration */}
          {seccionActiva === 'triggers' && (
            <div className="form-grid">
              {/* Reservas */}
              <div className="form-section">
                <h3 className="form-section__title">Notificaciones de Reservas</h3>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Nueva Reserva</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_nueva_reserva_email" checked={formData.notif_nueva_reserva_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_nueva_reserva_sms" checked={formData.notif_nueva_reserva_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_nueva_reserva_whatsapp" checked={formData.notif_nueva_reserva_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Confirmación de Reserva</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_confirmacion_reserva_email" checked={formData.notif_confirmacion_reserva_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_confirmacion_reserva_sms" checked={formData.notif_confirmacion_reserva_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_confirmacion_reserva_whatsapp" checked={formData.notif_confirmacion_reserva_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Cancelación de Reserva</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_cancelacion_reserva_email" checked={formData.notif_cancelacion_reserva_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_cancelacion_reserva_sms" checked={formData.notif_cancelacion_reserva_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_cancelacion_reserva_whatsapp" checked={formData.notif_cancelacion_reserva_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Recordatorio Check-in</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_recordatorio_checkin_email" checked={formData.notif_recordatorio_checkin_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_recordatorio_checkin_sms" checked={formData.notif_recordatorio_checkin_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_recordatorio_checkin_whatsapp" checked={formData.notif_recordatorio_checkin_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    name="notif_dias_antes_recordatorio"
                    value={formData.notif_dias_antes_recordatorio || 1}
                    onChange={handleChange}
                    min="0"
                    max="7"
                    style={{ marginTop: '0.5rem', width: '100px' }}
                  />
                  <small className="form-field__help">Días antes del check-in</small>
                </div>
              </div>

              {/* Hospedaje */}
              <div className="form-section">
                <h3 className="form-section__title">Notificaciones de Hospedaje</h3>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Check-in</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkin_email" checked={formData.notif_checkin_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkin_sms" checked={formData.notif_checkin_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkin_whatsapp" checked={formData.notif_checkin_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Check-out</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkout_email" checked={formData.notif_checkout_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkout_sms" checked={formData.notif_checkout_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_checkout_whatsapp" checked={formData.notif_checkout_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Factura</strong>
                  <div className="form-checkboxes" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_factura_email" checked={formData.notif_factura_email || false} onChange={handleChange} />
                      <span>Email</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_factura_sms" checked={formData.notif_factura_sms || false} onChange={handleChange} />
                      <span>SMS</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="notif_factura_whatsapp" checked={formData.notif_factura_whatsapp || false} onChange={handleChange} />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Administrativas */}
              <div className="form-section form-section--full">
                <h3 className="form-section__title">Notificaciones Administrativas</h3>

                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input type="checkbox" name="notif_stock_bajo_email" checked={formData.notif_stock_bajo_email || false} onChange={handleChange} />
                    <span>Stock Bajo (Email)</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="notif_vencimiento_resolucion_email" checked={formData.notif_vencimiento_resolucion_email || false} onChange={handleChange} />
                    <span>Vencimiento Resolución DIAN (Email)</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="notif_habitaciones_sucias_email" checked={formData.notif_habitaciones_sucias_email || false} onChange={handleChange} />
                    <span>Habitaciones Sucias (Email)</span>
                  </label>
                </div>

                <div className="form-field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="emails_admin">Emails Administrativos</label>
                  <input
                    type="text"
                    id="emails_admin"
                    name="emails_admin"
                    value={formData.emails_admin || ''}
                    onChange={handleChange}
                    placeholder="admin1@hotel.com, admin2@hotel.com"
                  />
                  <small className="form-field__help">
                    Emails separados por comas para recibir notificaciones administrativas
                  </small>
                </div>
              </div>
            </div>
          )}

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
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalNotificaciones;
