import { createPortal } from 'react-dom';
import { useQuery } from '@apollo/client';
import { GET_HUESPEDES_DEL_CLIENTE } from '../../graphql/huespedes';
import { User, Calendar, Phone, Mail, MapPin, FileText, X, Building2 } from 'lucide-react';
import './ClienteDetalleModal.css';

const ClienteDetalleModal = ({ cliente, onClose }) => {
  const { data, loading, error } = useQuery(GET_HUESPEDES_DEL_CLIENTE, {
    variables: { cliente_id: parseInt(cliente.id) },
    skip: !cliente.id
  });

  const huespedes = data?.huespedesDelCliente || [];

  // Formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return createPortal(
    <div className="ClienteDetalle__overlay" onClick={onClose}>
      <div className="ClienteDetalle__modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ClienteDetalle__header">
          <div className="ClienteDetalle__header-title">
            <User size={24} />
            <h2>Detalles del Cliente</h2>
          </div>
          <button className="ClienteDetalle__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="ClienteDetalle__content">
          {/* Sección: Información del Cliente */}
          <div className="ClienteDetalle__section">
            <div className="ClienteDetalle__section-header">
              <FileText size={18} />
              <h3>Información del Cliente</h3>
            </div>

            <div className="ClienteDetalle__info-grid">
              <div className="ClienteDetalle__info-item">
                <span className="label">Nombre Completo:</span>
                <span className="value">
                  {cliente.nombre} {cliente.apellido || ''}
                </span>
              </div>

              <div className="ClienteDetalle__info-item">
                <span className="label">Documento:</span>
                <span className="value">
                  {cliente.tipo_documento}: {cliente.numero_documento}
                  {cliente.digito_verificacion && ` - DV: ${cliente.digito_verificacion}`}
                </span>
              </div>

              {cliente.tipo_documento_dian && (
                <div className="ClienteDetalle__info-item">
                  <span className="label">Código DIAN:</span>
                  <span className="value">{cliente.tipo_documento_dian}</span>
                </div>
              )}

              {cliente.codigo_municipio && (
                <div className="ClienteDetalle__info-item">
                  <span className="label">Código Municipio DANE:</span>
                  <span className="value">{cliente.codigo_municipio}</span>
                </div>
              )}

              {cliente.fecha_nacimiento && (
                <div className="ClienteDetalle__info-item">
                  <span className="label">Fecha de Nacimiento:</span>
                  <span className="value">{formatFecha(cliente.fecha_nacimiento)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sección: Información Tributaria (solo para NIT) */}
          {cliente.tipo_documento === 'NIT' && (
            <div className="ClienteDetalle__section">
              <div className="ClienteDetalle__section-header">
                <Building2 size={18} />
                <h3>Información Tributaria</h3>
              </div>

              <div className="ClienteDetalle__info-grid">
                {cliente.regimen_tributario && (
                  <div className="ClienteDetalle__info-item">
                    <span className="label">Régimen Tributario:</span>
                    <span className="value">{cliente.regimen_tributario}</span>
                  </div>
                )}

                <div className="ClienteDetalle__info-item">
                  <span className="label">Responsable de IVA:</span>
                  <span className={`value badge ${cliente.responsable_iva ? 'badge-success' : 'badge-neutral'}`}>
                    {cliente.responsable_iva ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección: Datos de Contacto */}
          <div className="ClienteDetalle__section">
            <div className="ClienteDetalle__section-header">
              <Mail size={18} />
              <h3>Datos de Contacto</h3>
            </div>

            <div className="ClienteDetalle__info-grid">
              {cliente.telefono && (
                <div className="ClienteDetalle__info-item">
                  <Phone size={14} className="icon" />
                  <span className="value">{cliente.telefono}</span>
                </div>
              )}

              {cliente.email && (
                <div className="ClienteDetalle__info-item">
                  <Mail size={14} className="icon" />
                  <span className="value">{cliente.email}</span>
                </div>
              )}

              {cliente.direccion && (
                <div className="ClienteDetalle__info-item">
                  <MapPin size={14} className="icon" />
                  <span className="value">{cliente.direccion}</span>
                </div>
              )}

              {cliente.ciudad && (
                <div className="ClienteDetalle__info-item">
                  <span className="label">Ciudad:</span>
                  <span className="value">{cliente.ciudad}, {cliente.pais || 'Colombia'}</span>
                </div>
              )}
            </div>

            {cliente.observaciones && (
              <div className="ClienteDetalle__observaciones">
                <strong>Observaciones:</strong>
                <p>{cliente.observaciones}</p>
              </div>
            )}
          </div>

          {/* Sección: Huéspedes Asociados */}
          <div className="ClienteDetalle__section">
            <div className="ClienteDetalle__section-header">
              <Calendar size={18} />
              <h3>Huéspedes Asociados ({huespedes.length})</h3>
            </div>

            {loading && <p className="ClienteDetalle__loading">Cargando huéspedes...</p>}
            {error && <p className="ClienteDetalle__error">Error al cargar huéspedes</p>}

            {!loading && huespedes.length === 0 && (
              <p className="ClienteDetalle__no-data">Este cliente no tiene huéspedes registrados.</p>
            )}

            {!loading && huespedes.length > 0 && (
              <div className="ClienteDetalle__huespedes-list">
                {huespedes.map((huesped) => (
                  <div key={huesped.id} className="ClienteDetalle__huesped-card">
                    <div className="huesped-header">
                      <h4>{huesped.nombre_completo}</h4>
                      <span className="huesped-fecha">
                        {formatFecha(huesped.created_at)}
                      </span>
                    </div>
                    <div className="huesped-info">
                      <span>
                        {huesped.tipo_documento}: {huesped.numero_documento}
                      </span>
                      {huesped.telefono && (
                        <span>
                          <Phone size={12} /> {huesped.telefono}
                        </span>
                      )}
                      {huesped.email && (
                        <span>
                          <Mail size={12} /> {huesped.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ClienteDetalleModal;
