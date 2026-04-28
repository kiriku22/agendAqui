import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_DETALLE_TURNO } from '../../graphql/caja';
import {
  FaTimes,
  FaCashRegister,
  FaMoneyBillWave,
  FaArrowUp,
  FaArrowDown,
  FaReceipt,
  FaCoins,
  FaExclamationTriangle,
  FaCheckCircle,
  FaStickyNote
} from 'react-icons/fa';
import './ModalDetalleCierre.css';

const ModalDetalleCierre = ({ visible, onClose, turnoId }) => {
  const { data, loading, error } = useQuery(GET_DETALLE_TURNO, {
    variables: { turnoCajaId: turnoId },
    skip: !visible || !turnoId,
    fetchPolicy: 'network-only'
  });

  if (!visible) return null;

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMoneda = (valor) => {
    if (valor === null || valor === undefined) return '$0';
    return `$${parseFloat(valor).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const detalle = data?.detalleTurnoCaja;
  const turno = detalle?.turno;

  const getDiferenciaClase = (diferencia) => {
    if (!diferencia || diferencia === 0) return 'diferencia-cero';
    if (diferencia > 0) return 'diferencia-positiva';
    return 'diferencia-negativa';
  };

  const getDiferenciaTexto = (diferencia) => {
    if (!diferencia || diferencia === 0) return 'Cuadre exacto';
    if (diferencia > 0) return 'Sobrante';
    return 'Faltante';
  };

  return (
    <div className="modal-detalle-overlay" onClick={onClose}>
      <div className="modal-detalle-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-detalle-header">
          <div className="header-info">
            <FaCashRegister className="header-icon" />
            <div>
              <h2>Detalle de Cierre</h2>
              {turno && <span className="codigo-turno">{turno.codigo}</span>}
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="modal-detalle-body">
          {loading && (
            <div className="detalle-loading">
              <div className="spinner"></div>
              <p>Cargando detalle...</p>
            </div>
          )}

          {error && (
            <div className="detalle-error">
              <FaExclamationTriangle />
              <p>Error al cargar el detalle del cierre</p>
            </div>
          )}

          {!loading && !error && detalle && (
            <>
              {/* Info General */}
              <div className="seccion-info-general">
                <div className="info-card">
                  <div className="info-item">
                    <span className="info-label">Caja</span>
                    <span className="info-value">{turno.caja?.nombre || turno.caja?.codigo}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Cajero</span>
                    <span className="info-value">{turno.usuario?.nombre_completo}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Apertura</span>
                    <span className="info-value">{formatearFecha(turno.fecha_apertura)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Cierre</span>
                    <span className="info-value">{formatearFecha(turno.fecha_cierre)}</span>
                  </div>
                  {turno.closed_by && turno.closed_by.id !== turno.usuario?.id && (
                    <div className="info-item">
                      <span className="info-label">Cerrado por</span>
                      <span className="info-value">{turno.closed_by.nombre_completo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de Montos */}
              <div className="seccion-resumen">
                <h3><FaMoneyBillWave /> Resumen de Montos</h3>
                <div className="resumen-grid">
                  <div className="resumen-card">
                    <span className="resumen-label">Monto Inicial</span>
                    <span className="resumen-value">{formatearMoneda(turno.monto_inicial)}</span>
                  </div>
                  <div className="resumen-card resumen-ventas">
                    <span className="resumen-label">Total Ventas</span>
                    <span className="resumen-value">{formatearMoneda(detalle.total_ventas)}</span>
                  </div>
                  <div className="resumen-card resumen-ingresos">
                    <span className="resumen-label">Ingresos</span>
                    <span className="resumen-value"><FaArrowUp /> {formatearMoneda(detalle.total_ingresos)}</span>
                  </div>
                  <div className="resumen-card resumen-egresos">
                    <span className="resumen-label">Egresos</span>
                    <span className="resumen-value"><FaArrowDown /> {formatearMoneda(detalle.total_egresos)}</span>
                  </div>
                </div>

                {/* Montos de Cierre */}
                <div className="montos-cierre">
                  <div className="monto-item">
                    <span>Monto Esperado:</span>
                    <span className="monto-esperado">{formatearMoneda(turno.monto_esperado)}</span>
                  </div>
                  <div className="monto-item">
                    <span>Monto Real (Arqueo):</span>
                    <span className="monto-real">{formatearMoneda(turno.monto_real)}</span>
                  </div>
                  <div className={`monto-item diferencia ${getDiferenciaClase(turno.diferencia)}`}>
                    <span>Diferencia:</span>
                    <span className="monto-diferencia">
                      {turno.diferencia > 0 && '+'}{formatearMoneda(turno.diferencia)}
                      <small>({getDiferenciaTexto(turno.diferencia)})</small>
                    </span>
                  </div>
                </div>
              </div>

              {/* Ventas por Metodo de Pago */}
              {detalle.ventas_por_metodo && detalle.ventas_por_metodo.length > 0 && (
                <div className="seccion-ventas-metodo">
                  <h3><FaReceipt /> Ventas por Metodo de Pago</h3>
                  <div className="ventas-metodo-lista">
                    {detalle.ventas_por_metodo.map((vm, index) => (
                      <div key={index} className="ventas-metodo-item">
                        <div className="metodo-info">
                          <span className="metodo-nombre">{vm.metodo}</span>
                          <span className="metodo-transacciones">{vm.cantidad_transacciones} transacciones</span>
                        </div>
                        <span className="metodo-monto">{formatearMoneda(vm.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arqueo de Efectivo */}
              {detalle.arqueo && detalle.arqueo.length > 0 && (
                <div className="seccion-arqueo">
                  <h3><FaCoins /> Arqueo de Efectivo</h3>
                  <table className="arqueo-tabla">
                    <thead>
                      <tr>
                        <th>Denominacion</th>
                        <th className="text-center">Cantidad</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.arqueo.map((item, index) => (
                        <tr key={index}>
                          <td>{item.denominacion}</td>
                          <td className="text-center">{item.cantidad}</td>
                          <td className="text-right">{formatearMoneda(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2"><strong>Total Arqueo</strong></td>
                        <td className="text-right"><strong>{formatearMoneda(turno.monto_real)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Movimientos de Caja */}
              {detalle.movimientos && detalle.movimientos.length > 0 && (
                <div className="seccion-movimientos">
                  <h3><FaMoneyBillWave /> Movimientos de Caja</h3>
                  <div className="movimientos-lista">
                    {detalle.movimientos.map((mov, index) => (
                      <div key={index} className={`movimiento-item movimiento-${mov.tipo}`}>
                        <div className="movimiento-icono">
                          {mov.tipo === 'ingreso' ? <FaArrowUp /> : <FaArrowDown />}
                        </div>
                        <div className="movimiento-info">
                          <span className="movimiento-concepto">{mov.concepto}</span>
                          {mov.descripcion && (
                            <span className="movimiento-descripcion">{mov.descripcion}</span>
                          )}
                        </div>
                        <span className={`movimiento-monto ${mov.tipo}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(mov.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas de Cierre */}
              {turno.notas_cierre && (
                <div className="seccion-notas">
                  <h3><FaStickyNote /> Notas de Cierre</h3>
                  <div className="notas-contenido">
                    {turno.notas_cierre}
                  </div>
                </div>
              )}

              {/* Estado Final */}
              <div className="seccion-estado">
                <div className={`estado-badge ${turno.diferencia === 0 ? 'cuadrado' : turno.diferencia > 0 ? 'sobrante' : 'faltante'}`}>
                  <FaCheckCircle />
                  <span>
                    {turno.diferencia === 0
                      ? 'Caja Cuadrada'
                      : turno.diferencia > 0
                        ? `Sobrante de ${formatearMoneda(turno.diferencia)}`
                        : `Faltante de ${formatearMoneda(Math.abs(turno.diferencia))}`
                    }
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleCierre;
