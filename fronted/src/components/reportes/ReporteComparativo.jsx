import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Percent, Bed } from 'lucide-react';
import { GET_REPORTE_COMPARATIVO } from '../../graphql/reportes';
import './ReporteComparativo.css';

const COLORS = {
  actual: '#8b5cf6',
  anterior: '#94a3b8',
  up: '#10b981',
  down: '#ef4444',
  stable: '#6b7280'
};

function ReporteComparativo() {
  const [datos, setDatos] = useState(null);
  const [periodos, setPeriodos] = useState({
    fechaDesdeActual: '',
    fechaHastaActual: '',
    fechaDesdeAnterior: '',
    fechaHastaAnterior: ''
  });

  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_COMPARATIVO, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteComparativo);
    },
    onError: (err) => {
      console.error('Error al obtener reporte comparativo:', err);
    }
  });

  // Función para establecer períodos predefinidos
  const establecerPeriodoPredefinido = (tipo) => {
    const hoy = new Date();
    let fechaDesdeActual, fechaHastaActual, fechaDesdeAnterior, fechaHastaAnterior;

    if (tipo === 'mes') {
      // Este mes vs mes anterior
      const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

      fechaDesdeActual = primerDiaMesActual.toISOString().split('T')[0];
      fechaHastaActual = ultimoDiaMesActual.toISOString().split('T')[0];
      fechaDesdeAnterior = primerDiaMesAnterior.toISOString().split('T')[0];
      fechaHastaAnterior = ultimoDiaMesAnterior.toISOString().split('T')[0];
    } else if (tipo === 'semana') {
      // Esta semana vs semana anterior
      const inicioSemanaActual = new Date(hoy);
      inicioSemanaActual.setDate(hoy.getDate() - hoy.getDay());
      const finSemanaActual = new Date(inicioSemanaActual);
      finSemanaActual.setDate(inicioSemanaActual.getDate() + 6);

      const inicioSemanaAnterior = new Date(inicioSemanaActual);
      inicioSemanaAnterior.setDate(inicioSemanaActual.getDate() - 7);
      const finSemanaAnterior = new Date(inicioSemanaAnterior);
      finSemanaAnterior.setDate(inicioSemanaAnterior.getDate() + 6);

      fechaDesdeActual = inicioSemanaActual.toISOString().split('T')[0];
      fechaHastaActual = finSemanaActual.toISOString().split('T')[0];
      fechaDesdeAnterior = inicioSemanaAnterior.toISOString().split('T')[0];
      fechaHastaAnterior = finSemanaAnterior.toISOString().split('T')[0];
    } else if (tipo === 'año') {
      // Este año vs año anterior (mismas fechas)
      const inicioAñoActual = new Date(hoy.getFullYear(), 0, 1);
      const inicioAñoAnterior = new Date(hoy.getFullYear() - 1, 0, 1);
      const finAñoAnterior = new Date(hoy.getFullYear() - 1, 11, 31);

      fechaDesdeActual = inicioAñoActual.toISOString().split('T')[0];
      fechaHastaActual = hoy.toISOString().split('T')[0];
      fechaDesdeAnterior = inicioAñoAnterior.toISOString().split('T')[0];
      fechaHastaAnterior = finAñoAnterior.toISOString().split('T')[0];
    }

    setPeriodos({
      fechaDesdeActual,
      fechaHastaActual,
      fechaDesdeAnterior,
      fechaHastaAnterior
    });
  };

  const handleGenerar = (e) => {
    e.preventDefault();
    if (periodos.fechaDesdeActual && periodos.fechaHastaActual &&
        periodos.fechaDesdeAnterior && periodos.fechaHastaAnterior) {
      fetchReporte({ variables: periodos });
    }
  };

  const formatCurrency = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatPercent = (valor) => `${Number(valor).toFixed(1)}%`;

  const formatVariacion = (valor) => {
    const signo = valor > 0 ? '+' : '';
    return `${signo}${Number(valor).toFixed(1)}%`;
  };

  const getTendenciaIcon = (tendencia) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp size={20} color={COLORS.up} />;
      case 'down':
        return <TrendingDown size={20} color={COLORS.down} />;
      default:
        return <Minus size={20} color={COLORS.stable} />;
    }
  };

  const formatearValorMetrica = (metrica, valor) => {
    const metricasMonetarias = ['Ingresos Totales', 'Ingresos Hospedaje', 'Ingresos Consumos', 'ADR', 'RevPAR', 'Ticket Promedio'];
    const metricasPorcentaje = ['Ocupación %'];

    if (metricasMonetarias.includes(metrica)) {
      return formatCurrency(valor);
    } else if (metricasPorcentaje.includes(metrica)) {
      return formatPercent(valor);
    }
    return Math.round(valor).toLocaleString('es-CO');
  };

  if (!datos) {
    return (
      <div className="reporte-comparativo">
        {/* Filtros de período */}
        <div className="filtros-comparativo">
          <div className="filtros-header">
            <h3>Seleccionar Períodos a Comparar</h3>
            <div className="periodos-rapidos">
              <button type="button" onClick={() => establecerPeriodoPredefinido('semana')}>
                Esta Semana vs Anterior
              </button>
              <button type="button" onClick={() => establecerPeriodoPredefinido('mes')}>
                Este Mes vs Anterior
              </button>
              <button type="button" onClick={() => establecerPeriodoPredefinido('año')}>
                Este Año vs Anterior
              </button>
            </div>
          </div>

          <form onSubmit={handleGenerar} className="filtros-form">
            <div className="periodo-group">
              <label className="periodo-label">Período Actual</label>
              <div className="periodo-fechas">
                <input
                  type="date"
                  value={periodos.fechaDesdeActual}
                  onChange={(e) => setPeriodos({ ...periodos, fechaDesdeActual: e.target.value })}
                  required
                />
                <span>a</span>
                <input
                  type="date"
                  value={periodos.fechaHastaActual}
                  onChange={(e) => setPeriodos({ ...periodos, fechaHastaActual: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="periodo-group">
              <label className="periodo-label">Período Anterior</label>
              <div className="periodo-fechas">
                <input
                  type="date"
                  value={periodos.fechaDesdeAnterior}
                  onChange={(e) => setPeriodos({ ...periodos, fechaDesdeAnterior: e.target.value })}
                  required
                />
                <span>a</span>
                <input
                  type="date"
                  value={periodos.fechaHastaAnterior}
                  onChange={(e) => setPeriodos({ ...periodos, fechaHastaAnterior: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-comparar">
              <ArrowUpDown size={18} />
              Comparar Períodos
            </button>
          </form>
        </div>

        <div className="reporte-placeholder">
          <ArrowUpDown size={64} />
          <h3>Comparativo de Períodos</h3>
          <p>Selecciona dos períodos para comparar métricas de rendimiento</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-comparativo">
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando comparativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-comparativo">
        <div className="error">
          <TrendingDown size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { periodo_actual, periodo_anterior, metricas_actual, metricas_anterior, comparaciones } = datos;

  // Preparar datos para gráficas separadas por escala
  // Gráfica 1: Ingresos (valores monetarios grandes)
  const datosIngresos = [
    { nombre: 'Ingresos Totales', actual: metricas_actual.ingresos_totales, anterior: metricas_anterior.ingresos_totales },
    { nombre: 'Hospedaje', actual: metricas_actual.ingresos_hospedaje, anterior: metricas_anterior.ingresos_hospedaje },
    { nombre: 'Consumos', actual: metricas_actual.ingresos_consumos, anterior: metricas_anterior.ingresos_consumos }
  ];

  // Gráfica 2: Métricas operativas (valores numéricos pequeños)
  const datosOperativos = [
    { nombre: 'Check-outs', actual: metricas_actual.num_checkouts, anterior: metricas_anterior.num_checkouts },
    { nombre: 'Reservas', actual: metricas_actual.num_reservas, anterior: metricas_anterior.num_reservas },
    { nombre: 'Noches Vendidas', actual: metricas_actual.noches_vendidas, anterior: metricas_anterior.noches_vendidas }
  ];

  // Gráfica 3: Porcentajes y promedios
  const datosIndicadores = [
    { nombre: 'Ocupación %', actual: metricas_actual.ocupacion_promedio, anterior: metricas_anterior.ocupacion_promedio },
    { nombre: 'ADR', actual: metricas_actual.adr, anterior: metricas_anterior.adr },
    { nombre: 'RevPAR', actual: metricas_actual.rev_par, anterior: metricas_anterior.rev_par }
  ];

  return (
    <div className="reporte-comparativo">
      {/* Filtros de período */}
      <div className="filtros-comparativo">
        <div className="filtros-header">
          <h3>Períodos Comparados</h3>
          <div className="periodos-rapidos">
            <button type="button" onClick={() => establecerPeriodoPredefinido('semana')}>
              Semana
            </button>
            <button type="button" onClick={() => establecerPeriodoPredefinido('mes')}>
              Mes
            </button>
            <button type="button" onClick={() => establecerPeriodoPredefinido('año')}>
              Año
            </button>
          </div>
        </div>

        <form onSubmit={handleGenerar} className="filtros-form filtros-form--compact">
          <div className="periodo-group periodo-group--inline">
            <label>Actual:</label>
            <input
              type="date"
              value={periodos.fechaDesdeActual}
              onChange={(e) => setPeriodos({ ...periodos, fechaDesdeActual: e.target.value })}
              required
            />
            <span>a</span>
            <input
              type="date"
              value={periodos.fechaHastaActual}
              onChange={(e) => setPeriodos({ ...periodos, fechaHastaActual: e.target.value })}
              required
            />
          </div>

          <div className="periodo-group periodo-group--inline">
            <label>Anterior:</label>
            <input
              type="date"
              value={periodos.fechaDesdeAnterior}
              onChange={(e) => setPeriodos({ ...periodos, fechaDesdeAnterior: e.target.value })}
              required
            />
            <span>a</span>
            <input
              type="date"
              value={periodos.fechaHastaAnterior}
              onChange={(e) => setPeriodos({ ...periodos, fechaHastaAnterior: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn-comparar btn-comparar--small">
            <ArrowUpDown size={16} />
            Comparar
          </button>
        </form>
      </div>

      {/* Resumen de períodos */}
      <div className="periodos-resumen">
        <div className="periodo-card periodo-card--actual">
          <Calendar size={20} />
          <div>
            <span className="periodo-etiqueta">Período Actual</span>
            <span className="periodo-fechas-texto">
              {new Date(periodo_actual.fecha_desde).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} - {new Date(periodo_actual.fecha_hasta).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}
            </span>
            <span className="periodo-dias">{periodo_actual.dias} días</span>
          </div>
        </div>
        <div className="periodo-card periodo-card--anterior">
          <Calendar size={20} />
          <div>
            <span className="periodo-etiqueta">Período Anterior</span>
            <span className="periodo-fechas-texto">
              {new Date(periodo_anterior.fecha_desde).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} - {new Date(periodo_anterior.fecha_hasta).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}
            </span>
            <span className="periodo-dias">{periodo_anterior.dias} días</span>
          </div>
        </div>
      </div>

      {/* Cards de métricas principales con variación */}
      <div className="metricas-principales">
        <div className="metrica-card">
          <div className="metrica-header">
            <DollarSign size={24} />
            <span>Ingresos Totales</span>
          </div>
          <div className="metrica-valores">
            <div className="metrica-actual">{formatCurrency(metricas_actual.ingresos_totales)}</div>
            <div className="metrica-anterior">{formatCurrency(metricas_anterior.ingresos_totales)}</div>
          </div>
          <div className={`metrica-variacion ${comparaciones.find(c => c.metrica === 'Ingresos Totales')?.tendencia}`}>
            {getTendenciaIcon(comparaciones.find(c => c.metrica === 'Ingresos Totales')?.tendencia)}
            <span>{formatVariacion(comparaciones.find(c => c.metrica === 'Ingresos Totales')?.variacion_porcentual || 0)}</span>
          </div>
        </div>

        <div className="metrica-card">
          <div className="metrica-header">
            <Percent size={24} />
            <span>Ocupación</span>
          </div>
          <div className="metrica-valores">
            <div className="metrica-actual">{formatPercent(metricas_actual.ocupacion_promedio)}</div>
            <div className="metrica-anterior">{formatPercent(metricas_anterior.ocupacion_promedio)}</div>
          </div>
          <div className={`metrica-variacion ${comparaciones.find(c => c.metrica === 'Ocupación %')?.tendencia}`}>
            {getTendenciaIcon(comparaciones.find(c => c.metrica === 'Ocupación %')?.tendencia)}
            <span>{formatVariacion(comparaciones.find(c => c.metrica === 'Ocupación %')?.variacion_porcentual || 0)}</span>
          </div>
        </div>

        <div className="metrica-card">
          <div className="metrica-header">
            <DollarSign size={24} />
            <span>ADR</span>
          </div>
          <div className="metrica-valores">
            <div className="metrica-actual">{formatCurrency(metricas_actual.adr)}</div>
            <div className="metrica-anterior">{formatCurrency(metricas_anterior.adr)}</div>
          </div>
          <div className={`metrica-variacion ${comparaciones.find(c => c.metrica === 'ADR')?.tendencia}`}>
            {getTendenciaIcon(comparaciones.find(c => c.metrica === 'ADR')?.tendencia)}
            <span>{formatVariacion(comparaciones.find(c => c.metrica === 'ADR')?.variacion_porcentual || 0)}</span>
          </div>
        </div>

        <div className="metrica-card">
          <div className="metrica-header">
            <Bed size={24} />
            <span>Check-outs</span>
          </div>
          <div className="metrica-valores">
            <div className="metrica-actual">{metricas_actual.num_checkouts}</div>
            <div className="metrica-anterior">{metricas_anterior.num_checkouts}</div>
          </div>
          <div className={`metrica-variacion ${comparaciones.find(c => c.metrica === 'Check-outs')?.tendencia}`}>
            {getTendenciaIcon(comparaciones.find(c => c.metrica === 'Check-outs')?.tendencia)}
            <span>{formatVariacion(comparaciones.find(c => c.metrica === 'Check-outs')?.variacion_porcentual || 0)}</span>
          </div>
        </div>
      </div>

      {/* Gráficas comparativas - separadas por escala */}
      <div className="graficas-comparativas">
        {/* Gráfica de Ingresos */}
        <div className="reporte-section grafica-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">📊 Ingresos</h3>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosIngresos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nombre" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend />
                <Bar dataKey="actual" name="Período Actual" fill={COLORS.actual} radius={[6, 6, 0, 0]} />
                <Bar dataKey="anterior" name="Período Anterior" fill={COLORS.anterior} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Métricas Operativas */}
        <div className="reporte-section grafica-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">🏨 Métricas Operativas</h3>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosOperativos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nombre" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="actual" name="Período Actual" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="anterior" name="Período Anterior" fill="#6ee7b7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Indicadores KPI */}
        <div className="reporte-section grafica-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">📈 Indicadores KPI</h3>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosIndicadores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nombre" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name, props) => {
                    if (props.dataKey && props.payload.nombre === 'Ocupación %') {
                      return [`${value.toFixed(1)}%`, name];
                    }
                    return [formatCurrency(value), name];
                  }}
                />
                <Legend />
                <Bar dataKey="actual" name="Período Actual" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="anterior" name="Período Anterior" fill="#fcd34d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla detallada de comparación */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle de Comparación</h3>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th className="text-right">Período Actual</th>
                <th className="text-right">Período Anterior</th>
                <th className="text-right">Variación</th>
                <th className="text-center">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {comparaciones.map((comp, index) => (
                <tr key={index}>
                  <td className="font-medium">{comp.metrica}</td>
                  <td className="text-right font-medium">{formatearValorMetrica(comp.metrica, comp.periodo_actual)}</td>
                  <td className="text-right">{formatearValorMetrica(comp.metrica, comp.periodo_anterior)}</td>
                  <td className={`text-right ${comp.tendencia === 'up' ? 'text-success' : comp.tendencia === 'down' ? 'text-danger' : ''}`}>
                    {formatVariacion(comp.variacion_porcentual)}
                  </td>
                  <td className="text-center">
                    {getTendenciaIcon(comp.tendencia)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReporteComparativo;
