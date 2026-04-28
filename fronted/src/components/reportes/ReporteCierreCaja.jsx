import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, FileText, Users, CreditCard, AlertCircle, Receipt } from 'lucide-react';
import { GET_REPORTE_CIERRE_CAJA } from '../../graphql/reportes';
import './ReporteCierreCaja.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function ReporteCierreCaja() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fetchReporte, { data, loading, error }] = useLazyQuery(GET_REPORTE_CIERRE_CAJA, {
    fetchPolicy: 'network-only'
  });

  const handleGenerarReporte = (e) => {
    e.preventDefault();
    fetchReporte({ variables: { fecha } });
  };

  const formatCurrency = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota'
    });
  };

  if (loading) {
    return (
      <div className="reporte-cierre-caja">
        <form onSubmit={handleGenerarReporte} className="filtros-cierre-caja">
          <div className="filtro-fecha">
            <label>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-generar">
            <Receipt size={18} />
            Generar Cierre
          </button>
        </form>
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando cierre de caja...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-cierre-caja">
        <form onSubmit={handleGenerarReporte} className="filtros-cierre-caja">
          <div className="filtro-fecha">
            <label>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-generar">
            <Receipt size={18} />
            Generar Cierre
          </button>
        </form>
        <div className="error">
          <AlertCircle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="reporte-cierre-caja">
        <form onSubmit={handleGenerarReporte} className="filtros-cierre-caja">
          <div className="filtro-fecha">
            <label>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-generar">
            <Receipt size={18} />
            Generar Cierre
          </button>
        </form>
        <div className="reporte-placeholder">
          <Receipt size={64} />
          <h3>Cierre de Caja Diario</h3>
          <p>Selecciona una fecha para generar el reporte de cierre de caja (Night Audit)</p>
        </div>
      </div>
    );
  }

  const { reporteCierreCaja: datos } = data;
  const { resumen, pagos_por_metodo, facturas_del_dia } = datos;

  // Preparar datos para el gráfico de barras
  const datosGraficaIngresos = [
    { concepto: 'Hospedaje', valor: resumen.ingresos_hospedaje },
    { concepto: 'Consumos', valor: resumen.ingresos_consumos }
  ];

  const datosGraficaPagos = pagos_por_metodo
    .filter(m => m.total > 0)
    .map(m => ({
      metodo: m.metodo_nombre,
      valor: m.total
    }));

  return (
    <div className="reporte-cierre-caja">
      {/* Filtros */}
      <form onSubmit={handleGenerarReporte} className="filtros-cierre-caja">
        <div className="filtro-fecha">
          <label>Fecha:</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-generar">
          <Receipt size={18} />
          Generar Cierre
        </button>
      </form>

      {/* Título del reporte */}
      <div className="reporte-header-cierre">
        <h2>Cierre de Caja - {formatFecha(datos.fecha)}</h2>
      </div>

      {/* Cards de métricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Total Ingresos</div>
            <div className="reporte-card__value">{formatCurrency(resumen.total_ingresos)}</div>
            <div className="reporte-card__extra">
              Hospedaje: {formatCurrency(resumen.ingresos_hospedaje)} | Consumos: {formatCurrency(resumen.ingresos_consumos)}
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--primary">
            <CreditCard size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Pagos Recibidos</div>
            <div className="reporte-card__value">{formatCurrency(resumen.total_pagos_recibidos)}</div>
            <div className="reporte-card__extra">{pagos_por_metodo.filter(m => m.total > 0).length} métodos de pago</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <AlertCircle size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Saldo Pendiente</div>
            <div className="reporte-card__value">{formatCurrency(resumen.saldo_pendiente)}</div>
            <div className="reporte-card__extra">
              {resumen.saldo_pendiente > 0 ? 'Por cobrar' : 'Cuadrado'}
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <FileText size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Operaciones</div>
            <div className="reporte-card__value-small">
              {resumen.num_checkouts} Check-outs | {resumen.num_facturas} Facturas
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica de Ingresos por Concepto */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Desglose de Ingresos</h3>
          <p className="reporte-section-subtitle">Composición de ingresos por concepto</p>
        </div>
        <div className="reporte-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosGraficaIngresos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="concepto" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="valor" fill="#8b5cf6" name="Monto" radius={[8, 8, 0, 0]}>
                {datosGraficaIngresos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica de Pagos por Método */}
      {datosGraficaPagos.length > 0 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Pagos Recibidos por Método</h3>
            <p className="reporte-section-subtitle">Desglose de pagos por forma de pago</p>
          </div>
          <div className="reporte-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGraficaPagos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="metodo" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="valor" fill="#10b981" name="Monto Recibido" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla de Pagos por Método */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle de Pagos por Método</h3>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Método de Pago</th>
                <th className="text-right">Transacciones</th>
                <th className="text-right">Total</th>
                <th className="text-right">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {pagos_por_metodo.map((metodo) => (
                <tr key={metodo.metodo_pago_id}>
                  <td className="font-medium">{metodo.metodo_nombre}</td>
                  <td className="text-right">{metodo.num_transacciones}</td>
                  <td className="text-right font-medium">{formatCurrency(metodo.total)}</td>
                  <td className="text-right">
                    {resumen.total_pagos_recibidos > 0
                      ? ((metodo.total / resumen.total_pagos_recibidos) * 100).toFixed(1)
                      : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-bold">TOTAL</td>
                <td className="text-right font-bold">
                  {pagos_por_metodo.reduce((sum, m) => sum + m.num_transacciones, 0)}
                </td>
                <td className="text-right font-bold">{formatCurrency(resumen.total_pagos_recibidos)}</td>
                <td className="text-right font-bold">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tabla de Facturas del Día */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Facturas del Día</h3>
          <p className="reporte-section-subtitle">{facturas_del_dia.length} facturas emitidas</p>
        </div>
        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th className="text-right">Total</th>
                <th>Métodos de Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturas_del_dia.length > 0 ? (
                facturas_del_dia.map((factura) => (
                  <tr key={factura.factura_id}>
                    <td className="font-medium">{factura.numero_factura}</td>
                    <td>{factura.hora}</td>
                    <td>{factura.cliente_nombre}</td>
                    <td className="text-right font-medium">{formatCurrency(factura.total)}</td>
                    <td className="text-gray">{factura.metodos_pago || 'Sin pagos'}</td>
                    <td>
                      <span className={`badge ${factura.estado === 'Pagada' ? 'badge--success' : 'badge--gray'}`}>
                        {factura.estado}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-gray">
                    No hay facturas registradas para esta fecha
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen Final */}
      <div className="reporte-section resumen-final">
        <h3>Resumen del Cierre</h3>
        <div className="resumen-grid">
          <div className="resumen-item">
            <span className="resumen-label">Ingresos Totales:</span>
            <span className="resumen-valor">{formatCurrency(resumen.total_ingresos)}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Pagos Recibidos:</span>
            <span className="resumen-valor">{formatCurrency(resumen.total_pagos_recibidos)}</span>
          </div>
          <div className={`resumen-item ${resumen.saldo_pendiente > 0 ? 'resumen-pendiente' : 'resumen-cuadrado'}`}>
            <span className="resumen-label">Saldo Pendiente:</span>
            <span className="resumen-valor">{formatCurrency(resumen.saldo_pendiente)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReporteCierreCaja;
