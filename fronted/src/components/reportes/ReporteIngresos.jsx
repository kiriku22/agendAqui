import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { DollarSign, TrendingUp, FileText, Download } from 'lucide-react';
import { GET_REPORTE_INGRESOS } from '../../graphql/reportes';
import { exportarReporteIngresos } from '../../utils/exportarReporte';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Button from '../shared/Button';
import './ReporteIngresos.css';

function ReporteIngresos() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error }] = useLazyQuery(GET_REPORTE_INGRESOS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteIngresos);
    },
    onError: (err) => {
      console.error('Error al obtener reporte de ingresos:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      exportarReporteIngresos(datos);
    }
  };

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);

  const formatearPorcentaje = (valor) => `${parseFloat(valor || 0).toFixed(2)}%`;

  return (
    <div className="reporte-ingresos">
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
              <div className="reporte-card__icon reporte-card__icon--success">
                <DollarSign size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Ingresos</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.total_ingresos)}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--primary">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Promedio Diario</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.promedio_diario)}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--info">
                <FileText size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Ticket Promedio</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.ticket_promedio)}
                </div>
                <div className="reporte-card__extra">
                  {datos.num_facturas} facturas
                </div>
              </div>
            </div>
          </div>

          {/* Composición de ingresos */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Composición de Ingresos</h3>
            <div className="composicion-ingresos">
              <div className="composicion-item">
                <div className="composicion-item__header">
                  <span className="composicion-item__label">Hospedajes</span>
                  <span className="composicion-item__porcentaje">
                    {formatearPorcentaje(datos.porcentaje_hospedajes)}
                  </span>
                </div>
                <div className="composicion-item__barra">
                  <div
                    className="composicion-item__fill composicion-item__fill--primary"
                    style={{ width: `${datos.porcentaje_hospedajes}%` }}
                  />
                </div>
                <div className="composicion-item__valor">
                  {formatearMoneda(datos.ingresos_hospedajes)}
                </div>
              </div>

              <div className="composicion-item">
                <div className="composicion-item__header">
                  <span className="composicion-item__label">Consumos</span>
                  <span className="composicion-item__porcentaje">
                    {formatearPorcentaje(datos.porcentaje_consumos)}
                  </span>
                </div>
                <div className="composicion-item__barra">
                  <div
                    className="composicion-item__fill composicion-item__fill--success"
                    style={{ width: `${datos.porcentaje_consumos}%` }}
                  />
                </div>
                <div className="composicion-item__valor">
                  {formatearMoneda(datos.ingresos_consumos)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla por tipo de habitación */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Ingresos por Tipo de Habitación</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Ingresos Hospedajes</th>
                    <th>Ingresos Consumos</th>
                    <th>Total</th>
                    <th># Hospedajes</th>
                    <th>Precio Promedio/Noche</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.ingresos_por_tipo.map(tipo => (
                    <tr key={tipo.tipo}>
                      <td><strong>{tipo.tipo}</strong></td>
                      <td>{formatearMoneda(tipo.ingresos_hospedajes)}</td>
                      <td>{formatearMoneda(tipo.ingresos_consumos)}</td>
                      <td><strong>{formatearMoneda(tipo.total)}</strong></td>
                      <td>{tipo.num_hospedajes}</td>
                      <td>{formatearMoneda(tipo.precio_promedio_noche)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla diaria */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Ingresos Diarios</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ingresos Hospedajes</th>
                    <th>Ingresos Consumos</th>
                    <th>Total</th>
                    <th># Check-outs</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.ingresos_por_dia.map(dia => (
                    <tr key={dia.fecha}>
                      <td>{new Date(dia.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
                      <td>{formatearMoneda(dia.ingresos_hospedajes)}</td>
                      <td>{formatearMoneda(dia.ingresos_consumos)}</td>
                      <td><strong>{formatearMoneda(dia.total)}</strong></td>
                      <td>{dia.num_checkouts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!datos && !loading && (
        <div className="reporte-placeholder">
          <DollarSign size={64} />
          <p>Selecciona un rango de fechas para generar el reporte</p>
        </div>
      )}
    </div>
  );
}

export default ReporteIngresos;
