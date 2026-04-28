import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { FileText, Download, CheckCircle, XCircle, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_LIBRO_VENTAS } from '../../graphql/reportes';
import './ReporteLibroVentas.css';

function ReporteLibroVentas() {
  const [datos, setDatos] = useState(null);
  const [fechasFiltro, setFechasFiltro] = useState({ fechaDesde: '', fechaHasta: '' });
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_LIBRO_VENTAS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteLibroVentas);
    },
    onError: (err) => {
      console.error('Error al obtener reporte libro de ventas:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    setFechasFiltro({ fechaDesde, fechaHasta });
    fetchReporte({ variables: { fechaDesde, fechaHasta } });
  };

  // Descargar archivo Excel (.xlsx)
  const handleDescargarExcel = () => {
    if (!datos) return;

    const { resumen, facturas } = datos;
    const fechaGeneracion = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // Datos para la hoja
    const wsData = [
      // Encabezado del reporte
      ['LIBRO DE VENTAS DIAN'],
      [],
      ['Fecha de Generación:', fechaGeneracion],
      ['Período:', `${fechasFiltro.fechaDesde} al ${fechasFiltro.fechaHasta}`],
      [],
      // Resumen
      ['RESUMEN'],
      ['Total Facturas:', resumen.total_facturas, '', 'Aceptadas:', resumen.total_facturas_aceptadas, '', 'Rechazadas:', resumen.total_facturas_rechazadas],
      ['Pendientes:', resumen.total_facturas_pendientes, '', 'No Transmitidas:', resumen.total_facturas_no_transmitidas],
      [],
      ['Base Gravable Total:', resumen.base_gravable_total, '', 'IVA Total:', resumen.iva_total, '', 'Gran Total:', resumen.gran_total],
      [],
      [],
      // Encabezados de la tabla
      ['No. DIAN', 'No. Interno', 'Fecha', 'Cliente', 'Tipo Doc', 'Documento', 'Base Gravable', 'IVA', 'Total', 'Estado DIAN', 'CUFE'],
      // Datos de facturas
      ...facturas.map(f => [
        f.numero_factura_dian,
        f.numero_factura_interna,
        f.fecha_factura ? new Date(f.fecha_factura).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
        f.cliente_nombre,
        f.cliente_tipo_documento,
        f.cliente_numero_documento,
        f.base_gravable,
        f.iva,
        f.total,
        f.estado_dian,
        f.cufe || ''
      ]),
      // Fila de totales
      [],
      ['TOTALES', '', '', '', '', '', resumen.base_gravable_total, resumen.iva_total, resumen.gran_total, '', '']
    ];

    // Crear hoja de trabajo
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 15 },  // No. DIAN
      { wch: 12 },  // No. Interno
      { wch: 12 },  // Fecha
      { wch: 30 },  // Cliente
      { wch: 10 },  // Tipo Doc
      { wch: 15 },  // Documento
      { wch: 15 },  // Base Gravable
      { wch: 12 },  // IVA
      { wch: 15 },  // Total
      { wch: 15 },  // Estado DIAN
      { wch: 40 },  // CUFE
    ];

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Libro de Ventas DIAN');

    // Generar archivo y descargar
    XLSX.writeFile(wb, `libro_ventas_dian_${fechasFiltro.fechaDesde}_${fechasFiltro.fechaHasta}.xlsx`);
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

  const getEstadoBadgeClass = (estado) => {
    const classes = {
      'Aceptada': 'badge--success',
      'Rechazada': 'badge--danger',
      'Pendiente': 'badge--warning',
      'No Transmitida': 'badge--gray'
    };
    return classes[estado] || 'badge--gray';
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      'Aceptada': <CheckCircle size={16} />,
      'Rechazada': <XCircle size={16} />,
      'Pendiente': <Clock size={16} />,
      'No Transmitida': <AlertCircle size={16} />
    };
    return icons[estado] || <AlertCircle size={16} />;
  };

  if (!datos) {
    return (
      <div className="reporte-libro-ventas">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <FileText size={64} />
          <h3>Libro de Ventas DIAN</h3>
          <p>
            Registro oficial de facturas electrónicas emitidas según normas DIAN.
            Selecciona un rango de fechas para generar el reporte.
          </p>
          <div className="info-dian">
            <div className="info-item">
              <strong>Incluye:</strong> Número DIAN, CUFE, Cliente, Base Gravable, IVA, Total
            </div>
            <div className="info-item">
              <strong>Estados:</strong> Aceptada, Rechazada, Pendiente, No Transmitida
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-libro-ventas">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando libro de ventas DIAN...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-libro-ventas">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <XCircle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, facturas, por_estado } = datos;

  return (
    <div className="reporte-libro-ventas">
      {/* Filtros y Acciones */}
      <div className="reporte-header-actions">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <button
          className="btn-descargar-excel"
          onClick={handleDescargarExcel}
          title="Descargar Libro de Ventas en formato Excel"
        >
          <FileSpreadsheet size={20} />
          <span>Descargar Excel</span>
        </button>
      </div>

      {/* Cards de métricas principales */}
      <div className="reporte-cards">
        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--primary">
            <FileText size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Total Facturas</div>
            <div className="reporte-card__value">{resumen.total_facturas}</div>
            <div className="reporte-card__extra">
              {resumen.total_facturas_aceptadas} aceptadas
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--success">
            <CheckCircle size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Base Gravable</div>
            <div className="reporte-card__value">{formatCurrency(resumen.base_gravable_total)}</div>
            <div className="reporte-card__extra">IVA 19%</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <Download size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">IVA Generado</div>
            <div className="reporte-card__value">{formatCurrency(resumen.iva_total)}</div>
            <div className="reporte-card__extra">
              {((resumen.iva_total / resumen.base_gravable_total) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <FileText size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Gran Total</div>
            <div className="reporte-card__value">{formatCurrency(resumen.gran_total)}</div>
            <div className="reporte-card__extra">Base + IVA</div>
          </div>
        </div>
      </div>

      {/* Resumen por Estado DIAN */}
      <div className="reporte-section resumen-estados">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Resumen por Estado DIAN</h3>
          <p className="reporte-section-subtitle">
            Distribución de facturas según estado de transmisión
          </p>
        </div>

        <div className="estados-grid">
          {por_estado.map(estado => (
            <div key={estado.estado_dian} className="estado-card">
              <div className="estado-card__header">
                <div className={`estado-badge ${getEstadoBadgeClass(estado.estado_dian)}`}>
                  {getEstadoIcon(estado.estado_dian)}
                  <span>{estado.estado_dian}</span>
                </div>
              </div>
              <div className="estado-card__body">
                <div className="estado-stat">
                  <span className="estado-stat__label">Cantidad</span>
                  <span className="estado-stat__value">{estado.cantidad}</span>
                </div>
                <div className="estado-stat">
                  <span className="estado-stat__label">Base Gravable</span>
                  <span className="estado-stat__value">{formatCurrency(estado.base_gravable)}</span>
                </div>
                <div className="estado-stat">
                  <span className="estado-stat__label">IVA</span>
                  <span className="estado-stat__value">{formatCurrency(estado.iva)}</span>
                </div>
                <div className="estado-stat estado-stat--total">
                  <span className="estado-stat__label">Total</span>
                  <span className="estado-stat__value">{formatCurrency(estado.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Listado de Facturas Electrónicas</h3>
          <p className="reporte-section-subtitle">
            Registro detallado de todas las facturas del período
          </p>
        </div>

        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>Nº DIAN</th>
                <th>Nº Interno</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th className="text-right">Base Gravable</th>
                <th className="text-right">IVA</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
                <th>CUFE</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(factura => (
                <tr key={factura.factura_electronica_id}>
                  <td className="font-medium">{factura.numero_factura_dian}</td>
                  <td className="text-gray">{factura.numero_factura_interna}</td>
                  <td>{formatFecha(factura.fecha_factura)}</td>
                  <td>{factura.cliente_nombre}</td>
                  <td>
                    <span className="doc-badge">
                      {factura.cliente_tipo_documento} {factura.cliente_numero_documento}
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(factura.base_gravable)}
                  </td>
                  <td className="text-right text-warning">
                    {formatCurrency(factura.iva)}
                  </td>
                  <td className="text-right font-bold">
                    {formatCurrency(factura.total)}
                  </td>
                  <td>
                    <span className={`badge ${getEstadoBadgeClass(factura.estado_dian)}`}>
                      {factura.estado_dian}
                    </span>
                  </td>
                  <td>
                    {factura.cufe ? (
                      <span className="cufe-text" title={factura.cufe}>
                        {factura.cufe.substring(0, 12)}...
                      </span>
                    ) : (
                      <span className="text-gray">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" className="text-right font-bold">TOTALES:</td>
                <td className="text-right font-bold">{formatCurrency(resumen.base_gravable_total)}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.iva_total)}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.gran_total)}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Información DIAN */}
      <div className="reporte-section info-normativa">
        <h4>Información Normativa DIAN</h4>
        <ul>
          <li>Este reporte cumple con los requisitos establecidos en el Artículo 616-1 del Estatuto Tributario.</li>
          <li>Las facturas electrónicas deben ser conservadas durante 5 años según Art. 632 ET.</li>
          <li>El CUFE (Código Único de Factura Electrónica) es único para cada documento tributario.</li>
          <li>Estados válidos: Aceptada (validada por DIAN), Rechazada (errores de validación), Pendiente (en proceso), No Transmitida (no enviada).</li>
        </ul>
      </div>
    </div>
  );
}

export default ReporteLibroVentas;
