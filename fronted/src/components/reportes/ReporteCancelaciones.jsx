import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  AlertCircle, XCircle, CheckCircle, TrendingDown,
  DollarSign, Calendar, Clock, Users, AlertTriangle
} from 'lucide-react';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_CANCELACIONES } from '../../graphql/reportes';
import './ReporteCancelaciones.css';

const COLORS = {
  cancelada: '#ef4444',
  noshow: '#f59e0b',
  completada: '#10b981',
  total: '#8b5cf6'
};

const COLORES_DIAS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6'];

function ReporteCancelaciones() {
  const [datos, setDatos] = useState(null);
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_CANCELACIONES, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteCancelaciones);
    },
    onError: (err) => {
      console.error('Error al obtener reporte de cancelaciones:', err);
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
      <div className="reporte-cancelaciones">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <AlertCircle size={64} />
          <h3>Reporte de Cancelaciones</h3>
          <p>Selecciona un rango de fechas para analizar los patrones de cancelación y no-show</p>
          <div className="metricas-preview">
            <span className="metrica-badge metrica-badge--cancelada">Tasa de cancelación</span>
            <span className="metrica-badge metrica-badge--noshow">No-show</span>
            <span className="metrica-badge metrica-badge--ingresos">Ingresos perdidos</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-cancelaciones">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Analizando cancelaciones y no-shows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-cancelaciones">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <AlertTriangle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, por_canal, por_dia_semana, por_anticipacion, tendencia } = datos;

  // Datos para pie chart de estados
  const datosPie = [
    { name: 'Completadas', value: resumen.total_completadas, color: COLORS.completada },
    { name: 'Canceladas', value: resumen.total_canceladas, color: COLORS.cancelada },
    { name: 'No-show', value: resumen.total_noshow, color: COLORS.noshow }
  ].filter(d => d.value > 0);

  // Datos para bar chart por día de semana
  const datosDias = por_dia_semana.map((d, index) => ({
    dia: d.dia_nombre.substring(0, 3),
    'Tasa Cancelación': d.tasa_cancelacion,
    reservas: d.total_reservas,
    canceladas: d.canceladas,
    color: COLORES_DIAS[d.dia_semana]
  }));

  // Datos para tendencia
  const datosTendencia = tendencia.map(t => ({
    fecha: formatFecha(t.fecha),
    Total: t.total_reservas,
    Canceladas: t.canceladas,
    'No-show': t.noshow,
    'Tasa %': t.tasa_cancelacion
  }));

  // Datos para anticipación
  const datosAnticipacion = por_anticipacion.map(a => ({
    rango: a.rango + ' días',
    reservas: a.total_reservas,
    canceladas: a.canceladas,
    tasa: a.tasa_cancelacion
  }));

  return (
    <div className="reporte-cancelaciones">
      {/* Filtros */}
      <FiltrosReporte onFiltrar={handleFiltrar} />

      {/* Cards de métricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--danger">
            <XCircle size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Tasa de Cancelación</div>
            <div className="reporte-card__value">{formatPercent(resumen.tasa_cancelacion)}</div>
            <div className="reporte-card__extra">
              {resumen.total_canceladas} de {resumen.total_reservas} reservas
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <AlertCircle size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Tasa de No-Show</div>
            <div className="reporte-card__value">{formatPercent(resumen.tasa_noshow)}</div>
            <div className="reporte-card__extra">
              {resumen.total_noshow} no-shows
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--purple">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Ingresos Perdidos</div>
            <div className="reporte-card__value">{formatCurrency(resumen.ingresos_perdidos)}</div>
            <div className="reporte-card__extra">
              Anticipos: {formatCurrency(resumen.anticipos_perdidos)}
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <CheckCircle size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Tasa de Completitud</div>
            <div className="reporte-card__value">{formatPercent(resumen.tasa_completitud)}</div>
            <div className="reporte-card__extra">
              {resumen.total_completadas} completadas
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de Estados (Pie Chart) */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Distribución de Reservas por Estado</h3>
          <p className="reporte-section-subtitle">Proporción de completadas, canceladas y no-show</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {datosPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value} reservas`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendencia de Cancelaciones */}
      {datosTendencia.length > 1 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Tendencia de Cancelaciones</h3>
            <p className="reporte-section-subtitle">Evolución diaria de reservas, cancelaciones y no-show</p>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={datosTendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" stroke="#6b7280" />
                <YAxis yAxisId="left" stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Total" stroke={COLORS.total} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="Canceladas" stroke={COLORS.cancelada} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="No-show" stroke={COLORS.noshow} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="Tasa %" stroke="#6b7280" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Por Día de la Semana */}
      {datosDias.length > 0 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Cancelaciones por Día de la Semana</h3>
            <p className="reporte-section-subtitle">Patrón semanal de cancelaciones</p>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosDias}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dia" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Tasa Cancelación') return formatPercent(value);
                    return value;
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Tasa Cancelación" fill={COLORS.cancelada} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Por Anticipación */}
      {datosAnticipacion.length > 0 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Cancelaciones por Lead Time</h3>
            <p className="reporte-section-subtitle">Tasa de cancelación según días de anticipación</p>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosAnticipacion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="rango" type="category" stroke="#6b7280" width={80} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'tasa') return formatPercent(value);
                    return value;
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="reservas" name="Total Reservas" fill={COLORS.total} radius={[0, 8, 8, 0]} />
                <Bar dataKey="canceladas" name="Canceladas" fill={COLORS.cancelada} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla por Canal */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Cancelaciones por Canal de Reserva</h3>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th className="text-center">Reservas</th>
                <th className="text-center">Canceladas</th>
                <th className="text-center">No-Show</th>
                <th className="text-right">Tasa Cancel.</th>
                <th className="text-right">Tasa No-Show</th>
                <th className="text-right">Ingresos Perdidos</th>
              </tr>
            </thead>
            <tbody>
              {por_canal.map((canal, index) => (
                <tr key={index}>
                  <td className="font-medium">{canal.canal_nombre}</td>
                  <td className="text-center">{canal.total_reservas}</td>
                  <td className="text-center">
                    {canal.canceladas > 0 ? (
                      <span className="badge badge--danger">{canal.canceladas}</span>
                    ) : (
                      <span className="text-gray">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    {canal.noshow > 0 ? (
                      <span className="badge badge--warning">{canal.noshow}</span>
                    ) : (
                      <span className="text-gray">0</span>
                    )}
                  </td>
                  <td className="text-right">
                    <span className={`tasa-badge ${canal.tasa_cancelacion > 20 ? 'tasa-badge--alta' : canal.tasa_cancelacion > 10 ? 'tasa-badge--media' : 'tasa-badge--baja'}`}>
                      {formatPercent(canal.tasa_cancelacion)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={`tasa-badge ${canal.tasa_noshow > 10 ? 'tasa-badge--alta' : canal.tasa_noshow > 5 ? 'tasa-badge--media' : 'tasa-badge--baja'}`}>
                      {formatPercent(canal.tasa_noshow)}
                    </span>
                  </td>
                  <td className="text-right font-medium text-danger">
                    {formatCurrency(canal.ingresos_perdidos)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-bold">TOTAL</td>
                <td className="text-center font-bold">{resumen.total_reservas}</td>
                <td className="text-center font-bold">{resumen.total_canceladas}</td>
                <td className="text-center font-bold">{resumen.total_noshow}</td>
                <td className="text-right font-bold">{formatPercent(resumen.tasa_cancelacion)}</td>
                <td className="text-right font-bold">{formatPercent(resumen.tasa_noshow)}</td>
                <td className="text-right font-bold text-danger">{formatCurrency(resumen.ingresos_perdidos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Resumen de Impacto */}
      <div className="reporte-section resumen-impacto">
        <h3>Impacto Económico de Cancelaciones</h3>
        <div className="impacto-grid">
          <div className="impacto-item impacto-item--perdido">
            <div className="impacto-item__icon">
              <TrendingDown size={24} />
            </div>
            <div className="impacto-item__content">
              <span className="impacto-item__label">Ingresos Perdidos</span>
              <span className="impacto-item__valor">{formatCurrency(resumen.ingresos_perdidos)}</span>
            </div>
          </div>
          <div className="impacto-item impacto-item--anticipos">
            <div className="impacto-item__icon">
              <DollarSign size={24} />
            </div>
            <div className="impacto-item__content">
              <span className="impacto-item__label">Anticipos Afectados</span>
              <span className="impacto-item__valor">{formatCurrency(resumen.anticipos_perdidos)}</span>
            </div>
          </div>
          <div className="impacto-item impacto-item--tiempo">
            <div className="impacto-item__icon">
              <Clock size={24} />
            </div>
            <div className="impacto-item__content">
              <span className="impacto-item__label">Lead Time Promedio</span>
              <span className="impacto-item__valor">{resumen.lead_time_promedio.toFixed(1)} días</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReporteCancelaciones;
