import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Percent, Calendar, Bed, TrendingDown } from 'lucide-react';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_ADR_REVPAR } from '../../graphql/reportes';
import './ReporteADR.css';

const COLORS = {
  adr: '#8b5cf6',
  revpar: '#10b981',
  occupancy: '#3b82f6'
};

function ReporteADR() {
  const [datos, setDatos] = useState(null);
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_ADR_REVPAR, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteADRRevPAR);
    },
    onError: (err) => {
      console.error('Error al obtener reporte ADR y RevPAR:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    fetchReporte({ variables: { fechaDesde, fechaHasta } });
  };

  const formatCurrency = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatPercent = (valor) => {
    return `${Number(valor).toFixed(1)}%`;
  };

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', timeZone: 'America/Bogota' });
  };

  if (!datos) {
    return (
      <div className="reporte-adr">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <TrendingUp size={64} />
          <h3>Reporte de ADR y RevPAR</h3>
          <p>Selecciona un rango de fechas para analizar los indicadores hoteleros clave</p>
          <div className="indicadores-info">
            <div className="indicador-desc">
              <strong>ADR</strong> (Average Daily Rate): Tarifa promedio diaria
            </div>
            <div className="indicador-desc">
              <strong>RevPAR</strong> (Revenue Per Available Room): Ingreso por habitación disponible
            </div>
            <div className="indicador-desc">
              <strong>Occupancy Rate</strong>: Tasa de ocupación
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-adr">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando reporte de indicadores hoteleros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-adr">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <TrendingDown size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, tendencia_diaria, promedios_por_tipo } = datos;

  // Preparar datos para gráfica de tendencias
  const datosTendencia = tendencia_diaria.map(t => ({
    fecha: formatFecha(t.fecha),
    ADR: t.adr,
    RevPAR: t.rev_par,
    'Ocupación %': t.occupancy_rate
  }));

  // Preparar datos para gráfica de barras por tipo
  const datosPorTipo = promedios_por_tipo.map(t => ({
    tipo: t.tipo,
    ADR: t.adr,
    RevPAR: t.rev_par,
    'Ocupación %': t.occupancy_rate
  }));

  return (
    <div className="reporte-adr">
      {/* Filtros */}
      <FiltrosReporte onFiltrar={handleFiltrar} />

      {/* Cards de métricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--purple">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">ADR Global</div>
            <div className="reporte-card__value">{formatCurrency(resumen.adr_global)}</div>
            <div className="reporte-card__extra">Tarifa Promedio Diaria</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <TrendingUp size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">RevPAR Global</div>
            <div className="reporte-card__value">{formatCurrency(resumen.rev_par_global)}</div>
            <div className="reporte-card__extra">Ingreso por Habitación Disponible</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <Percent size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Ocupación Global</div>
            <div className="reporte-card__value">{formatPercent(resumen.occupancy_rate_global)}</div>
            <div className="reporte-card__extra">Tasa de Ocupación Promedio</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <Bed size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Noches Vendidas</div>
            <div className="reporte-card__value-small">
              {resumen.total_noches_vendidas} noches
            </div>
            <div className="reporte-card__extra">{resumen.num_checkouts} check-outs</div>
          </div>
        </div>
      </div>

      {/* Gráfica de Tendencias Diarias */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Tendencia Diaria de Indicadores</h3>
          <p className="reporte-section-subtitle">Evolución de ADR, RevPAR y Ocupación por día</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={datosTendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="fecha" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'Ocupación %') return formatPercent(value);
                  return formatCurrency(value);
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ADR"
                stroke={COLORS.adr}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="RevPAR"
                stroke={COLORS.revpar}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Ocupación %"
                stroke={COLORS.occupancy}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica por Tipo de Habitación */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Indicadores por Tipo de Habitación</h3>
          <p className="reporte-section-subtitle">Comparación de ADR, RevPAR y Ocupación</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={datosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tipo" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'Ocupación %') return formatPercent(value);
                  return formatCurrency(value);
                }}
              />
              <Legend />
              <Bar dataKey="ADR" fill={COLORS.adr} radius={[8, 8, 0, 0]} />
              <Bar dataKey="RevPAR" fill={COLORS.revpar} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla Detallada por Tipo */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle por Tipo de Habitación</h3>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="text-right">ADR</th>
                <th className="text-right">RevPAR</th>
                <th className="text-right">Ocupación %</th>
                <th className="text-right">Total Habitaciones</th>
                <th className="text-right">Ingresos Totales</th>
              </tr>
            </thead>
            <tbody>
              {promedios_por_tipo.map((tipo, index) => (
                <tr key={index}>
                  <td className="font-medium">{tipo.tipo}</td>
                  <td className="text-right font-medium">{formatCurrency(tipo.adr)}</td>
                  <td className="text-right font-medium">{formatCurrency(tipo.rev_par)}</td>
                  <td className="text-right">
                    <span className={`badge ${tipo.occupancy_rate >= 70 ? 'badge--success' : tipo.occupancy_rate >= 50 ? 'badge--warning' : 'badge--gray'}`}>
                      {formatPercent(tipo.occupancy_rate)}
                    </span>
                  </td>
                  <td className="text-right">{tipo.total_habitaciones}</td>
                  <td className="text-right font-medium">{formatCurrency(tipo.ingresos_totales)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-bold">PROMEDIO GLOBAL</td>
                <td className="text-right font-bold">{formatCurrency(resumen.adr_global)}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.rev_par_global)}</td>
                <td className="text-right font-bold">{formatPercent(resumen.occupancy_rate_global)}</td>
                <td className="text-right font-bold">{resumen.total_habitaciones_promedio}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.ingresos_totales_hospedaje)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Explicación de Indicadores */}
      <div className="reporte-section explicacion-indicadores">
        <h3>¿Qué significan estos indicadores?</h3>
        <div className="indicadores-grid">
          <div className="indicador-card">
            <div className="indicador-card__icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: COLORS.adr }}>
              <DollarSign size={24} />
            </div>
            <div className="indicador-card__content">
              <h4>ADR (Average Daily Rate)</h4>
              <p><strong>Fórmula:</strong> Ingresos Totales / Noches Vendidas</p>
              <p>Representa la tarifa promedio que el hotel cobra por noche. Un ADR alto indica precios premium.</p>
            </div>
          </div>
          <div className="indicador-card">
            <div className="indicador-card__icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: COLORS.revpar }}>
              <TrendingUp size={24} />
            </div>
            <div className="indicador-card__content">
              <h4>RevPAR (Revenue Per Available Room)</h4>
              <p><strong>Fórmula:</strong> Ingresos Totales / (Habitaciones × Días)</p>
              <p>Combina ocupación y precio. Más útil que ADR para medir rendimiento global del hotel.</p>
            </div>
          </div>
          <div className="indicador-card">
            <div className="indicador-card__icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: COLORS.occupancy }}>
              <Percent size={24} />
            </div>
            <div className="indicador-card__content">
              <h4>Occupancy Rate (Tasa de Ocupación)</h4>
              <p><strong>Fórmula:</strong> (Noches Vendidas / Habitaciones Disponibles) × 100</p>
              <p>Porcentaje de ocupación. Meta típica: 70-80% para hoteles urbanos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReporteADR;
