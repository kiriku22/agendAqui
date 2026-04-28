import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Info, Receipt, ShoppingCart, Plus, User, Home, Calendar, DollarSign } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Loading from '../shared/Loading';
import ConsumosList from '../consumos/ConsumosList';
import AgregarConsumoModal from '../consumos/AgregarConsumoModal';
import CuentaCorriente from './CuentaCorriente';
import { GET_HOSPEDAJE } from '../../graphql/hospedajes';
import { GET_CONSUMOS_POR_HOSPEDAJE } from '../../graphql/consumos';
import './HospedajeDetalleModal.css';

function HospedajeDetalleModal({ isOpen, onClose, hospedajeId, onCheckOut }) {
  const [pestanaActiva, setPestanaActiva] = useState('informacion'); // 'informacion', 'consumos', 'cuenta'
  const [showAgregarConsumo, setShowAgregarConsumo] = useState(false);

  // Query para obtener datos del hospedaje
  const { data, loading, error, refetch } = useQuery(GET_HOSPEDAJE, {
    variables: { id: parseInt(hospedajeId, 10) },
    skip: !hospedajeId || !isOpen,
    fetchPolicy: 'network-only'
  });

  // Query para obtener consumos
  const { data: dataConsumos, refetch: refetchConsumos } = useQuery(GET_CONSUMOS_POR_HOSPEDAJE, {
    variables: { hospedajeId: parseInt(hospedajeId, 10) },
    skip: !hospedajeId || !isOpen,
    fetchPolicy: 'network-only'
  });

  const hospedaje = data?.hospedaje;
  const consumos = dataConsumos?.consumosPorHospedaje || [];

  const handleConsumoAgregado = () => {
    refetchConsumos();
    refetch();
  };

  const handleConsumoEliminado = () => {
    refetchConsumos();
    refetch();
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  const getEstadoBadgeVariant = (estado) => {
    const variants = {
      activo: 'success',
      finalizado: 'secondary',
      cancelado: 'danger'
    };
    return variants[estado] || 'default';
  };

  const pestanas = [
    { id: 'informacion', label: 'Información', icon: Info },
    { id: 'consumos', label: 'Consumos', icon: ShoppingCart, badge: consumos.length },
    { id: 'cuenta', label: 'Cuenta Corriente', icon: Receipt }
  ];

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cargando..." size="large">
        <Loading />
      </Modal>
    );
  }

  if (error || !hospedaje) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Error" size="large">
        <div className="error-message">
          {error ? error.message : 'No se pudo cargar la información del hospedaje'}
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Hospedaje ${hospedaje.codigo}`}
        size="large"
      >
        <div className="hospedaje-detalle-modal">
          {/* Header con información básica */}
          <div className="hospedaje-header">
            <div className="hospedaje-header__info">
              <div className="hospedaje-header__principal">
                <Home size={20} />
                <span>Habitación {hospedaje.habitacion?.numero} - {hospedaje.habitacion?.tipo}</span>
              </div>
              <div className="hospedaje-header__huesped">
                <User size={16} />
                <span>{hospedaje.huesped?.nombre_completo}</span>
              </div>
            </div>
            <Badge variant={getEstadoBadgeVariant(hospedaje.estado)}>
              {hospedaje.estado}
            </Badge>
          </div>

          {/* Pestañas */}
          <div className="pestanas-container">
            <div className="pestanas-header">
              {pestanas.map((pestana) => {
                const IconComponent = pestana.icon;
                return (
                  <button
                    key={pestana.id}
                    type="button"
                    className={`pestana-btn ${pestanaActiva === pestana.id ? 'pestana-btn--active' : ''}`}
                    onClick={() => setPestanaActiva(pestana.id)}
                  >
                    <IconComponent size={18} />
                    <span>{pestana.label}</span>
                    {pestana.badge !== undefined && pestana.badge > 0 && (
                      <span className="pestana-badge">{pestana.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pestanas-content">
              {/* Pestaña: Información */}
              {pestanaActiva === 'informacion' && (
                <div className="info-section">
                  <div className="info-grid">
                    <div className="info-card">
                      <div className="info-card__label">
                        <Calendar size={16} />
                        Check-in
                      </div>
                      <div className="info-card__value">
                        {formatFecha(hospedaje.fecha_entrada)}
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-card__label">
                        <Calendar size={16} />
                        Check-out Esperado
                      </div>
                      <div className="info-card__value">
                        {formatFecha(hospedaje.fecha_salida_prevista)}
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-card__label">
                        <DollarSign size={16} />
                        Precio por Noche
                      </div>
                      <div className="info-card__value info-card__value--price">
                        {formatPrecio(hospedaje.precio_noche)}
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-card__label">
                        Noches
                      </div>
                      <div className="info-card__value">
                        {hospedaje.noches_previstas} {hospedaje.noches_previstas === 1 ? 'noche' : 'noches'}
                      </div>
                    </div>
                  </div>

                  {hospedaje.observaciones && (
                    <div className="observaciones-section">
                      <h4>Observaciones</h4>
                      <p>{hospedaje.observaciones}</p>
                    </div>
                  )}

                  {hospedaje.notas_especiales && (
                    <div className="notas-section">
                      <h4>Notas Especiales</h4>
                      <p>{hospedaje.notas_especiales}</p>
                    </div>
                  )}

                  {hospedaje.acompanantes && hospedaje.acompanantes.length > 0 && (
                    <div className="acompanantes-section">
                      <h4>Acompañantes ({hospedaje.acompanantes.length})</h4>
                      <div className="acompanantes-list">
                        {hospedaje.acompanantes.map((acomp, index) => (
                          <div key={index} className="acompanante-item">
                            <User size={16} />
                            <span>{acomp.nombre}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña: Consumos */}
              {pestanaActiva === 'consumos' && (
                <div className="consumos-section">
                  {hospedaje.estado === 'activo' && (
                    <div className="consumos-section__header">
                      <Button
                        variant="primary"
                        onClick={() => setShowAgregarConsumo(true)}
                        icon={<Plus size={18} />}
                      >
                        Agregar Consumo
                      </Button>
                    </div>
                  )}

                  <ConsumosList
                    consumos={consumos}
                    onConsumoEliminado={handleConsumoEliminado}
                    showActions={hospedaje.estado === 'activo'}
                  />
                </div>
              )}

              {/* Pestaña: Cuenta Corriente */}
              {pestanaActiva === 'cuenta' && (
                <div className="cuenta-section">
                  <CuentaCorriente hospedajeId={hospedajeId} />
                </div>
              )}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {hospedaje.estado === 'activo' && onCheckOut && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onCheckOut(hospedaje);
                }}
              >
                Realizar Check-Out
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal para agregar consumo */}
      <AgregarConsumoModal
        isOpen={showAgregarConsumo}
        onClose={() => setShowAgregarConsumo(false)}
        hospedajeId={hospedajeId}
        habitacionId={hospedaje.habitacion?.id}
        onSuccess={handleConsumoAgregado}
      />
    </>
  );
}

export default HospedajeDetalleModal;
