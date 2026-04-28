import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Target, DollarSign, TrendingUp, TrendingDown, Users,
  Calendar, Percent, AlertTriangle, Check, X
} from 'lucide-react';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_FUENTES_RESERVA } from '../../graphql/reportes';
import './ReporteFuentesReserva.css';

// Colores para los canales
const CANAL_COLORS = {
  directo: '#10b981',
  booking: '#003580',
  airbnb: '#ff5a5f',
  expedia: '#ffc000',
  telefono: '#3b82f6',
  web: '#8b5cf6',
  walk_in: '#06b6d4',
  otros: '#6b7280'
};

function ReporteFuentesReserva() {
  const [datos, setDatos] = useState(null);
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_FUENTES_RESERVA, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteFuentesReserva);
    },
    onError: (err) => {
      console.error('Error al obtener reporte de fuentes de reserva:', err);
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
      <div className="reporte-fuentes-reserva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <Target size={64} />
          <h3>Reporte de Fuentes de Reserva</h3>
          <p>Selecciona un rango de fechas para analizar el performance de cada canal de reserva</p>
          <div className="canales-preview">
            <span className="canal-badge" style={{ backgroundColor: CANAL_COLORS.directo }}>Directo</span>
            <span className="canal-badge" style={{ backgroundColor: CANAL_COLORS.booking }}>Booking</span>
            <span className="canal-badge" style={{ backgroundColor: CANAL_COLORS.airbnb }}>Airbnb</span>
            <span className="canal-badge" style={{ backgroundColor: CANAL_COLORS.web }}>Web</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-fuentes-reserva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Analizando fuentes de reserva...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-fuentes-reserva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <AlertTriangle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, canales, tendencia_diaria } = datos;

  // Preparar datos para el pie chart
  const datosPie = canales.map(c => ({
    name: c.canal_nombre,
    value: c.total_reservas,
    color: c.color || CANAL_COLORS[c.canal] || CANAL_COLORS.otros
  }));

  // Preparar datos para bar chart de ingresos
  const datosIngresos = canales.map(c => ({
    canal: c.canal_nombre,
    ingresos: c.ingresos_totales,
    comision: c.comision_estimada,
    color: c.color || CANAL_COLORS[c.canal] || CANAL_COLORS.otros
  }));

  // Preparar datos para tendencia diaria
  const datosTendencia = tendencia_diaria.map(t => ({
    fecha: formatFecha(t.fecha),
    Directo: t.directo,
    Booking: t.booking,
    Airbnb: t.airbnb,
    Expedia: t.expedia,
    Telefono: t.telefono,
    Web: t.web,
    'Walk-in': t.walk_in
  }));

  return (
    <div className="reporte-fuentes-reserva">
      {/* Filtros */}
      <FiltrosReporte onFiltrar={handleFiltrar} />

      {/* Cards de métricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--purple">
            <Target size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Total Reservas</div>
            <div className="reporte-card__value">{resumen.total_reservas}</div>
            <div className="reporte-card__extra">Canal principal: {resumen.canal_principal}</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Ingresos Totales</div>
            <div className="reporte-card__value">{formatCurrency(resumen.ingresos_totales)}</div>
            <div className="reporte-card__extra">
              Comisiones OTAs: {formatCurrency(resumen.comisiones_estimadas)}
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <TrendingUp size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Reservas Directas</div>
            <div className="reporte-card__value">{formatPercent(resumen.pct_directo)}</div>
            <div className="reporte-card__extra">vs OTAs: {formatPercent(resumen.pct_otas)}</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <Check size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Confirmadas</div>
            <div className="reporte-card__value">{resumen.total_confirmadas}</div>
            <div className="reporte-card__extra">
              Canceladas: {resumen.total_canceladas} | No-show: {resumen.total_noshow}
            </div>
          </div>
        </div>
      </div>

      {/* Distribución por Canal (Pie Chart) */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Distribución por Canal</h3>
          <p className="reporte-section-subtitle">Participación de cada fuente de reserva</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={datosPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={true}
              >
                {datosPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} reservas`, name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ingresos por Canal (Bar Chart) */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Ingresos por Canal</h3>
          <p className="reporte-section-subtitle">Comparación de ingresos y comisiones estimadas</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={datosIngresos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="canal" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="comision" name="Comisión Est." fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendencia Diaria (Area Chart) */}
      {datosTendencia.length > 1 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Tendencia Diaria por Canal</h3>
            <p className="reporte-section-subtitle">Evolución de reservas por fuente</p>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={datosTendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="Directo" stackId="1" stroke={CANAL_COLORS.directo} fill={CANAL_COLORS.directo} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Booking" stackId="1" stroke={CANAL_COLORS.booking} fill={CANAL_COLORS.booking} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Airbnb" stackId="1" stroke={CANAL_COLORS.airbnb} fill={CANAL_COLORS.airbnb} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Expedia" stackId="1" stroke={CANAL_COLORS.expedia} fill={CANAL_COLORS.expedia} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Web" stackId="1" stroke={CANAL_COLORS.web} fill={CANAL_COLORS.web} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Telefono" stackId="1" stroke={CANAL_COLORS.telefono} fill={CANAL_COLORS.telefono} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Walk-in" stackId="1" stroke={CANAL_COLORS.walk_in} fill={CANAL_COLORS.walk_in} fillOpacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla Detallada por Canal */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle por Canal de Reserva</h3>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th className="text-center">Reservas</th>
                <th className="text-center">Confirmadas</th>
                <th className="text-center">Canceladas</th>
                <th className="text-right">Tasa Confirm.</th>
                <th className="text-right">Ingresos</th>
                <th className="text-right">Ticket Prom.</th>
                <th className="text-right">Comisión %</th>
                <th className="text-right">Comisión Est.</th>
              </tr>
            </thead>
            <tbody>
              {canales.map((canal, index) => (
                <tr key={index}>
                  <td>
                    <div className="canal-cell">
                      <span
                        className="canal-dot"
                        style={{ backgroundColor: canal.color || CANAL_COLORS[canal.canal] || '#6b7280' }}
                      ></span>
                      <span className="font-medium">{canal.canal_nombre}</span>
                    </div>
                  </td>
                  <td className="text-center font-medium">{canal.total_reservas}</td>
                  <td className="text-center">
                    <span className="badge badge--success">{canal.confirmadas}</span>
                  </td>
                  <td className="text-center">
                    {canal.canceladas > 0 ? (
                      <span className="badge badge--danger">{canal.canceladas}</span>
                    ) : (
                      <span className="text-gray">0</span>
                    )}
                  </td>
                  <td className="text-right">
                    <span className={`badge ${canal.tasa_confirmacion >= 80 ? 'badge--success' : canal.tasa_confirmacion >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                      {formatPercent(canal.tasa_confirmacion)}
                    </span>
                  </td>
                  <td className="text-right font-medium">{formatCurrency(canal.ingresos_totales)}</td>
                  <td className="text-right">{formatCurrency(canal.ingresos_promedio)}</td>
                  <td className="text-right">
                    {canal.comision_pct > 0 ? (
                      <span className="comision-tag">{formatPercent(canal.comision_pct)}</span>
                    ) : (
                      <span className="text-success">0%</span>
                    )}
                  </td>
                  <td className="text-right">
                    {canal.comision_estimada > 0 ? (
                      <span className="text-danger">{formatCurrency(canal.comision_estimada)}</span>
                    ) : (
                      <span className="text-success">$0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-bold">TOTAL</td>
                <td className="text-center font-bold">{resumen.total_reservas}</td>
                <td className="text-center font-bold">{resumen.total_confirmadas}</td>
                <td className="text-center font-bold">{resumen.total_canceladas}</td>
                <td className="text-right font-bold">
                  {formatPercent(resumen.total_reservas > 0 ? (resumen.total_confirmadas / resumen.total_reservas) * 100 : 0)}
                </td>
                <td className="text-right font-bold">{formatCurrency(resumen.ingresos_totales)}</td>
                <td className="text-right font-bold">
                  {formatCurrency(resumen.total_reservas > 0 ? resumen.ingresos_totales / resumen.total_reservas : 0)}
                </td>
                <td className="text-right">-</td>
                <td className="text-right font-bold text-danger">{formatCurrency(resumen.comisiones_estimadas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Análisis Directo vs OTAs */}
      <div className="reporte-section resumen-canales">
        <h3>Directo vs OTAs</h3>
        <div className="comparacion-canales">
          <div className="canal-grupo canal-grupo--directo">
            <div className="canal-grupo__header">
              <span className="canal-grupo__icon">
                <Check size={20} />
              </span>
              <span className="canal-grupo__titulo">Reservas Directas</span>
            </div>
            <div className="canal-grupo__valor">{formatPercent(resumen.pct_directo)}</div>
            <div className="canal-grupo__descripcion">
              Sin comisiones - Mayor rentabilidad
            </div>
          </div>
          <div className="vs-divider">VS</div>
          <div className="canal-grupo canal-grupo--otas">
            <div className="canal-grupo__header">
              <span className="canal-grupo__icon">
                <X size={20} />
              </span>
              <span className="canal-grupo__titulo">OTAs (Booking, Airbnb, etc.)</span>
            </div>
            <div className="canal-grupo__valor">{formatPercent(resumen.pct_otas)}</div>
            <div className="canal-grupo__descripcion">
              Comisiones: {formatCurrency(resumen.comisiones_estimadas)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReporteFuentesReserva;
