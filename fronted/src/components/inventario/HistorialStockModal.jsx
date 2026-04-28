import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { X, Clock, TrendingUp, TrendingDown, RotateCcw, Package, User, Calendar, Filter } from 'lucide-react';
import { GET_MOVIMIENTOS_INVENTARIO } from '../../graphql/inventario';
import './HistorialStockModal.css';

function HistorialStockModal({ onClose, item }) {
  const [tipoFiltro, setTipoFiltro] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Convertir item.id a Int si es string
  const itemId = item?.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : item.id) : null;

  console.log('🔍 HistorialStockModal - item:', item);
  console.log('🔍 HistorialStockModal - itemId:', itemId);
  console.log('🔍 HistorialStockModal - skip:', !itemId);

  const { data, loading, error } = useQuery(GET_MOVIMIENTOS_INVENTARIO, {
    variables: {
      itemInventarioId: itemId,
      tipoMovimiento: tipoFiltro,
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null
    },
    skip: !itemId,
    fetchPolicy: 'network-only'
  });

  console.log('🔍 HistorialStockModal - data:', data);
  console.log('🔍 HistorialStockModal - loading:', loading);
  console.log('🔍 HistorialStockModal - error:', error);

  const movimientos = data?.movimientosInventario || [];

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUp size={20} className="icon-entrada" />;
      case 'salida':
        return <TrendingDown size={20} className="icon-salida" />;
      case 'ajuste':
        return <RotateCcw size={20} className="icon-ajuste" />;
      case 'devolucion':
        return <Package size={20} className="icon-devolucion" />;
      default:
        return <Clock size={20} />;
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Ajuste',
      devolucion: 'Devolución'
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeClass = (tipo) => {
    return `tipo-badge tipo-badge--${tipo}`;
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const limpiarFiltros = () => {
    setTipoFiltro(null);
    setFechaDesde('');
    setFechaHasta('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="historial-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Clock size={24} />
              Historial de Movimientos
            </h2>
            {item && (
              <p className="modal-subtitle">
                {item.nombre} {item.codigo && `(${item.codigo})`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div className="filtros-container">
          <div className="filtros-header">
            <Filter size={18} />
            <span>Filtros</span>
            {(tipoFiltro || fechaDesde || fechaHasta) && (
              <button onClick={limpiarFiltros} className="btn-limpiar">
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="filtros-grid">
            <div className="filtro-field">
              <label>Tipo de Movimiento</label>
              <select
                value={tipoFiltro || ''}
                onChange={(e) => setTipoFiltro(e.target.value || null)}
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
                <option value="devolucion">Devolución</option>
              </select>
            </div>

            <div className="filtro-field">
              <label>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="filtro-field">
              <label>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="modal-content">
          {loading && (
            <div className="loading-state">
              <Clock className="spinner" size={40} />
              <p>Cargando movimientos...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-text">Error: {error.message}</p>
            </div>
          )}

          {!loading && !error && movimientos.length === 0 && (
            <div className="empty-state">
              <Clock size={64} />
              <h3>No hay movimientos</h3>
              <p>
                {tipoFiltro || fechaDesde || fechaHasta
                  ? 'No se encontraron movimientos con los filtros aplicados'
                  : 'Este item no tiene movimientos de stock registrados'}
              </p>
            </div>
          )}

          {!loading && !error && movimientos.length > 0 && (
            <div className="timeline">
              {movimientos.map((mov, index) => (
                <div key={mov.id} className="timeline-item">
                  {/* Línea conectora */}
                  {index < movimientos.length - 1 && <div className="timeline-line" />}

                  {/* Punto indicador */}
                  <div className={`timeline-dot timeline-dot--${mov.tipo_movimiento}`}>
                    {getTipoIcon(mov.tipo_movimiento)}
                  </div>

                  {/* Contenido del movimiento */}
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-header-left">
                        <span className={getTipoBadgeClass(mov.tipo_movimiento)}>
                          {getTipoLabel(mov.tipo_movimiento)}
                        </span>
                        <span className="timeline-cantidad">
                          {mov.tipo_movimiento === 'entrada' || mov.tipo_movimiento === 'devolucion'
                            ? '+'
                            : mov.tipo_movimiento === 'salida'
                            ? '-'
                            : '±'}
                          {mov.cantidad} {item?.unidad_medida || 'unidades'}
                        </span>
                      </div>
                      <div className="timeline-fecha">
                        <Calendar size={14} />
                        {formatFecha(mov.fecha_movimiento)}
                      </div>
                    </div>

                    <div className="timeline-body">
                      <div className="timeline-stock">
                        <div className="stock-info">
                          <span className="stock-label">Stock anterior:</span>
                          <span className="stock-value">{mov.stock_anterior}</span>
                        </div>
                        <div className="stock-arrow">→</div>
                        <div className="stock-info">
                          <span className="stock-label">Stock nuevo:</span>
                          <span className="stock-value stock-value--destacado">
                            {mov.stock_nuevo}
                          </span>
                        </div>
                      </div>

                      {mov.motivo && (
                        <div className="timeline-motivo">
                          <strong>Motivo:</strong> {mov.motivo}
                        </div>
                      )}

                      {mov.usuario && (
                        <div className="timeline-usuario">
                          <User size={14} />
                          {mov.usuario.nombre} {mov.usuario.apellido} (@{mov.usuario.usuario})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        {movimientos.length > 0 && (
          <div className="modal-footer">
            <div className="stats-footer">
              <div className="stat-item">
                <span className="stat-label">Total movimientos:</span>
                <span className="stat-value">{movimientos.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Stock actual:</span>
                <span className="stat-value stat-value--destacado">
                  {item?.stock_actual} {item?.unidad_medida || 'unidades'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistorialStockModal;
