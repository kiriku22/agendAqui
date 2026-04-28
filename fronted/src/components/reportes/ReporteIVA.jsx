import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { FileText, Percent, DollarSign, Building2, ShoppingCart, Briefcase, XCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import FiltrosReporte from './FiltrosReporte';
import { GET_REPORTE_IVA } from '../../graphql/reportes';
import './ReporteIVA.css';

function ReporteIVA() {
  const [datos, setDatos] = useState(null);
  const [fechasFiltro, setFechasFiltro] = useState({ fechaDesde: '', fechaHasta: '' });
  const [fetchReporte, { loading, error }] = useLazyQuery(GET_REPORTE_IVA, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setDatos(data.reporteIVA);
    },
    onError: (err) => {
      console.error('Error al obtener reporte IVA:', err);
    }
  });

  const handleFiltrar = ({ fechaDesde, fechaHasta }) => {
    setFechasFiltro({ fechaDesde, fechaHasta });
    fetchReporte({ variables: { fechaDesde, fechaHasta } });
  };

  // Descargar archivo Excel (.xlsx)
  const handleDescargarExcel = () => {
    if (!datos) return;

    const { resumen, detalles, por_tarifa, por_categoria } = datos;
    const fechaGeneracion = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // Datos para la hoja
    const wsData = [
      // Encabezado del reporte
      ['REPORTE DE IVA - IMPUESTO AL VALOR AGREGADO'],
      [],
      ['Fecha de Generacion:', fechaGeneracion],
      ['Periodo:', `${fechasFiltro.fechaDesde} al ${fechasFiltro.fechaHasta}`],
      [],
      // Resumen
      ['RESUMEN GENERAL'],
      ['Total Facturas:', resumen.total_facturas],
      ['Base Gravable Total:', resumen.base_gravable_total],
      ['IVA Total:', resumen.iva_total],
      ['Gran Total:', resumen.gran_total],
      [],
      ['DESGLOSE POR CATEGORIA'],
      ['IVA Hospedaje:', resumen.iva_hospedaje],
      ['IVA Consumos/POS:', resumen.iva_consumos],
      ['IVA Servicios:', resumen.iva_servicios],
      [],
      [],
      // Desglose por Tarifa
      ['DESGLOSE POR TARIFA IVA'],
      ['Tarifa %', 'Base Gravable', 'IVA Generado', 'Cantidad'],
      ...por_tarifa.map(t => [
        `${t.tarifa}%`,
        t.base_gravable,
        t.iva_generado,
        t.cantidad
      ]),
      [],
      [],
      // Desglose por Categoria
      ['DESGLOSE POR CATEGORIA'],
      ['Categoria', 'Base Gravable', 'IVA', 'Cantidad'],
      ...por_categoria.map(c => [
        c.categoria,
        c.base_gravable,
        c.iva,
        c.cantidad
      ]),
      [],
      [],
      // Encabezados de la tabla de detalles
      ['DETALLE DE FACTURAS'],
      ['No. Factura', 'Fecha', 'Cliente', 'Documento', 'Categoria', 'Base Gravable', 'Tarifa IVA', 'IVA Generado', 'Total'],
      // Datos de facturas
      ...detalles.map(f => [
        f.numero_factura,
        f.fecha ? new Date(f.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
        f.cliente_nombre,
        f.cliente_documento,
        f.categoria,
        f.base_gravable,
        `${f.tarifa_iva}%`,
        f.iva_generado,
        f.total
      ]),
      // Fila de totales
      [],
      ['TOTALES', '', '', '', '', resumen.base_gravable_total, '', resumen.iva_total, resumen.gran_total]
    ];

    // Crear hoja de trabajo
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 15 },  // No. Factura
      { wch: 12 },  // Fecha
      { wch: 30 },  // Cliente
      { wch: 15 },  // Documento
      { wch: 12 },  // Categoria
      { wch: 15 },  // Base Gravable
      { wch: 12 },  // Tarifa IVA
      { wch: 15 },  // IVA Generado
      { wch: 15 },  // Total
    ];

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte IVA');

    // Generar archivo y descargar
    XLSX.writeFile(wb, `reporte_iva_${fechasFiltro.fechaDesde}_${fechasFiltro.fechaHasta}.xlsx`);
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

  const getCategoriaIcon = (categoria) => {
    const icons = {
      'Hospedaje': <Building2 size={16} />,
      'POS': <ShoppingCart size={16} />,
      'Otro': <Briefcase size={16} />
    };
    return icons[categoria] || <Briefcase size={16} />;
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      'Hospedaje': 'categoria--hospedaje',
      'POS': 'categoria--pos',
      'Otro': 'categoria--otro'
    };
    return colors[categoria] || 'categoria--otro';
  };

  if (!datos) {
    return (
      <div className="reporte-iva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="reporte-placeholder">
          <Percent size={64} />
          <h3>Reporte de IVA</h3>
          <p>
            Desglose del Impuesto al Valor Agregado (IVA) generado por las operaciones del hotel.
            Selecciona un rango de fechas para generar el reporte.
          </p>
          <div className="info-dian">
            <div className="info-item">
              <strong>Tarifa General:</strong> 19% (Colombia)
            </div>
            <div className="info-item">
              <strong>Incluye:</strong> IVA de hospedaje, consumos y servicios
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reporte-iva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando reporte de IVA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporte-iva">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <div className="error">
          <XCircle size={48} />
          <h3>Error al generar el reporte</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const { resumen, detalles, por_tarifa, por_categoria } = datos;

  return (
    <div className="reporte-iva">
      {/* Filtros y Acciones */}
      <div className="reporte-header-actions">
        <FiltrosReporte onFiltrar={handleFiltrar} />
        <button
          className="btn-descargar-excel"
          onClick={handleDescargarExcel}
          title="Descargar Reporte de IVA en formato Excel"
        >
          <FileSpreadsheet size={20} />
          <span>Descargar Excel</span>
        </button>
      </div>

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
            <div className="reporte-card__label">Base Gravable</div>
            <div className="reporte-card__value">{formatCurrency(resumen.base_gravable_total)}</div>
            <div className="reporte-card__extra">subtotal antes de IVA</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--warning">
            <Percent size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">IVA Total</div>
            <div className="reporte-card__value">{formatCurrency(resumen.iva_total)}</div>
            <div className="reporte-card__extra">impuesto generado</div>
          </div>
        </div>

        <div className="reporte-card">
          <div className="reporte-card__icon reporte-card__icon--info">
            <DollarSign size={24} />
          </div>
          <div className="reporte-card__content">
            <div className="reporte-card__label">Gran Total</div>
            <div className="reporte-card__value">{formatCurrency(resumen.gran_total)}</div>
            <div className="reporte-card__extra">base + IVA</div>
          </div>
        </div>
      </div>

      {/* Desglose por Tarifa y Categoria */}
      <div className="reporte-grid-2">
        {/* Desglose por Tarifa */}
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Desglose por Tarifa IVA</h3>
            <p className="reporte-section-subtitle">
              Distribucion del IVA segun tarifas aplicadas
            </p>
          </div>
          <div className="tarifa-cards">
            {por_tarifa.map(tarifa => (
              <div key={tarifa.tarifa} className="tarifa-card">
                <div className="tarifa-card__header">
                  <span className="tarifa-badge">{tarifa.tarifa}%</span>
                  <span className="tarifa-cantidad">{tarifa.cantidad} facturas</span>
                </div>
                <div className="tarifa-card__body">
                  <div className="tarifa-stat">
                    <span className="tarifa-stat__label">Base Gravable</span>
                    <span className="tarifa-stat__value">{formatCurrency(tarifa.base_gravable)}</span>
                  </div>
                  <div className="tarifa-stat tarifa-stat--highlight">
                    <span className="tarifa-stat__label">IVA Generado</span>
                    <span className="tarifa-stat__value">{formatCurrency(tarifa.iva_generado)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose por Categoria */}
        <div className="reporte-section">
          <div className="reporte-section-header">
            <h3 className="reporte-section-title">Desglose por Categoria</h3>
            <p className="reporte-section-subtitle">
              IVA generado por tipo de operacion
            </p>
          </div>
          <div className="categoria-cards">
            {por_categoria.map(cat => (
              <div key={cat.categoria} className={`categoria-card ${getCategoriaColor(cat.categoria)}`}>
                <div className="categoria-card__icon">
                  {getCategoriaIcon(cat.categoria)}
                </div>
                <div className="categoria-card__content">
                  <div className="categoria-card__title">{cat.categoria}</div>
                  <div className="categoria-card__stats">
                    <div className="categoria-stat">
                      <span className="categoria-stat__label">Base</span>
                      <span className="categoria-stat__value">{formatCurrency(cat.base_gravable)}</span>
                    </div>
                    <div className="categoria-stat">
                      <span className="categoria-stat__label">IVA</span>
                      <span className="categoria-stat__value categoria-stat__value--highlight">{formatCurrency(cat.iva)}</span>
                    </div>
                    <div className="categoria-stat">
                      <span className="categoria-stat__label">Facturas</span>
                      <span className="categoria-stat__value">{cat.cantidad}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="reporte-section">
        <div className="reporte-section-header">
          <h3 className="reporte-section-title">Detalle de Facturas</h3>
          <p className="reporte-section-subtitle">
            Listado completo de facturas con desglose de IVA
          </p>
        </div>

        <div className="reporte-table-container">
          <table className="reporte-table">
            <thead>
              <tr>
                <th>No. Factura</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Categoria</th>
                <th className="text-right">Base Gravable</th>
                <th className="text-center">Tarifa</th>
                <th className="text-right">IVA</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map(factura => (
                <tr key={factura.factura_id}>
                  <td className="font-medium">{factura.numero_factura}</td>
                  <td>{formatFecha(factura.fecha)}</td>
                  <td>{factura.cliente_nombre}</td>
                  <td className="text-gray">{factura.cliente_documento || 'N/A'}</td>
                  <td>
                    <span className={`categoria-badge ${getCategoriaColor(factura.categoria)}`}>
                      {getCategoriaIcon(factura.categoria)}
                      <span>{factura.categoria}</span>
                    </span>
                  </td>
                  <td className="text-right">{formatCurrency(factura.base_gravable)}</td>
                  <td className="text-center">
                    <span className="tarifa-mini-badge">{factura.tarifa_iva}%</span>
                  </td>
                  <td className="text-right text-warning font-medium">
                    {formatCurrency(factura.iva_generado)}
                  </td>
                  <td className="text-right font-bold">
                    {formatCurrency(factura.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" className="text-right font-bold">TOTALES:</td>
                <td className="text-right font-bold">{formatCurrency(resumen.base_gravable_total)}</td>
                <td></td>
                <td className="text-right font-bold">{formatCurrency(resumen.iva_total)}</td>
                <td className="text-right font-bold">{formatCurrency(resumen.gran_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Informacion DIAN */}
      <div className="reporte-section info-normativa">
        <h4>Informacion Normativa - IVA</h4>
        <ul>
          <li>El IVA (Impuesto al Valor Agregado) en Colombia tiene una tarifa general del 19% segun el Estatuto Tributario.</li>
          <li>Los servicios de alojamiento y hospedaje estan gravados con IVA a la tarifa general del 19%.</li>
          <li>El IVA debe ser declarado y pagado bimestralmente o cuatrimestralmente segun el regimen del contribuyente.</li>
          <li>Este reporte facilita la liquidacion del formulario 300 (Declaracion de IVA) ante la DIAN.</li>
        </ul>
      </div>
    </div>
  );
}

export default ReporteIVA;
