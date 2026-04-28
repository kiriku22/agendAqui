import { useQuery } from '@apollo/client';
import { X, FileText, Download, ExternalLink, Loader, AlertCircle, CheckCircle, Copy, Calendar, Hash } from 'lucide-react';
import { GET_FACTURA_ELECTRONICA } from '../../graphql/facturacion';
import './FacturaElectronica.css';

function FacturaElectronica({ facturaElectronicaId, onClose }) {
  // Query para obtener los detalles de la FE
  const { data, loading, error } = useQuery(GET_FACTURA_ELECTRONICA, {
    variables: { id: facturaElectronicaId },
    skip: !facturaElectronicaId,
  });

  const handleCopyCUFE = () => {
    if (data?.facturaElectronica?.cufe) {
      navigator.clipboard.writeText(data.facturaElectronica.cufe);
      // Mostrar feedback visual (opcional)
      alert('CUFE copiado al portapapeles');
    }
  };

  const handleDownloadPDF = () => {
    if (data?.facturaElectronica?.url_pdf) {
      window.open(data.facturaElectronica.url_pdf, '_blank');
    }
  };

  const handleDownloadXML = () => {
    if (data?.facturaElectronica?.url_xml) {
      window.open(data.facturaElectronica.url_xml, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-fe" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando factura electrónica...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-fe" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} color="#ef4444" />
            <p style={{ marginTop: '1rem', color: '#ef4444' }}>Error al cargar factura: {error.message}</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fe = data?.facturaElectronica;

  if (!fe) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-fe" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} color="#f59e0b" />
            <p style={{ marginTop: '1rem', color: '#92400e' }}>Factura electrónica no encontrada</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determinar estado visual
  const getEstadoInfo = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'aceptada':
      case 'aprobada':
        return { color: 'success', icon: CheckCircle, text: 'Aceptada por DIAN' };
      case 'rechazada':
        return { color: 'danger', icon: AlertCircle, text: 'Rechazada por DIAN' };
      case 'pendiente':
        return { color: 'warning', icon: Loader, text: 'Pendiente de respuesta' };
      default:
        return { color: 'info', icon: FileText, text: estado || 'Desconocido' };
    }
  };

  const estadoInfo = getEstadoInfo(fe.estado_dian);
  const EstadoIcon = estadoInfo.icon;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-fe" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-fe__header">
          <div className="modal-fe__header-icon">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="modal-fe__title">Factura Electrónica DIAN</h2>
            <p className="modal-fe__subtitle">
              {fe.numero_factura_dian || 'Sin número DIAN'} • {fe.factura?.numero || 'N/A'}
            </p>
          </div>
          <button onClick={onClose} className="modal-fe__close">
            <X size={20} />
          </button>
        </div>

        {/* Estado de la FE */}
        <div className={`fe-status fe-status--${estadoInfo.color}`}>
          <EstadoIcon size={24} />
          <div>
            <p className="fe-status__title">{estadoInfo.text}</p>
            {fe.fecha_respuesta_dian && (
              <p className="fe-status__date">
                Respuesta: {new Date(fe.fecha_respuesta_dian).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
              </p>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="modal-fe__content">
          {/* CUFE */}
          <div className="fe-section">
            <h3 className="fe-section__title">
              <Hash size={18} />
              CUFE (Código Único de Facturación Electrónica)
            </h3>
            <div className="cufe-box">
              <code className="cufe-code">{fe.cufe || 'No disponible'}</code>
              {fe.cufe && (
                <button onClick={handleCopyCUFE} className="btn-copy" title="Copiar CUFE">
                  <Copy size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Información General */}
          <div className="fe-section">
            <h3 className="fe-section__title">
              <Calendar size={18} />
              Información General
            </h3>
            <div className="fe-info-grid">
              <div className="fe-info-item">
                <span className="fe-info-item__label">Factura Interna:</span>
                <span className="fe-info-item__value">{fe.factura?.numero || 'N/A'}</span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Número DIAN:</span>
                <span className="fe-info-item__value">{fe.numero_factura_dian || 'N/A'}</span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Prefijo:</span>
                <span className="fe-info-item__value">{fe.prefijo || 'N/A'}</span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">ID Factus:</span>
                <span className="fe-info-item__value">{fe.factus_id || 'N/A'}</span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Total:</span>
                <span className="fe-info-item__value fe-info-item__value--amount">
                  ${fe.factura?.total ? parseFloat(fe.factura.total).toLocaleString('es-CO') : 'N/A'}
                </span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Fecha Factura:</span>
                <span className="fe-info-item__value">
                  {fe.factura?.fecha ? new Date(fe.factura.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : 'N/A'}
                </span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Fecha Envío:</span>
                <span className="fe-info-item__value">
                  {fe.fecha_envio ? new Date(fe.fecha_envio).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'N/A'}
                </span>
              </div>
              <div className="fe-info-item">
                <span className="fe-info-item__label">Estado DIAN:</span>
                <span className={`fe-badge fe-badge--${estadoInfo.color}`}>
                  {fe.estado_dian || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones de la factura */}
          {fe.factura?.observaciones && (
            <div className="fe-section">
              <h3 className="fe-section__title">Observaciones</h3>
              <p className="fe-observaciones">{fe.factura.observaciones}</p>
            </div>
          )}

          {/* Errores de validación (si existen) */}
          {fe.errores_validacion && (
            <div className="fe-section">
              <h3 className="fe-section__title fe-section__title--error">
                <AlertCircle size={18} />
                Errores de Validación
              </h3>
              <div className="fe-errores">
                {typeof fe.errores_validacion === 'string' ? (
                  <p>{fe.errores_validacion}</p>
                ) : (
                  <pre>{JSON.stringify(fe.errores_validacion, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          {/* Snapshots (si existen) */}
          {(fe.datos_cliente_snapshot || fe.datos_factura_snapshot) && (
            <div className="fe-section">
              <h3 className="fe-section__title">Datos Históricos (Snapshots)</h3>
              <div className="fe-snapshots">
                {fe.datos_cliente_snapshot && (
                  <details className="fe-snapshot-details">
                    <summary>Datos del Cliente</summary>
                    <pre>{JSON.stringify(fe.datos_cliente_snapshot, null, 2)}</pre>
                  </details>
                )}
                {fe.datos_factura_snapshot && (
                  <details className="fe-snapshot-details">
                    <summary>Datos de la Factura</summary>
                    <pre>{JSON.stringify(fe.datos_factura_snapshot, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="modal-fe__footer">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
          <div className="modal-fe__actions">
            {fe.url_xml && (
              <button onClick={handleDownloadXML} className="btn-download btn-download--xml">
                <Download size={16} />
                <span>Descargar XML</span>
              </button>
            )}
            {fe.url_pdf && (
              <button onClick={handleDownloadPDF} className="btn-download btn-download--pdf">
                <ExternalLink size={16} />
                <span>Ver PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacturaElectronica;
