import {
  Calendar,
  User,
  CreditCard,
  Clock,
  Home,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import './ReservaDetalleModal.css';

const ReservaDetalleModal = ({ isOpen, onClose, reserva, onConfirmar, onCancelar }) => {
  if (!reserva) return null;

  // Configuración de badges según estado
  const estadoConfig = {
    pendiente: {
      label: 'Pendiente',
      color: '#f59e0b',
      icon: AlertCircle
    },
    confirmada: {
      label: 'Confirmada',
      color: '#3b82f6',
      icon: CheckCircle
    },
    en_curso: {
      label: 'En Curso',
      color: '#10b981',
      icon: CheckCircle
    },
    finalizada: {
      label: 'Finalizada',
      color: '#6b7280',
      icon: CheckCircle
    },
    cancelada: {
      label: 'Cancelada',
      color: '#ef4444',
      icon: XCircle
    },
    no_show: {
      label: 'No Show',
      color: '#ef4444',
      icon: XCircle
    }
  };

  const estadoInfo = estadoConfig[reserva.estado] || estadoConfig.pendiente;
  const EstadoIcon = estadoInfo.icon;

  // Formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Formatear fecha con hora
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular número de noches
  const noches = reserva.noches || 0;

  // Verificar qué botones de acción mostrar
  const mostrarBotones = reserva.estado === 'pendiente' || reserva.estado === 'confirmada';
  const mostrarConfirmar = reserva.estado === 'pendiente';
  const mostrarCancelar = reserva.estado === 'pendiente' || reserva.estado === 'confirmada';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de la Reserva"
      size="large"
    >
      <div className="reserva-detalle">
        {/* Header con código y estado */}
        <div className="reserva-detalle__header">
          <div className="reserva-detalle__codigo">
            <span className="codigo-label">Código de Reserva</span>
            <span className="codigo-value">{reserva.codigo}</span>
          </div>
          <div
            className="reserva-detalle__badge"
            style={{ backgroundColor: `${estadoInfo.color}15`, border: `2px solid ${estadoInfo.color}` }}
          >
            <EstadoIcon size={18} style={{ color: estadoInfo.color }} />
            <span style={{ color: estadoInfo.color }}>{estadoInfo.label}</span>
          </div>
        </div>

        {/* Sección: Información del Huésped */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <User size={18} />
            Información del Huésped
          </h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nombre Completo</span>
                <span className="info-value">{reserva.huesped?.nombre_completo || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Documento</span>
                <span className="info-value">
                  {reserva.huesped?.tipo_documento}: {reserva.huesped?.numero_documento || 'N/A'}
                </span>
              </div>
              {reserva.huesped?.telefono && (
                <div className="info-item">
                  <Phone size={14} className="info-icon" />
                  <span className="info-label">Teléfono</span>
                  <span className="info-value">{reserva.huesped.telefono}</span>
                </div>
              )}
              {reserva.huesped?.email && (
                <div className="info-item">
                  <Mail size={14} className="info-icon" />
                  <span className="info-label">Email</span>
                  <span className="info-value">{reserva.huesped.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección: Información de la Habitación */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <Home size={18} />
            Información de la Habitación
          </h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Número de Habitación</span>
                <span className="info-value info-value--highlight">
                  {reserva.habitacion?.numero || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Tipo</span>
                <span className="info-value">{reserva.habitacion?.tipo || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Piso</span>
                <span className="info-value">{reserva.habitacion?.piso || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Estado Actual</span>
                <span className="info-value">{reserva.habitacion?.estado || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Fechas y Estadía */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <Calendar size={18} />
            Fechas y Estadía
          </h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Fecha de Entrada</span>
                <span className="info-value">{formatDate(reserva.fecha_entrada)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Fecha de Salida</span>
                <span className="info-value">{formatDate(reserva.fecha_salida)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Número de Noches</span>
                <span className="info-value info-value--highlight">
                  {noches} {noches === 1 ? 'noche' : 'noches'}
                </span>
              </div>
              <div className="info-item">
                <Users size={14} className="info-icon" />
                <span className="info-label">Huéspedes</span>
                <span className="info-value">
                  {reserva.num_adultos || 0} adultos, {reserva.num_ninos || 0} niños
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Información Financiera */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <CreditCard size={18} />
            Información Financiera
          </h3>
          <div className="section-content">
            <div className="info-grid info-grid--financial">
              <div className="info-item">
                <span className="info-label">Precio por Noche</span>
                <span className="info-value">{formatCurrency(reserva.precio_noche)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Precio Total</span>
                <span className="info-value info-value--large">{formatCurrency(reserva.precio_total)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Anticipo</span>
                <span className="info-value" style={{ color: '#10b981' }}>
                  {formatCurrency(reserva.anticipo)}
                </span>
              </div>
              <div className="info-item info-item--highlight">
                <span className="info-label">Saldo Pendiente</span>
                <span className="info-value info-value--large" style={{ color: '#f59e0b' }}>
                  {formatCurrency(reserva.saldo_pendiente)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Información Adicional */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <FileText size={18} />
            Información Adicional
          </h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <MapPin size={14} className="info-icon" />
                <span className="info-label">Canal de Reserva</span>
                <span className="info-value">{reserva.canal_reserva || 'directo'}</span>
              </div>
              {reserva.observaciones && (
                <div className="info-item info-item--full">
                  <span className="info-label">Observaciones</span>
                  <span className="info-value">{reserva.observaciones}</span>
                </div>
              )}
              {reserva.notas_especiales && (
                <div className="info-item info-item--full">
                  <span className="info-label">Notas Especiales</span>
                  <span className="info-value info-value--notes">{reserva.notas_especiales}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección: Registro de Fechas */}
        <div className="reserva-detalle__section">
          <h3 className="section-title">
            <Clock size={18} />
            Registro de Fechas
          </h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Fecha de Creación</span>
                <span className="info-value">{formatDateTime(reserva.created_at)}</span>
              </div>
              {reserva.confirmed_at && (
                <div className="info-item">
                  <span className="info-label">Fecha de Confirmación</span>
                  <span className="info-value" style={{ color: '#3b82f6' }}>
                    {formatDateTime(reserva.confirmed_at)}
                  </span>
                </div>
              )}
              {reserva.cancelled_at && (
                <div className="info-item">
                  <span className="info-label">Fecha de Cancelación</span>
                  <span className="info-value" style={{ color: '#ef4444' }}>
                    {formatDateTime(reserva.cancelled_at)}
                  </span>
                </div>
              )}
              {reserva.motivo_cancelacion && (
                <div className="info-item info-item--full">
                  <span className="info-label">Motivo de Cancelación</span>
                  <span className="info-value" style={{ color: '#ef4444' }}>
                    {reserva.motivo_cancelacion}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        {mostrarBotones && (
          <div className="reserva-detalle__actions">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {mostrarCancelar && onCancelar && (
              <Button
                variant="danger"
                onClick={() => onCancelar(reserva)}
              >
                <XCircle size={18} />
                Cancelar Reserva
              </Button>
            )}
            {mostrarConfirmar && onConfirmar && (
              <Button
                variant="primary"
                onClick={() => onConfirmar(reserva)}
              >
                <CheckCircle size={18} />
                Confirmar Reserva
              </Button>
            )}
          </div>
        )}

        {/* Solo botón cerrar si no hay acciones */}
        {!mostrarBotones && (
          <div className="reserva-detalle__actions">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReservaDetalleModal;
