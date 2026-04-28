import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { FileText, Building, DollarSign, TrendingUp, Calendar, XCircle, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_ICA } from '../../graphql/reportes';
import './ReporteICA.css';

function ReporteICA() {
  const [datos, setDatos] = useState(null);
  const [fechasFiltro, setFechasFiltro] = useState({ fechaDesde: '', fechaHasta: '' });
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_ICA, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteICA);
    },
    onError: (err) => {
      console.error('Error al obtener reporte ICA:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    setFechasFiltro({ fechaDesde, fechaHasta });
    fetchReporte({ variables: { fechaDesde, fechaHasta } });
  };

  // Descargar archivo Excel (.xlsx)
  const handleDescargarExcel = () => {
    if (!datos) return;

    const { resumen, detalles, por_mes } = datos;
    const fechaGeneracion = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // Datos para la hoja
    const wsData = [
      // Encabezado del reporte
      ['REPORTE DE ICA - IMPUESTO DE INDUSTRIA Y COMERCIO'],
      [],
      ['Fecha de Generacion:', fechaGeneracion],
      ['Periodo:', `${fechasFiltro.fechaDesde} al ${fechasFiltro.fechaHasta}`],
      [],
      // Resumen
      ['RESUMEN GENERAL'],
      ['Total Facturas:', resumen.total_facturas],
      ['Ingresos Brutos Total:', resumen.ingresos_brutos_total],
      ['Tarifa ICA:', `${resumen.tarifa_ica}%`],
      ['ICA Total:', resumen.ica_total],
      ['Aplica ICA:', resumen.aplica_ica ? 'Si' : 'No'],
      [],
      [],
      // Desglose por Mes
      ['DESGLOSE POR MES'],
      ['Mes', 'Ingresos', 'ICA', 'Cantidad Facturas'],
      ...por_mes.map(m => [
        m.mes,
        m.ingresos,
        m.ica,
        m.cantidad
      ]),
      [],
      [],
      // Encabezados de la tabla de detalles
      ['DETALLE DE FACTURAS'],
      ['No. Factura', 'Fecha', 'Cliente', 'Ingresos', 'ICA Calculado'],
      // Datos de facturas
      ...detalles.map(f => [
        f.numero_factura,
        f.fecha ? new Date(f.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
        f.cliente_nombre,
        f.ingresos,
        f.ica_calculado
      ]),
      // Fila de totales
      [],
      ['TOTALES', '', '', resumen.ingresos_brutos_total, resumen.ica_total]
    ];

    // Crear hoja de trabajo
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 15 },  // No. Factura
      { wch: 12 },  // Fecha
      { wch: 30 },  // Cliente
      { wch: 18 },  // Ingresos
      { wch: 18 },  // ICA Calculado
    ];

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte ICA');

    // Generar archivo y descargar
    XLSX.writeFile(wb, `reporte_ica_${fechasFiltro.fechaDesde}_${fechasFiltro.fechaHasta}.xlsx`);
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
    if (!fechaStr) return 'N/A';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  };

  if (!datos) {
    return (
      <div className="reporte-ica">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <Building size={64} />
          <h3>Reporte de ICA</h3>
          <p>
            Impuesto de Industria y Comercio aplicable a los ingresos del establecimiento.
            Selecciona un rango de fechas para generar el reporte.
          </p>
          <div className="info-dian">
            <div className="info-item">
              <strong>Base:</strong> Ingresos brutos del periodo
            </div>
            <div className="info-item">
              <strong>Tarifa:</strong> Varia segun el municipio (0.2% - 1.4%)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-ica">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando reporte de ICA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-ica">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <XCircle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, detalles, por_mes } = datos;

  return (
    <div className="reporte-ica">
      {/* Filtros y Acciones */}
      <div className="reporte-header-actions">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <button
          className="btn-descargar-excel"
          onClick={handleDescargarExcel}
          title="Descargar Reporte de ICA en formato Excel"
        >
          <FileSpreadsheet size={20} />
          <span>Descargar Excel</span>
        </button>
      </div>

      {/* Alerta si no aplica ICA */}
      {!resumen.aplica_ica && (
        <div className="alerta-ica">
          <AlertTriangle size={20} />
          <span>El ICA no esta configurado como aplicable en los parametros del sistema. Los valores mostrados son informativos.</span>
        </div>
      )}

      {/* Cards de metricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--primary">
            <FileText size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Total Facturas</div>
            <div className="reporte-card__value">{resumen.total_facturas}</div>
            <div className="reporte-card__extra">documentos procesados</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Ingresos Brutos</div>
            <div className="reporte-card__value">{formatCurrency(resumen.ingresos_brutos_total)}</div>
            <div className="reporte-card__extra">base gravable ICA</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <TrendingUp size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Tarifa ICA</div>
            <div className="reporte-card__value">{resumen.tarifa_ica}%</div>
            <div className="reporte-card__extra">por mil</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <Building size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">ICA Total</div>
            <div className="reporte-card__value">{formatCurrency(resumen.ica_total)}</div>
            <div className="reporte-card__extra">impuesto a pagar</div>
          </div>
        </div>
      </div>

      {/* Desglose por Mes */}
      {por_mes.length > 0 && (
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Tendencia Mensual</h3>
            <p className="reporte-section-subtitle">
              Evolucion del ICA mes a mes
            </p>
          </div>
          <div className="meses-grid">
            {por_mes.map((mes, index) => (
              <div key={index} className="mes-card">
                <div className="mes-card__header">
                  <Calendar size={18} />
                  <span className="mes-nombre">{mes.mes}</span>
                </div>
                <div className="mes-card__body">
                  <div className="mes-stat">
                    <span className="mes-stat__label">Ingresos</span>
                    <span className="mes-stat__value">{formatCurrency(mes.ingresos)}</span>
                  </div>
                  <div className="mes-stat mes-stat--highlight">
                    <span className="mes-stat__label">ICA</span>
                    <span className="mes-stat__value">{formatCurrency(mes.ica)}</span>
                  </div>
                  <div className="mes-stat">
                    <span className="mes-stat__label">Facturas</span>
                    <span className="mes-stat__value">{mes.cantidad}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de facturas */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle de Facturas</h3>
          <p className="reporte-section-subtitle">
            Listado completo de facturas con calculo de ICA
          </p>
        </div>

        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>No. Factura</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th className="text-right">Ingresos</th>
                <th className="text-right">ICA ({resumen.tarifa_ica}%)</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map(factura => (
                <tr key={factura.factura_id}>
                  <td className="font-medium">{factura.numero_factura}</td>
                  <td>{formatFecha(factura.fecha)}</td>
                  <td>{factura.cliente_nombre}</td>
                  <td className="text-right">{formatCurrency(factura.ingresos)}</td>
                  <td className="text-right text-ica font-medium">
                    {formatCurrency(factura.ica_calculado)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="text-right font-bold">TOTALES:</td>
                <td className="text-right font-bold">{formatCurrency(resumen.ingresos_brutos_total)}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.ica_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Informacion Normativa */}
      <div className="reporte-section info-normativa">
        <h4>Informacion Normativa - ICA</h4>
        <ul>
          <li>El ICA (Impuesto de Industria y Comercio) es un tributo municipal regulado por la Ley 14 de 1983 y el Decreto 1333 de 1986.</li>
          <li>La tarifa varia segun el municipio y la actividad economica del establecimiento.</li>
          <li>Para servicios hoteleros, la tarifa tipica oscila entre 0.7% y 1.0% (7 a 10 por mil).</li>
          <li>El ICA se declara y paga bimestral, trimestral o anualmente segun el municipio y el monto de ingresos.</li>
          <li>Este reporte facilita la liquidacion de la declaracion de ICA ante la secretaria de hacienda municipal.</li>
        </ul>
      </div>
    </div>
  );
}

export default ReporteICA;
