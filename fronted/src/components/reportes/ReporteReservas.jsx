import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Calendar, TrendingDown, XCircle, Download } from 'lucide-react';
import { GET_REPORTE_RESERVAS } from '../../graphql/reportes';
import { exportarReporteReservas } from '../../utils/exportarReporte';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Button from '../shared/Button';
import './ReporteReservas.css';

function ReporteReservas() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error, data }] = useLazyQuery(GET_REPORTE_RESERVAS, {
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    if (data?.reporteReservas) {
      setDatos(data.reporteReservas);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Error al obtener reporte de reservas:', error);
    }
  }, [error]);

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      exportarReporteReservas(datos);
    }
  };

  const formatearPorcentaje = (valor) => `${parseFloat(valor || 0).toFixed(2)}%`;

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);

  return (
    <div className="reporte-reservas">
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
                <Calendar size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Reservas</div>
                <div className="reporte-card__value">
                  {datos.total_reservas}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--success">
                <Calendar size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Confirmadas</div>
                <div className="reporte-card__value">
                  {datos.confirmadas}
                </div>
                <div className="reporte-card__extra">
                  {formatearPorcentaje((datos.confirmadas / datos.total_reservas) * 100)} del total
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--danger">
                <TrendingDown size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Tasa Cancelación</div>
                <div className="reporte-card__value">
                  {formatearPorcentaje(datos.tasa_cancelacion)}
                </div>
                <div className="reporte-card__extra">
                  {datos.canceladas} canceladas
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--warning">
                <XCircle size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Tasa No Show</div>
                <div className="reporte-card__value">
                  {formatearPorcentaje(datos.tasa_no_show)}
                </div>
                <div className="reporte-card__extra">
                  {datos.no_show} no show
                </div>
              </div>
            </div>
          </div>

          {/* Cards de métricas financieras */}
          <div className="reporte-cards">
            <div className="reporte-card reporte-card--wide">
              <div className="reporte-card__icon reporte-card__icon--success">
                <Calendar size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Anticipo Total Recaudado</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.anticipo_total)}
                </div>
              </div>
            </div>

            <div className="reporte-card reporte-card--wide">
              <div className="reporte-card__icon reporte-card__icon--warning">
                <Calendar size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Saldo Pendiente Total</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.saldo_pendiente_total)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla por canal */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Reservas por Canal</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Total</th>
                    <th>Confirmadas</th>
                    <th>Canceladas</th>
                    <th>Tasa Cancelación</th>
                    <th>Ingresos Totales</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.reservas_por_canal.map(canal => (
                    <tr key={canal.canal}>
                      <td><strong>{canal.canal}</strong></td>
                      <td>{canal.total}</td>
                      <td><span className="badge badge--success">{canal.confirmadas}</span></td>
                      <td><span className="badge badge--danger">{canal.canceladas}</span></td>
                      <td>{formatearPorcentaje(canal.tasa_cancelacion)}</td>
                      <td><strong>{formatearMoneda(canal.ingresos_totales)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla por estado */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Reservas por Estado</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.reservas_por_estado.map(estado => (
                    <tr key={estado.estado}>
                      <td><strong>{estado.estado}</strong></td>
                      <td>{estado.cantidad}</td>
                      <td>
                        <div className="porcentaje-bar">
                          <div
                            className="porcentaje-bar__fill"
                            style={{ width: `${estado.porcentaje}%` }}
                          />
                          <span className="porcentaje-bar__label">
                            {formatearPorcentaje(estado.porcentaje)}
                          </span>
                        </div>
                      </td>
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
          <Calendar size={64} />
          <p>Selecciona un rango de fechas para generar el reporte</p>
        </div>
      )}
    </div>
  );
}

export default ReporteReservas;
