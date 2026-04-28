import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  AlertCircle,
  Edit,
  CreditCard
} from 'lucide-react';
import './HuespedDetalleModal.css';

function HuespedDetalleModal({ isOpen, onClose, huesped, onEdit }) {
  if (!isOpen || !huesped) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTipoDocumentoBadgeVariant = (tipo) => {
    const variants = {
      'CC': 'info',
      'CE': 'warning',
      'Pasaporte': 'success',
      'TI': 'secondary',
      'NIT': 'default',
      'Otro': 'default'
    };
    return variants[tipo] || 'default';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Huésped" size="large">
      <div className="huesped-detalle-container">
        {/* Header con información principal */}
        <div className="huesped-detalle-header">
          <div className="header-info">
            <h2 className="huesped-detalle-nombre">{huesped.nombre_completo || 'Sin nombre'}</h2>
            <div className="header-badges">
              <Badge variant={getTipoDocumentoBadgeVariant(huesped.tipo_documento)}>
                {huesped.tipo_documento}
              </Badge>
              <span className="documento-numero">
                <CreditCard size={14} />
                {huesped.numero_documento}
              </span>
              <Badge variant="info">
                <Globe size={14} />
                {huesped.nacionalidad}
              </Badge>
            </div>
            <div className="header-fecha">
              <Calendar size={14} />
              Registrado el {formatDate(huesped.created_at)}
            </div>
          </div>
        </div>

        {/* Secciones de información */}
        <div className="huesped-detalle-body">
          {/* Información Personal */}
          <div className="info-section">
            <h3 className="info-section-title">
              <User size={18} />
              Información Personal
            </h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Nombre Completo:</span>
                <span className="info-value">{huesped.nombre_completo || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Fecha de Nacimiento:</span>
                <span className="info-value">{formatDate(huesped.fecha_nacimiento)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nacionalidad:</span>
                <span className="info-value">{huesped.nacionalidad || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tipo de Documento:</span>
                <span className="info-value">{huesped.tipo_documento}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Número de Documento:</span>
                <span className="info-value">{huesped.numero_documento}</span>
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="info-section">
            <h3 className="info-section-title">
              <Phone size={18} />
              Información de Contacto
            </h3>
            <div className="info-grid">
              {huesped.telefono && (
                <div className="info-row clickable">
                  <span className="info-label">
                    <Phone size={14} />
                    Teléfono:
                  </span>
                  <a href={`tel:${huesped.telefono}`} className="info-value-link">
                    {huesped.telefono}
                  </a>
                </div>
              )}
              {huesped.email && (
                <div className="info-row clickable">
                  <span className="info-label">
                    <Mail size={14} />
                    Email:
                  </span>
                  <a href={`mailto:${huesped.email}`} className="info-value-link">
                    {huesped.email}
                  </a>
                </div>
              )}
              {huesped.direccion && (
                <div className="info-row">
                  <span className="info-label">
                    <MapPin size={14} />
                    Dirección:
                  </span>
                  <span className="info-value">
                    {huesped.direccion}
                    {huesped.ciudad && `, ${huesped.ciudad}`}
                    {huesped.pais && `, ${huesped.pais}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Contacto de Emergencia */}
          {(huesped.contacto_emergencia || huesped.telefono_emergencia) && (
            <div className="info-section emergency-section">
              <h3 className="info-section-title">
                <AlertCircle size={18} />
                Contacto de Emergencia
              </h3>
              <div className="info-grid">
                {huesped.contacto_emergencia && (
                  <div className="info-row">
                    <span className="info-label">Nombre del Contacto:</span>
                    <span className="info-value">{huesped.contacto_emergencia}</span>
                  </div>
                )}
                {huesped.telefono_emergencia && (
                  <div className="info-row clickable">
                    <span className="info-label">
                      <Phone size={14} />
                      Teléfono:
                    </span>
                    <a href={`tel:${huesped.telefono_emergencia}`} className="info-value-link">
                      {huesped.telefono_emergencia}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {huesped.observaciones && (
            <div className="info-section">
              <h3 className="info-section-title">Observaciones</h3>
              <div className="observaciones-content">
                <p>{huesped.observaciones}</p>
              </div>
            </div>
          )}

          {/* Preferencias */}
          {huesped.preferencias && Object.keys(huesped.preferencias).length > 0 && (
            <div className="info-section">
              <h3 className="info-section-title">Preferencias</h3>
              <div className="preferencias-badges">
                {Object.entries(huesped.preferencias).map(([key, value]) => (
                  <Badge key={key} variant="secondary">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Historial - Placeholder */}
          <div className="info-section">
            <h3 className="info-section-title">Historial de Estadías</h3>
            <div className="historial-placeholder">
              <p>El historial de reservas y hospedajes se mostrará aquí.</p>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="huesped-detalle-footer">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cerrar
          </Button>
          {onEdit && (
            <Button
              variant="primary"
              icon={<Edit size={18} />}
              onClick={() => {
                onEdit(huesped);
                onClose();
              }}
            >
              Editar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default HuespedDetalleModal;
