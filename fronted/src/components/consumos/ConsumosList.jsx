import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Edit2, Trash2, Calendar, DollarSign, Hash, CheckCircle, Clock } from 'lucide-react';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import ConfirmModal from '../shared/ConfirmModal';
import SuccessModal from '../shared/SuccessModal';
import { ELIMINAR_CONSUMO } from '../../graphql/consumos';
import './ConsumosList.css';

function ConsumosList({ consumos, onEditConsumo, onConsumoEliminado, showActions = true }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [consumoToDelete, setConsumoToDelete] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const [eliminarConsumo, { loading: eliminando }] = useMutation(ELIMINAR_CONSUMO, {
    onCompleted: () => {
      setShowConfirmDelete(false);
      setSuccessMessage('El consumo ha sido eliminado exitosamente');
      setShowSuccess(true);
      if (onConsumoEliminado) onConsumoEliminado();
    },
    onError: (error) => {
      console.error('Error al eliminar consumo:', error);
      setErrorModal({ isOpen: true, message: `Error al eliminar: ${error.message}` });
    }
  });

  const handleEliminar = (consumo) => {
    setConsumoToDelete(consumo);
    setShowConfirmDelete(true);
  };

  const confirmarEliminacion = async () => {
    if (!consumoToDelete) return;
    await eliminarConsumo({
      variables: { id: parseInt(consumoToDelete.id, 10) }
    });
    setConsumoToDelete(null);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
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

  const getCategoriaIcon = (consumo) => {
    // Intentar obtener categoría del servicio o producto
    const categoria = consumo.servicio_nombre ? 'servicio' : 'producto';
    return categoria === 'servicio' ? '🛎️' : '📦';
  };

  // Agrupar consumos por fecha
  const consumosAgrupados = consumos.reduce((grupos, consumo) => {
    const fecha = new Date(consumo.fecha_consumo).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!grupos[fecha]) {
      grupos[fecha] = [];
    }
    grupos[fecha].push(consumo);
    return grupos;
  }, {});

  // Calcular totales
  const totalConsumos = consumos.reduce((sum, c) => sum + parseFloat(c.precio_total), 0);
  const totalFacturados = consumos
    .filter(c => c.facturado)
    .reduce((sum, c) => sum + parseFloat(c.precio_total), 0);
  const totalPendientes = consumos
    .filter(c => !c.facturado)
    .reduce((sum, c) => sum + parseFloat(c.precio_total), 0);

  if (consumos.length === 0) {
    return (
      <div className="consumos-empty">
        <div className="consumos-empty__icon">📋</div>
        <h3>No hay consumos registrados</h3>
        <p>Los consumos aparecerán aquí una vez sean agregados al hospedaje</p>
      </div>
    );
  }

  return (
    <div className="consumos-list">
      {/* Resumen de totales */}
      <div className="consumos-summary">
        <div className="summary-card">
          <div className="summary-label">Total General</div>
          <div className="summary-value summary-value--total">{formatPrecio(totalConsumos)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Facturado</div>
          <div className="summary-value summary-value--facturado">{formatPrecio(totalFacturados)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pendiente</div>
          <div className="summary-value summary-value--pendiente">{formatPrecio(totalPendientes)}</div>
        </div>
      </div>

      {/* Lista de consumos agrupados por fecha */}
      {Object.entries(consumosAgrupados).map(([fecha, consumosDia]) => (
        <div key={fecha} className="consumos-group">
          <div className="consumos-group__header">
            <Calendar size={16} />
            <span>{fecha}</span>
            <Badge variant="secondary">{consumosDia.length} {consumosDia.length === 1 ? 'consumo' : 'consumos'}</Badge>
          </div>

          <div className="consumos-group__items">
            {consumosDia.map((consumo) => (
              <div key={consumo.id} className={`consumo-item ${consumo.facturado ? 'consumo-item--facturado' : ''}`}>
                <div className="consumo-item__icon">
                  {getCategoriaIcon(consumo)}
                </div>

                <div className="consumo-item__content">
                  <div className="consumo-item__header">
                    <div className="consumo-item__titulo">
                      {consumo.descripcion}
                    </div>
                    <Badge variant={consumo.facturado ? 'success' : 'warning'}>
                      {consumo.facturado ? (
                        <>
                          <CheckCircle size={14} />
                          Facturado
                        </>
                      ) : (
                        <>
                          <Clock size={14} />
                          Pendiente
                        </>
                      )}
                    </Badge>
                  </div>

                  {(consumo.servicio_nombre || consumo.producto_nombre) && (
                    <div className="consumo-item__subtitulo">
                      {consumo.servicio_nombre || consumo.producto_nombre}
                    </div>
                  )}

                  <div className="consumo-item__detalles">
                    <div className="detalle-item">
                      <Hash size={14} />
                      <span>Cantidad: {consumo.cantidad}</span>
                    </div>
                    <div className="detalle-item">
                      <DollarSign size={14} />
                      <span>Precio unit.: {formatPrecio(consumo.precio_unitario)}</span>
                    </div>
                    <div className="detalle-item">
                      <Clock size={14} />
                      <span>{formatFecha(consumo.fecha_consumo)}</span>
                    </div>
                  </div>

                  {consumo.notas && (
                    <div className="consumo-item__notas">
                      <em>"{consumo.notas}"</em>
                    </div>
                  )}
                </div>

                <div className="consumo-item__precio">
                  {formatPrecio(consumo.precio_total)}
                </div>

                {showActions && !consumo.facturado && (
                  <div className="consumo-item__acciones">
                    <button
                      type="button"
                      className="accion-btn accion-btn--editar"
                      onClick={() => onEditConsumo && onEditConsumo(consumo)}
                      title="Editar consumo"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="accion-btn accion-btn--eliminar"
                      onClick={() => handleEliminar(consumo)}
                      title="Eliminar consumo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setConsumoToDelete(null);
        }}
        onConfirm={confirmarEliminacion}
        title="Eliminar Consumo"
        message={`¿Estás seguro de eliminar el consumo "${consumoToDelete?.descripcion}"? Esta acción no se puede deshacer.`}
        variant="danger"
        confirmText="Eliminar"
        loading={eliminando}
      />

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Consumo Eliminado"
        message={successMessage}
        type="success"
      />

      {/* Modal de error */}
      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </div>
  );
}

export default ConsumosList;
