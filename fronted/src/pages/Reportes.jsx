import { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  Package,
  CreditCard,
  TrendingUp,
  FileText,
  PieChart,
  ArrowUpDown,
  Target,
  AlertCircle,
  Receipt,
  Percent,
  Building,
  ChevronRight
} from 'lucide-react';
import ReporteOcupacion from '../components/reportes/ReporteOcupacion';
import ReporteIngresos from '../components/reportes/ReporteIngresos';
import ReporteHuespedes from '../components/reportes/ReporteHuespedes';
import ReporteReservas from '../components/reportes/ReporteReservas';
import ReporteInventario from '../components/reportes/ReporteInventario';
import ReporteMetodosPago from '../components/reportes/ReporteMetodosPago';
import ReporteCierreCaja from '../components/reportes/ReporteCierreCaja';
import ReporteADR from '../components/reportes/ReporteADR';
import ReporteComparativo from '../components/reportes/ReporteComparativo';
import ReporteFuentesReserva from '../components/reportes/ReporteFuentesReserva';
import ReporteCancelaciones from '../components/reportes/ReporteCancelaciones';
import ReporteLibroVentas from '../components/reportes/ReporteLibroVentas';
import ReporteIVA from '../components/reportes/ReporteIVA';
import ReporteICA from '../components/reportes/ReporteICA';
import './Reportes.css';

function Reportes() {
  const [reporteActivo, setReporteActivo] = useState(null);

  // Reportes Operativos (existentes)
  const reportesOperativos = [
    {
      id: 'ocupacion',
      titulo: 'Ocupación',
      descripcion: 'Análisis de ocupación por día y tipo de habitación',
      icon: <BarChart3 size={28} />,
      color: 'success',
      categoria: 'operativo',
      component: ReporteOcupacion
    },
    {
      id: 'ingresos',
      titulo: 'Ingresos',
      descripcion: 'Análisis de ingresos por hospedaje y consumos',
      icon: <DollarSign size={28} />,
      color: 'primary',
      categoria: 'operativo',
      component: ReporteIngresos
    },
    {
      id: 'huespedes',
      titulo: 'Huéspedes',
      descripcion: 'Análisis de huéspedes frecuentes y lealtad',
      icon: <Users size={28} />,
      color: 'info',
      categoria: 'operativo',
      component: ReporteHuespedes
    },
    {
      id: 'reservas',
      titulo: 'Reservas',
      descripcion: 'Performance de reservas y canales de venta',
      icon: <Calendar size={28} />,
      color: 'secondary',
      categoria: 'operativo',
      component: ReporteReservas
    },
    {
      id: 'inventario',
      titulo: 'Inventario',
      descripcion: 'Control de stock y movimientos de productos',
      icon: <Package size={28} />,
      color: 'warning',
      categoria: 'operativo',
      component: ReporteInventario
    }
  ];

  // Reportes Financieros (nuevos - Fase 1)
  const reportesFinancieros = [
    {
      id: 'metodos-pago',
      titulo: 'Métodos de Pago',
      descripcion: 'Análisis de recaudación por método de pago',
      icon: <CreditCard size={28} />,
      color: 'purple',
      categoria: 'financiero',
      component: ReporteMetodosPago
    },
    {
      id: 'cierre-caja',
      titulo: 'Cierre de Caja',
      descripcion: 'Night Audit - Cuadre diario de caja y pagos',
      icon: <Receipt size={28} />,
      color: 'violet',
      categoria: 'financiero',
      component: ReporteCierreCaja
    },
    {
      id: 'adr-revpar',
      titulo: 'ADR y RevPAR',
      descripcion: 'Indicadores hoteleros: tarifa promedio y RevPAR',
      icon: <TrendingUp size={28} />,
      color: 'success',
      categoria: 'financiero',
      component: ReporteADR
    },
    {
      id: 'comparativo',
      titulo: 'Comparativo Períodos',
      descripcion: 'Comparación de períodos y análisis de crecimiento',
      icon: <ArrowUpDown size={28} />,
      color: 'info',
      categoria: 'financiero',
      component: ReporteComparativo
    }
  ];

  // Reportes Gerenciales (nuevos - Fase 1)
  const reportesGerenciales = [
    {
      id: 'fuentes-reserva',
      titulo: 'Fuentes de Reserva',
      descripcion: 'Performance por canal de venta (OTAs, directo, etc.)',
      icon: <Target size={28} />,
      color: 'secondary',
      categoria: 'gerencial',
      component: ReporteFuentesReserva
    },
    {
      id: 'cancelaciones',
      titulo: 'Análisis de Cancelaciones',
      descripcion: 'Tasas de cancelación, no-show y patrones',
      icon: <AlertCircle size={28} />,
      color: 'danger',
      categoria: 'gerencial',
      component: ReporteCancelaciones
    }
  ];

  // Reportes Fiscales
  const reportesFiscales = [
    {
      id: 'libro-ventas',
      titulo: 'Libro de Ventas DIAN',
      descripcion: 'Registro oficial de facturas electrónicas emitidas',
      icon: <FileText size={28} />,
      color: 'danger',
      categoria: 'fiscal',
      component: ReporteLibroVentas
    },
    {
      id: 'iva',
      titulo: 'Reporte de IVA',
      descripcion: 'Desglose de IVA generado por tarifas',
      icon: <Percent size={28} />,
      color: 'warning',
      categoria: 'fiscal',
      component: ReporteIVA
    },
    {
      id: 'ica',
      titulo: 'Impuesto ICA',
      descripcion: 'Impuesto de Industria y Comercio municipal',
      icon: <Building size={28} />,
      color: 'teal',
      categoria: 'fiscal',
      component: ReporteICA
    }
  ];

  const allReportes = [
    ...reportesOperativos,
    ...reportesFinancieros,
    ...reportesGerenciales,
    ...reportesFiscales
  ];

  const handleReporteClick = (reporte) => {
    if (reporte.component) {
      setReporteActivo(reporte.id);
    } else {
      // Placeholder para reportes no implementados
      alert(`Reporte "${reporte.titulo}" en desarrollo (Fase ${reporte.categoria === 'fiscal' ? '2' : '1'})`);
    }
  };

  const reporteActivoData = allReportes.find(r => r.id === reporteActivo);
  const ReporteComponent = reporteActivoData?.component;

  // Si hay un reporte activo, mostrarlo
  if (reporteActivo && ReporteComponent) {
    return (
      <div className="reportes-page">
        <div className="reportes-header">
          <button
            className="reportes-back-button"
            onClick={() => setReporteActivo(null)}
          >
            <span className="back-icon">←</span>
            <span className="back-text">Volver a Reportes</span>
          </button>
          <h1 className="reportes-title">{reporteActivoData.titulo}</h1>
          <p className="reportes-subtitle">{reporteActivoData.descripcion}</p>
        </div>

        <div className="reportes-content">
          <ReporteComponent />
        </div>
      </div>
    );
  }

  // Vista principal con grid de cards
  return (
    <div className="reportes-page">
      <div className="reportes-header">
        <h1 className="reportes-title">Reportes y Análisis</h1>
        <p className="reportes-subtitle">
          Analiza el rendimiento del hotel con reportes detallados organizados por categoría
        </p>
      </div>

      {/* Reportes Operativos */}
      <div className="reportes-section">
        <div className="reportes-section-header">
          <div className="reportes-section-icon reportes-section-icon--operativo">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="reportes-section-title">Reportes Operativos</h2>
            <p className="reportes-section-description">
              Análisis diario de ocupación, reservas y servicios
            </p>
          </div>
        </div>

        <div className="reportes-grid">
          {reportesOperativos.map(reporte => (
            <div
              key={reporte.id}
              className="reporte-card"
              onClick={() => handleReporteClick(reporte)}
            >
              <div className="reporte-card__header">
                <div className={`reporte-card__icon reporte-card__icon--${reporte.color}`}>
                  {reporte.icon}
                </div>
                <div className="reporte-card__content">
                  <h3 className="reporte-card__title">{reporte.titulo}</h3>
                  <p className="reporte-card__description">{reporte.descripcion}</p>
                </div>
              </div>
              <div className="reporte-card__footer">
                <div className="reporte-card__action">
                  <span>Generar reporte</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reportes Financieros */}
      <div className="reportes-section">
        <div className="reportes-section-header">
          <div className="reportes-section-icon reportes-section-icon--financiero">
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="reportes-section-title">Reportes Financieros y de Facturación</h2>
            <p className="reportes-section-description">
              Control de caja, métodos de pago e indicadores hoteleros
            </p>
          </div>
        </div>

        <div className="reportes-grid">
          {reportesFinancieros.map(reporte => (
            <div
              key={reporte.id}
              className="reporte-card"
              onClick={() => handleReporteClick(reporte)}
            >
              <div className="reporte-card__header">
                <div className={`reporte-card__icon reporte-card__icon--${reporte.color}`}>
                  {reporte.icon}
                </div>
                <div className="reporte-card__content">
                  <h3 className="reporte-card__title">{reporte.titulo}</h3>
                  <p className="reporte-card__description">{reporte.descripcion}</p>
                </div>
              </div>
              <div className="reporte-card__footer">
                <div className="reporte-card__action">
                  <span>{reporte.component ? 'Generar reporte' : 'Próximamente'}</span>
                  <ChevronRight size={16} />
                </div>
                {!reporte.component && (
                  <span className="reporte-card__badge reporte-card__badge--development">
                    En desarrollo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reportes Gerenciales */}
      <div className="reportes-section">
        <div className="reportes-section-header">
          <div className="reportes-section-icon reportes-section-icon--gerencial">
            <PieChart size={24} />
          </div>
          <div>
            <h2 className="reportes-section-title">Reportes Gerenciales y Análisis</h2>
            <p className="reportes-section-description">
              Toma de decisiones estratégicas y análisis de tendencias
            </p>
          </div>
        </div>

        <div className="reportes-grid">
          {reportesGerenciales.map(reporte => (
            <div
              key={reporte.id}
              className="reporte-card"
              onClick={() => handleReporteClick(reporte)}
            >
              <div className="reporte-card__header">
                <div className={`reporte-card__icon reporte-card__icon--${reporte.color}`}>
                  {reporte.icon}
                </div>
                <div className="reporte-card__content">
                  <h3 className="reporte-card__title">{reporte.titulo}</h3>
                  <p className="reporte-card__description">{reporte.descripcion}</p>
                </div>
              </div>
              <div className="reporte-card__footer">
                <div className="reporte-card__action">
                  <span>{reporte.component ? 'Generar reporte' : 'Próximamente'}</span>
                  <ChevronRight size={16} />
                </div>
                {!reporte.component && (
                  <span className="reporte-card__badge reporte-card__badge--development">
                    En desarrollo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reportes Fiscales */}
      <div className="reportes-section">
        <div className="reportes-section-header">
          <div className="reportes-section-icon reportes-section-icon--fiscal">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="reportes-section-title">Reportes Fiscales DIAN</h2>
            <p className="reportes-section-description">
              Compliance tributario y documentos oficiales
            </p>
          </div>
        </div>

        <div className="reportes-grid">
          {reportesFiscales.map(reporte => (
            <div
              key={reporte.id}
              className="reporte-card"
              onClick={() => handleReporteClick(reporte)}
            >
              <div className="reporte-card__header">
                <div className={`reporte-card__icon reporte-card__icon--${reporte.color}`}>
                  {reporte.icon}
                </div>
                <div className="reporte-card__content">
                  <h3 className="reporte-card__title">{reporte.titulo}</h3>
                  <p className="reporte-card__description">{reporte.descripcion}</p>
                </div>
              </div>
              <div className="reporte-card__footer">
                <div className="reporte-card__action">
                  <span>{reporte.component ? 'Generar reporte' : 'Proximamente'}</span>
                  <ChevronRight size={16} />
                </div>
                {!reporte.component && (
                  <span className="reporte-card__badge reporte-card__badge--planned">
                    Planificado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reportes;
