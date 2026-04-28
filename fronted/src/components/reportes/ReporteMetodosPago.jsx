import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { CreditCard, TrendingUp, DollarSign, Download, Hash } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GET_REPORTE_METODOS_PAGO } from '../../graphql/reportes';
import FiltrosReporte from './FiltrosReporte';
import Loading from '../shared/Loading';
import Button from '../shared/Button';
import './ReporteMetodosPago.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function ReporteMetodosPago() {
  const [datos, setDatos] = useState(null);
  const [getReporte, { loading, error }] = useLazyQuery(GET_REPORTE_METODOS_PAGO, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteMetodosPago);
    },
    onError: (err) => {
      console.error('Error al obtener reporte de métodos de pago:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    getReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const handleExportarExcel = () => {
    if (datos) {
      // TODO: Implementar exportación a Excel
      alert('Exportación a Excel en desarrollo');
    }
  };

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);

  const formatearPorcentaje = (valor) => `${parseFloat(valor || 0).toFixed(1)}%`;

  // Custom label para PieChart
  const renderCustomLabel = (entry) => {
    return `${entry.metodo_nombre}: ${formatearPorcentaje(entry.porcentaje)}`;
  };

  return (
    <div className="reporte-metodos-pago">
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
                <div className="reporte-card__label">Total Recaudado</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.resumen.total_recaudado)}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--primary">
                <Hash size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Total Transacciones</div>
                <div className="reporte-card__value">
                  {datos.resumen.total_transacciones}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--info">
                <TrendingUp size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Ticket Promedio</div>
                <div className="reporte-card__value">
                  {formatearMoneda(datos.resumen.ticket_promedio_global)}
                </div>
              </div>
            </div>

            <div className="reporte-card">
              <div className="reporte-card__icon reporte-card__icon--purple">
                <CreditCard size={24} />
              </div>
              <div className="reporte-card__content">
                <div className="reporte-card__label">Método Más Usado</div>
                <div className="reporte-card__value-small">
                  {datos.resumen.metodo_mas_usado || 'N/A'}
                </div>
                <div className="reporte-card__extra">
                  Mayor recaudo: {datos.resumen.metodo_mayor_recaudo || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfica de Composición (Pie Chart) */}
          {datos.detalle_por_metodo.filter(m => m.total > 0).length > 0 && (
            <div className="reporte-section">
              <div className="reporte-section-header">
                <h2 className="reporte-section-title">Composición por Método de Pago</h2>
                <p className="reporte-section-subtitle">
                  Distribución porcentual del total recaudado
                </p>
              </div>
              <div className="reporte-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={datos.detalle_por_metodo.filter(m => m.total > 0)}
                      dataKey="total"
                      nameKey="metodo_nombre"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderCustomLabel}
                      labelLine={true}
                    >
                      {datos.detalle_por_metodo.filter(m => m.total > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatearMoneda(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gráfica de Comparación (Bar Chart) */}
          {datos.detalle_por_metodo.filter(m => m.total > 0).length > 0 && (
            <div className="reporte-section">
              <div className="reporte-section-header">
                <h2 className="reporte-section-title">Comparación de Métodos</h2>
                <p className="reporte-section-subtitle">
                  Monto total recaudado por cada método de pago
                </p>
              </div>
              <div className="reporte-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={datos.detalle_por_metodo.filter(m => m.total > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="metodo_nombre"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      formatter={(value) => formatearMoneda(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#8b5cf6" name="Total Recaudado" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabla de Detalle por Método */}
          <div className="reporte-section">
            <div className="reporte-section-header">
              <h2 className="reporte-section-title">Detalle por Método de Pago</h2>
              <p className="reporte-section-subtitle">
                Análisis detallado de transacciones y montos
              </p>
            </div>

            <div className="reporte-table-container">
              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Método de Pago</th>
                    <th>Código DIAN</th>
                    <th className="text-right">Total Recaudado</th>
                    <th className="text-right">Transacciones</th>
                    <th className="text-right">Ticket Promedio</th>
                    <th className="text-right">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.detalle_por_metodo.map((metodo) => (
                    <tr key={metodo.metodo_pago_id}>
                      <td className="font-medium">{metodo.metodo_nombre}</td>
                      <td className="text-gray">{metodo.codigo_dian || '-'}</td>
                      <td className="text-right font-medium">
                        {formatearMoneda(metodo.total)}
                      </td>
                      <td className="text-right">{metodo.num_transacciones}</td>
                      <td className="text-right">
                        {formatearMoneda(metodo.ticket_promedio)}
                      </td>
                      <td className="text-right">
                        <span className={`badge ${metodo.porcentaje > 30 ? 'badge--success' : metodo.porcentaje > 15 ? 'badge--warning' : 'badge--gray'}`}>
                          {formatearPorcentaje(metodo.porcentaje)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan="2">TOTAL</td>
                    <td className="text-right">
                      {formatearMoneda(datos.resumen.total_recaudado)}
                    </td>
                    <td className="text-right">{datos.resumen.total_transacciones}</td>
                    <td className="text-right">
                      {formatearMoneda(datos.resumen.ticket_promedio_global)}
                    </td>
                    <td className="text-right">100.00%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !error && !datos && (
        <div className="reporte-placeholder">
          <CreditCard size={48} />
          <h3>Selecciona un rango de fechas</h3>
          <p>Genera el reporte de métodos de pago para visualizar las estadísticas</p>
        </div>
      )}
    </div>
  );
}

export default ReporteMetodosPago;
