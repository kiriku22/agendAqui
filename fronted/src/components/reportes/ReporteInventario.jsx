import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Package, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { GET_REPORTE_INVENTARIO } from '../../graphql/reportes';
import { exportarReporteInventario } from '../../utils/exportarReporte';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Button from '../shared/Button';
import './ReporteInventario.css';

function ReporteInventario() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error, data }] = useLazyQuery(GET_REPORTE_INVENTARIO, {
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    if (data?.reporteInventario) {
      setDatos(data.reporteInventario);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Error al obtener reporte de inventario:', error);
    }
  }, [error]);

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      exportarReporteInventario(datos);
    }
  };

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);

  return (
    <div className="reporte-inventario">
      <FiltrosReporte onFiltrar={handleFiltrar} loading={loading} />

      {datos && (
        <div className="reporte-export-actions">
          <Button
            onClick={handleExportarExcel}
            variant="outline"
            icon={<Download size={18} />}
          >
            Exportar a Excel
          </Button>
        </div>
      )}

      {loading && <Loading />}
      {error && <div className="error-message">Error: {error.message}</div>}

      {datos && (
        <>
          {/* Cards de métricas principales */}
          <div className="reporte-cards">
            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--primary">
                <Package size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Items Activos</div>
                <div className="reporte-card__value">
                  {datos.total_items_activos}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--danger">
                <AlertTriangle size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Items Bajo Stock</div>
                <div className="reporte-card__value">
                  {datos.total_items_bajo_stock}
                </div>
                <div className="reporte-card__extra">
                  Requieren reabastecimiento
                </div>
              </div>
            </div>

            <div className="reporte-card reporte-card--wide">
              <div className="reporte-card__icon reporte-card__icon--success">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Valor Total Inventario</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.valor_inventario_actual)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de items bajo stock */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">
              <AlertTriangle size={20} style={{ marginRight: '8px' }} />
              Items Bajo Stock Mínimo
            </h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Diferencia</th>
                    <th>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.items_bajo_stock.length > 0 ? (
                    datos.items_bajo_stock.map(item => (
                      <tr key={item.id}>
                        <td><code>{item.codigo || 'N/A'}</code></td>
                        <td><strong>{item.nombre}</strong></td>
                        <td><span className="badge badge--info">{item.tipo}</span></td>
                        <td>
                          <span className="stock-actual stock-actual--bajo">
                            {item.stock_actual}
                          </span>
                        </td>
                        <td>{item.stock_minimo}</td>
                        <td>
                          <span className="diferencia diferencia--negativa">
                            {item.diferencia}
                          </span>
                        </td>
                        <td>{item.categoria_nombre || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay items bajo stock en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de movimientos resumen */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Resumen de Movimientos</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Tipo de Movimiento</th>
                    <th>Cantidad Total</th>
                    <th># Movimientos</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.movimientos_resumen.length > 0 ? (
                    datos.movimientos_resumen.map(mov => (
                      <tr key={mov.tipo_movimiento}>
                        <td><strong>{mov.tipo_movimiento}</strong></td>
                        <td>{parseFloat(mov.cantidad_total).toFixed(0)}</td>
                        <td><span className="badge badge--primary">{mov.num_movimientos}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay movimientos en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de productos más consumidos */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">TOP 10 Productos Más Consumidos</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Cantidad Consumida</th>
                    <th>Veces Consumido</th>
                    <th>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.productos_mas_consumidos.length > 0 ? (
                    datos.productos_mas_consumidos.map(prod => (
                      <tr key={prod.item_id}>
                        <td><code>{prod.codigo || 'N/A'}</code></td>
                        <td><strong>{prod.nombre}</strong></td>
                        <td><span className="badge badge--info">{prod.tipo}</span></td>
                        <td>
                          <span className="cantidad-consumida">
                            {parseFloat(prod.cantidad_consumida).toFixed(0)}
                          </span>
                        </td>
                        <td><span className="badge badge--success">{prod.veces_consumido}</span></td>
                        <td>{prod.categoria_nombre || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay consumos en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!datos && !loading && (
        <div className="reporte-placeholder">
          <Package size={64} />
          <p>Selecciona un rango de fechas para generar el reporte</p>
        </div>
      )}
    </div>
  );
}

export default ReporteInventario;
