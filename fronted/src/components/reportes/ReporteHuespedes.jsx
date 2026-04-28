import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Users, TrendingUp, Award, Download } from 'lucide-react';
import { GET_REPORTE_HUESPEDES } from '../../graphql/reportes';
import { exportarReporteHuespedes } from '../../utils/exportarReporte';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Button from '../shared/Button';
import './ReporteHuespedes.css';

function ReporteHuespedes() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error, data }] = useLazyQuery(GET_REPORTE_HUESPEDES, {
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    if (data?.reporteHuespedes) {
      setDatos(data.reporteHuespedes);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Error al obtener reporte de huéspedes:', error);
    }
  }, [error]);

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      exportarReporteHuespedes(datos);
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
    <div className="reporte-huespedes">
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
                <Users size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Huéspedes</div>
                <div className="reporte-card__value">
                  {datos.total_huespedes}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--success">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Huéspedes Nuevos</div>
                <div className="reporte-card__value">
                  {datos.huespedes_nuevos}
                </div>
                <div className="reporte-card__extra">
                  {formatearPorcentaje(datos.porcentaje_nuevos)} del total
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--info">
                <Award size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Huéspedes Recurrentes</div>
                <div className="reporte-card__value">
                  {datos.huespedes_recurrentes}
                </div>
                <div className="reporte-card__extra">
                  {formatearPorcentaje(datos.porcentaje_recurrentes)} del total
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--warning">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Promedio Estancia</div>
                <div className="reporte-card__value">
                  {parseFloat(datos.promedio_estancia_dias).toFixed(1)} días
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de huéspedes frecuentes */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">TOP 10 Huéspedes Frecuentes</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th># Hospedajes</th>
                    <th>Total Gastado</th>
                    <th>Última Visita</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.huespedes_frecuentes.map(huesped => (
                    <tr key={huesped.huesped_id}>
                      <td>{huesped.huesped_id}</td>
                      <td><strong>{huesped.nombre_completo}</strong></td>
                      <td>{huesped.email || 'N/A'}</td>
                      <td>{huesped.telefono || 'N/A'}</td>
                      <td><span className="badge badge--primary">{huesped.num_hospedajes}</span></td>
                      <td><strong>{formatearMoneda(huesped.total_gastado)}</strong></td>
                      <td>{new Date(huesped.ultima_visita).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
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
          <Users size={64} />
          <p>Selecciona un rango de fechas para generar el reporte</p>
        </div>
      )}
    </div>
  );
}

export default ReporteHuespedes;
