import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Clock, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { GET_PARAMETROS_GENERALES, UPDATE_PARAMETROS_GENERALES } from '../../graphql/configuracion';
import './ModalConfig.css';

function ModalParametrosGenerales({ onClose }) {
  const [formData, setFormData] = useState({});
  const [mensaje, setMensaje] = useState(null);

  // Query para obtener datos actuales
  const { data, loading, error } = useQuery(GET_PARAMETROS_GENERALES);

  // Mutation para actualizar
  const [actualizarParametros, { loading: saving }] = useMutation(UPDATE_PARAMETROS_GENERALES, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Parámetros actualizados exitosamente' });
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
    if (data?.parametrosGenerales) {
      setFormData(data.parametrosGenerales);
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

    // Preparar input
    const { id, created_at, updated_at, __typename, ...input } = formData;

    await actualizarParametros({
      variables: { input }
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando parámetros...</p>
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

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Parámetros Generales</h2>
            <p className="modal-config__subtitle">Horarios, políticas, IVA y configuraciones operativas</p>
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-config__form">
          <div className="form-grid">
            {/* Sección 1: Horarios */}
            <div className="form-section">
              <h3 className="form-section__title">Horarios de Operación</h3>

              <div className="form-field">
                <label htmlFor="hora_checkin">Hora Check-in *</label>
                <input
                  type="time"
                  id="hora_checkin"
                  name="hora_checkin"
                  value={formData.hora_checkin || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="hora_checkout">Hora Check-out *</label>
                <input
                  type="time"
                  id="hora_checkout"
                  name="hora_checkout"
                  value={formData.hora_checkout || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="hora_apertura">Hora Apertura *</label>
                <input
                  type="time"
                  id="hora_apertura"
                  name="hora_apertura"
                  value={formData.hora_apertura || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="hora_cierre">Hora Cierre *</label>
                <input
                  type="time"
                  id="hora_cierre"
                  name="hora_cierre"
                  value={formData.hora_cierre || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="tolerancia_early_checkin_min">Tolerancia Early Check-in (min)</label>
                <input
                  type="number"
                  id="tolerancia_early_checkin_min"
                  name="tolerancia_early_checkin_min"
                  value={formData.tolerancia_early_checkin_min || ''}
                  onChange={handleChange}
                  min="0"
                  max="480"
                />
              </div>

              <div className="form-field">
                <label htmlFor="cargo_early_checkin_pct">Cargo Early Check-in (%)</label>
                <input
                  type="number"
                  id="cargo_early_checkin_pct"
                  name="cargo_early_checkin_pct"
                  value={formData.cargo_early_checkin_pct || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="form-field">
                <label htmlFor="tolerancia_late_checkout_min">Tolerancia Late Check-out (min)</label>
                <input
                  type="number"
                  id="tolerancia_late_checkout_min"
                  name="tolerancia_late_checkout_min"
                  value={formData.tolerancia_late_checkout_min || ''}
                  onChange={handleChange}
                  min="0"
                  max="480"
                />
              </div>

              <div className="form-field">
                <label htmlFor="cargo_late_checkout_pct">Cargo Late Check-out (%)</label>
                <input
                  type="number"
                  id="cargo_late_checkout_pct"
                  name="cargo_late_checkout_pct"
                  value={formData.cargo_late_checkout_pct || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            {/* Sección 2: Reservas y Cancelaciones */}
            <div className="form-section">
              <h3 className="form-section__title">Reservas y Cancelaciones</h3>

              <div className="form-field">
                <label htmlFor="anticipo_minimo_pct">Anticipo Mínimo (%) *</label>
                <input
                  type="number"
                  id="anticipo_minimo_pct"
                  name="anticipo_minimo_pct"
                  value={formData.anticipo_minimo_pct || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="1"
                />
                <small className="form-field__help">
                  Porcentaje mínimo de anticipo requerido
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="dias_cancelacion_gratuita">Días Cancelación Gratuita</label>
                <input
                  type="number"
                  id="dias_cancelacion_gratuita"
                  name="dias_cancelacion_gratuita"
                  value={formData.dias_cancelacion_gratuita || ''}
                  onChange={handleChange}
                  min="0"
                  max="30"
                />
                <small className="form-field__help">
                  Días de anticipación para cancelar sin cargo
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="penalizacion_cancelacion_pct">Penalización Cancelación (%)</label>
                <input
                  type="number"
                  id="penalizacion_cancelacion_pct"
                  name="penalizacion_cancelacion_pct"
                  value={formData.penalizacion_cancelacion_pct || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="5"
                />
                <small className="form-field__help">
                  Porcentaje del anticipo a retener
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="max_dias_reserva_anticipada">Máx. Días Reserva Anticipada</label>
                <input
                  type="number"
                  id="max_dias_reserva_anticipada"
                  name="max_dias_reserva_anticipada"
                  value={formData.max_dias_reserva_anticipada || ''}
                  onChange={handleChange}
                  min="1"
                  max="365"
                />
              </div>

              <div className="form-field">
                <label htmlFor="max_noches_por_reserva">Máx. Noches por Reserva</label>
                <input
                  type="number"
                  id="max_noches_por_reserva"
                  name="max_noches_por_reserva"
                  value={formData.max_noches_por_reserva || ''}
                  onChange={handleChange}
                  min="1"
                  max="365"
                />
              </div>

              <div className="form-field">
                <label htmlFor="dias_validez_cotizacion">Días Validez Cotización</label>
                <input
                  type="number"
                  id="dias_validez_cotizacion"
                  name="dias_validez_cotizacion"
                  value={formData.dias_validez_cotizacion || ''}
                  onChange={handleChange}
                  min="1"
                  max="90"
                />
              </div>
            </div>

            {/* Sección 3: Impuestos */}
            <div className="form-section">
              <h3 className="form-section__title">Impuestos</h3>

              <div className="form-field">
                <label htmlFor="iva_hospedaje">IVA Hospedaje (%) *</label>
                <input
                  type="number"
                  id="iva_hospedaje"
                  name="iva_hospedaje"
                  value={formData.iva_hospedaje || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="form-field">
                <label htmlFor="iva_consumos">IVA Consumos (%) *</label>
                <input
                  type="number"
                  id="iva_consumos"
                  name="iva_consumos"
                  value={formData.iva_consumos || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="form-field">
                <label htmlFor="iva_servicios">IVA Servicios (%) *</label>
                <input
                  type="number"
                  id="iva_servicios"
                  name="iva_servicios"
                  value={formData.iva_servicios || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="aplica_retefuente"
                    checked={formData.aplica_retefuente || false}
                    onChange={handleChange}
                  />
                  <span>Aplicar Retención en la Fuente</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="porcentaje_retefuente">Porcentaje Retefuente (%)</label>
                <input
                  type="number"
                  id="porcentaje_retefuente"
                  name="porcentaje_retefuente"
                  value={formData.porcentaje_retefuente || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!formData.aplica_retefuente}
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="aplica_ica"
                    checked={formData.aplica_ica || false}
                    onChange={handleChange}
                  />
                  <span>Aplicar ICA</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="porcentaje_ica">Porcentaje ICA (%)</label>
                <input
                  type="number"
                  id="porcentaje_ica"
                  name="porcentaje_ica"
                  value={formData.porcentaje_ica || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!formData.aplica_ica}
                />
              </div>
            </div>

            {/* Sección 4: Mascotas */}
            <div className="form-section">
              <h3 className="form-section__title">Políticas de Mascotas</h3>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="permite_mascotas"
                    checked={formData.permite_mascotas || false}
                    onChange={handleChange}
                  />
                  <span>Permite Mascotas</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="cargo_mascota">Cargo por Mascota (COP/noche)</label>
                <input
                  type="number"
                  id="cargo_mascota"
                  name="cargo_mascota"
                  value={formData.cargo_mascota || ''}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  disabled={!formData.permite_mascotas}
                />
              </div>
            </div>

            {/* Sección 5: Notificaciones */}
            <div className="form-section">
              <h3 className="form-section__title">Notificaciones</h3>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="enviar_confirmacion_reserva"
                    checked={formData.enviar_confirmacion_reserva || false}
                    onChange={handleChange}
                  />
                  <span>Enviar Confirmación de Reserva</span>
                </label>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="enviar_recordatorio_checkin"
                    checked={formData.enviar_recordatorio_checkin || false}
                    onChange={handleChange}
                  />
                  <span>Enviar Recordatorio de Check-in</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="dias_recordatorio_checkin">Días Antes Recordatorio</label>
                <input
                  type="number"
                  id="dias_recordatorio_checkin"
                  name="dias_recordatorio_checkin"
                  value={formData.dias_recordatorio_checkin || ''}
                  onChange={handleChange}
                  min="1"
                  max="30"
                  disabled={!formData.enviar_recordatorio_checkin}
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="enviar_agradecimiento_checkout"
                    checked={formData.enviar_agradecimiento_checkout || false}
                    onChange={handleChange}
                  />
                  <span>Enviar Agradecimiento en Check-out</span>
                </label>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="enviar_factura_email"
                    checked={formData.enviar_factura_email || false}
                    onChange={handleChange}
                  />
                  <span>Enviar Factura por Email</span>
                </label>
              </div>
            </div>

            {/* Sección 6: Alertas */}
            <div className="form-section">
              <h3 className="form-section__title">Alertas del Sistema</h3>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="alerta_stock_bajo"
                    checked={formData.alerta_stock_bajo || false}
                    onChange={handleChange}
                  />
                  <span>Alertas de Stock Bajo</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="alerta_habitaciones_sucias">Alerta Habitaciones Sucias</label>
                <input
                  type="number"
                  id="alerta_habitaciones_sucias"
                  name="alerta_habitaciones_sucias"
                  value={formData.alerta_habitaciones_sucias || ''}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
                <small className="form-field__help">
                  Número de habitaciones sucias para generar alerta
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="alerta_vencimiento_resolucion_dias">Alerta Vencimiento Resolución (días)</label>
                <input
                  type="number"
                  id="alerta_vencimiento_resolucion_dias"
                  name="alerta_vencimiento_resolucion_dias"
                  value={formData.alerta_vencimiento_resolucion_dias || ''}
                  onChange={handleChange}
                  min="1"
                  max="365"
                />
              </div>
            </div>

            {/* Sección 7: Backups y Configuración */}
            <div className="form-section">
              <h3 className="form-section__title">Backups y Configuración</h3>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="backup_automatico"
                    checked={formData.backup_automatico || false}
                    onChange={handleChange}
                  />
                  <span>Backup Automático</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="frecuencia_backup_horas">Frecuencia Backup (horas)</label>
                <input
                  type="number"
                  id="frecuencia_backup_horas"
                  name="frecuencia_backup_horas"
                  value={formData.frecuencia_backup_horas || ''}
                  onChange={handleChange}
                  min="1"
                  max="168"
                  disabled={!formData.backup_automatico}
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="redondeo_facturas"
                    checked={formData.redondeo_facturas || false}
                    onChange={handleChange}
                  />
                  <span>Redondear Facturas</span>
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="decimales_moneda">Decimales Moneda</label>
                <select
                  id="decimales_moneda"
                  name="decimales_moneda"
                  value={formData.decimales_moneda || 2}
                  onChange={handleChange}
                >
                  <option value="0">0 decimales</option>
                  <option value="2">2 decimales</option>
                  <option value="3">3 decimales</option>
                </select>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="mostrar_saldo_cuenta"
                    checked={formData.mostrar_saldo_cuenta || false}
                    onChange={handleChange}
                  />
                  <span>Mostrar Saldo en Cuenta Corriente</span>
                </label>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo !== undefined ? formData.activo : true}
                    onChange={handleChange}
                  />
                  <span>Configuración Activa</span>
                </label>
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
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalParametrosGenerales;
