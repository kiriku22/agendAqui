import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_FACTURAS } from '../graphql/facturacion';
import Loading from '../components/shared/Loading';
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Eye,
  X,
  DollarSign,
  CreditCard,
  ShoppingCart,
  LogOut,
  Receipt,
} from 'lucide-react';
import './Facturacion.css';

function Facturacion() {
  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    busqueda: '',
    tipoFactura: '',
  });

  const [appliedFilters, setAppliedFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    busqueda: '',
    tipoFactura: '',
  });

  const [facturaDetalle, setFacturaDetalle] = useState(null);

  const { data, loading, error } = useQuery(GET_FACTURAS, {
    variables: {
      fechaDesde: appliedFilters.fechaDesde || undefined,
      fechaHasta: appliedFilters.fechaHasta || undefined,
      busqueda: appliedFilters.busqueda || undefined,
      tipoFactura: appliedFilters.tipoFactura || undefined,
      limite: 200,
    },
    fetchPolicy: 'network-only',
  });

  const facturas = data?.facturas || [];

  const handleBuscar = () => {
    setAppliedFilters({ ...filters });
  };

  const handleLimpiar = () => {
    const empty = { fechaDesde: '', fechaHasta: '', busqueda: '', tipoFactura: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Totales del periodo
  const totalFacturas = facturas.length;
  const sumaTotal = facturas.reduce((acc, f) => acc + (parseFloat(f.total) || 0), 0);

  const getTipoLabel = (factura) => {
    if (factura.hospedaje_id && !factura.cliente_id) return 'Checkout';
    return 'POS';
  };

  const getTipoBadgeClass = (factura) => {
    if (factura.hospedaje_id && !factura.cliente_id) return 'facturacion__badge--checkout';
    return 'facturacion__badge--pos';
  };

  // Parse detalles y metodos_pago from JSON
  const parseJSON = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    if (typeof val === 'object') return [val];
    return [];
  };

  return (
    <div className="facturacion-page">
      {/* Header */}
      <div className="facturacion__header">
        <div className="facturacion__header-info">
          <h1 className="facturacion__title">
            <FileText size={28} />
            Facturación
          </h1>
          <p className="facturacion__subtitle">Historial de facturas generadas</p>
        </div>
        <div className="facturacion__header-stats">
          <div className="facturacion__stat">
            <Receipt size={18} />
            <span>{totalFacturas} factura{totalFacturas !== 1 ? 's' : ''}</span>
          </div>
          <div className="facturacion__stat facturacion__stat--total">
            <DollarSign size={18} />
            <span>{formatCurrency(sumaTotal)}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="facturacion__filters">
        <div className="facturacion__filter-group">
          <label className="facturacion__filter-label">
            <Calendar size={14} />
            Desde
          </label>
          <input
            type="date"
            className="facturacion__input"
            value={filters.fechaDesde}
            onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="facturacion__filter-group">
          <label className="facturacion__filter-label">
            <Calendar size={14} />
            Hasta
          </label>
          <input
            type="date"
            className="facturacion__input"
            value={filters.fechaHasta}
            onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="facturacion__filter-group facturacion__filter-group--search">
          <label className="facturacion__filter-label">
            <Search size={14} />
            Buscar
          </label>
          <input
            type="text"
            className="facturacion__input"
            placeholder="Número, cliente, documento..."
            value={filters.busqueda}
            onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="facturacion__filter-group">
          <label className="facturacion__filter-label">
            <Filter size={14} />
            Tipo
          </label>
          <select
            className="facturacion__input"
            value={filters.tipoFactura}
            onChange={(e) => setFilters({ ...filters, tipoFactura: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="pos">POS</option>
            <option value="checkout">Checkout</option>
          </select>
        </div>
        <div className="facturacion__filter-actions">
          <button className="facturacion__btn facturacion__btn--primary" onClick={handleBuscar}>
            <Search size={16} />
            Buscar
          </button>
          <button className="facturacion__btn facturacion__btn--secondary" onClick={handleLimpiar}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="facturacion__error">Error al cargar facturas: {error.message}</div>
      ) : facturas.length === 0 ? (
        <div className="facturacion__empty">
          <FileText size={48} />
          <h3>No se encontraron facturas</h3>
          <p>Ajusta los filtros o realiza una venta desde el POS</p>
        </div>
      ) : (
        <div className="facturacion__table-container">
          <table className="facturacion__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th className="facturacion__th--right">Subtotal</th>
                <th className="facturacion__th--right">IVA</th>
                <th className="facturacion__th--right">Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((factura) => (
                <tr key={factura.id} className="facturacion__row" onClick={() => setFacturaDetalle(factura)}>
                  <td className="facturacion__cell--numero">
                    {factura.numero_factura_display || factura.numero || `#${factura.id}`}
                  </td>
                  <td>{formatDate(factura.fecha || factura.created_at)}</td>
                  <td>
                    {factura.cliente_nombre
                      ? `${factura.cliente_nombre} ${factura.cliente_apellido || ''}`
                      : factura.hospedaje_id
                        ? `Hospedaje #${factura.hospedaje_id}`
                        : 'Consumidor final'}
                  </td>
                  <td>
                    <span className={`facturacion__badge ${getTipoBadgeClass(factura)}`}>
                      {getTipoLabel(factura) === 'POS' ? <ShoppingCart size={12} /> : <LogOut size={12} />}
                      {getTipoLabel(factura)}
                    </span>
                  </td>
                  <td className="facturacion__cell--money">{formatCurrency(factura.subtotal)}</td>
                  <td className="facturacion__cell--money">{formatCurrency(factura.impuestos)}</td>
                  <td className="facturacion__cell--money facturacion__cell--total">{formatCurrency(factura.total)}</td>
                  <td>
                    <button
                      className="facturacion__action-btn"
                      onClick={(e) => { e.stopPropagation(); setFacturaDetalle(factura); }}
                      title="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detalle */}
      {facturaDetalle && (
        <div className="facturacion__modal-overlay" onClick={() => setFacturaDetalle(null)}>
          <div className="facturacion__modal" onClick={(e) => e.stopPropagation()}>
            <div className="facturacion__modal-header">
              <h2>
                <FileText size={22} />
                Factura {facturaDetalle.numero_factura_display || facturaDetalle.numero || `#${facturaDetalle.id}`}
              </h2>
              <button className="facturacion__modal-close" onClick={() => setFacturaDetalle(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="facturacion__modal-body">
              {/* Info general */}
              <div className="facturacion__detail-grid">
                <div className="facturacion__detail-item">
                  <span className="facturacion__detail-label">Fecha</span>
                  <span className="facturacion__detail-value">{formatDateTime(facturaDetalle.fecha || facturaDetalle.created_at)}</span>
                </div>
                <div className="facturacion__detail-item">
                  <span className="facturacion__detail-label">Tipo</span>
                  <span className={`facturacion__badge ${getTipoBadgeClass(facturaDetalle)}`}>
                    {getTipoLabel(facturaDetalle)}
                  </span>
                </div>
                <div className="facturacion__detail-item">
                  <span className="facturacion__detail-label">Cliente</span>
                  <span className="facturacion__detail-value">
                    {facturaDetalle.cliente_nombre
                      ? `${facturaDetalle.cliente_nombre} ${facturaDetalle.cliente_apellido || ''}`
                      : 'Consumidor final'}
                  </span>
                </div>
                {facturaDetalle.cliente_documento && (
                  <div className="facturacion__detail-item">
                    <span className="facturacion__detail-label">Documento</span>
                    <span className="facturacion__detail-value">{facturaDetalle.cliente_documento}</span>
                  </div>
                )}
                {facturaDetalle.observaciones && (
                  <div className="facturacion__detail-item facturacion__detail-item--full">
                    <span className="facturacion__detail-label">Observaciones</span>
                    <span className="facturacion__detail-value">{facturaDetalle.observaciones}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              {(() => {
                const detalles = parseJSON(facturaDetalle.detalles);
                if (detalles.length === 0) return null;
                return (
                  <div className="facturacion__detail-section">
                    <h3><ShoppingCart size={16} /> Items</h3>
                    <table className="facturacion__detail-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="facturacion__th--right">Cant.</th>
                          <th className="facturacion__th--right">P. Unit.</th>
                          <th className="facturacion__th--right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.nombre || item.item_nombre || `Item #${idx + 1}`}</td>
                            <td className="facturacion__cell--money">{item.cantidad}</td>
                            <td className="facturacion__cell--money">{formatCurrency(item.precio_unitario)}</td>
                            <td className="facturacion__cell--money">{formatCurrency(item.precio_total || (item.cantidad * item.precio_unitario))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Totales */}
              <div className="facturacion__detail-totals">
                <div className="facturacion__total-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(facturaDetalle.subtotal)}</span>
                </div>
                {parseFloat(facturaDetalle.impuestos) > 0 && (
                  <div className="facturacion__total-row">
                    <span>IVA</span>
                    <span>{formatCurrency(facturaDetalle.impuestos)}</span>
                  </div>
                )}
                {parseFloat(facturaDetalle.descuento) > 0 && (
                  <div className="facturacion__total-row">
                    <span>Descuento</span>
                    <span>-{formatCurrency(facturaDetalle.descuento)}</span>
                  </div>
                )}
                <div className="facturacion__total-row facturacion__total-row--grand">
                  <span>Total</span>
                  <span>{formatCurrency(facturaDetalle.total)}</span>
                </div>
              </div>

              {/* Métodos de pago */}
              {(() => {
                const metodos = parseJSON(facturaDetalle.metodos_pago);
                if (metodos.length === 0) return null;
                return (
                  <div className="facturacion__detail-section">
                    <h3><CreditCard size={16} /> Métodos de Pago</h3>
                    <div className="facturacion__metodos-list">
                      {metodos.map((mp, idx) => (
                        <div key={idx} className="facturacion__metodo-item">
                          <span>{mp.nombre || mp.metodo || `Método ${idx + 1}`}</span>
                          <span className="facturacion__metodo-monto">{formatCurrency(mp.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Facturacion;
