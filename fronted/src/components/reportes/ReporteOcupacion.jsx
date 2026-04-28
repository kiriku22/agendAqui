import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Hotel, BedDouble, TrendingUp, Download, BarChart3 } from 'lucide-react';
import { GET_REPORTE_OCUPACION } from '../../graphql/reportes';
import { exportarReporteOcupacion } from '../../utils/exportarReporte';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import './ReporteOcupacion.css';

function ReporteOcupacion() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error, data }] = useLazyQuery(GET_REPORTE_OCUPACION, {
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    if (data?.reporteOcupacion) {
      setDatos(data.reporteOcupacion);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Error al obtener reporte de ocupación:', error);
    }
  }, [error]);

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      exportarReporteOcupacion(datos);
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
    <div className="reporte-ocupacion">
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
          {/* Cards de métricas */}
          <div className="reporte-cards">
            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--primary">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Ocupación Promedio</div>
                <div className="reporte-card__value">
                  {formatearPorcentaje(datos.porcentaje_ocupacion_promedio)}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--success">
                <BedDouble size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Noches Vendidas</div>
                <div className="reporte-card__value">{datos.total_noches_vendidas}</div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--info">
                <Hotel size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Habitaciones</div>
                <div className="reporte-card__value">{datos.total_habitaciones_promedio}</div>
              </div>
            </div>
          </div>

          {/* Tabla por tipo */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Ocupación por Tipo de Habitación</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Ocupación Promedio</th>
                    <th>% Ocupación</th>
                    <th>Ingresos Generados</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.ocupacion_por_tipo.map(tipo => (
                    <tr key={tipo.tipo}>
                      <td><strong>{tipo.tipo}</strong></td>
                      <td>{tipo.total}</td>
                      <td>{tipo.ocupadas_promedio.toFixed(1)}</td>
                      <td>
                        <span className={`porcentaje ${
                          tipo.porcentaje_ocupacion >= 80 ? 'porcentaje--alto' :
                          tipo.porcentaje_ocupacion >= 50 ? 'porcentaje--medio' :
                          'porcentaje--bajo'
                        }`}>
                          {formatearPorcentaje(tipo.porcentaje_ocupacion)}
                        </span>
                      </td>
                      <td>{formatearMoneda(tipo.ingresos_generados)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla diaria */}
          <div className="reporte-seccion">
            <h3 className="reporte-seccion__titulo">Ocupación Diaria</h3>
            <div className="tabla-scroll">
              <table className="reporte-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Ocupadas</th>
                    <th>Disponibles</th>
                    <th>Limpieza</th>
                    <th>Mantenimiento</th>
                    <th>% Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.ocupacion_por_dia.map(dia => (
                    <tr key={dia.fecha}>
                      <td>{new Date(dia.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
                      <td>{dia.total_habitaciones}</td>
                      <td><Badge variant="danger">{dia.ocupadas}</Badge></td>
                      <td><Badge variant="success">{dia.disponibles}</Badge></td>
                      <td><Badge variant="warning">{dia.limpieza}</Badge></td>
                      <td><Badge variant="default">{dia.mantenimiento}</Badge></td>
                      <td>{formatearPorcentaje(dia.porcentaje_ocupacion)}</td>
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
          <BarChart3 size={64} />
          <p>Selecciona un rango de fechas para generar el reporte</p>
        </div>
      )}
    </div>
  );
}

export default ReporteOcupacion;
