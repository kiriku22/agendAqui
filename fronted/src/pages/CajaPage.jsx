import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TURNO_ACTUAL, GET_RESUMEN_TURNO, APERTURA_CAJA, CIERRE_CAJA } from '../graphql/caja';
import { ME } from '../graphql/auth';
import { useNotification } from '../contexts/NotificationContext';
import ModalHistorialCaja from '../components/caja/ModalHistorialCaja';
import {
  FaDollarSign,
  FaChartLine,
  FaCheckCircle,
  FaHistory,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaCreditCard,
  FaExchangeAlt
} from 'react-icons/fa';
import './CajaPage.css';

const CajaPage = () => {
  const CAJA_ID = 1; // ID de la caja principal
  const { success, error } = useNotification();

  const [mostrarApertura, setMostrarApertura] = useState(false);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('');

  // Apertura form
  const [montoInicial, setMontoInicial] = useState('50000');
  const [notasApertura, setNotasApertura] = useState('');

  // Cierre form
  const [arqueo, setArqueo] = useState([
    { denominacion: '100000', cantidad: 0, valor_unitario: 100000 },
    { denominacion: '50000', cantidad: 0, valor_unitario: 50000 },
    { denominacion: '20000', cantidad: 0, valor_unitario: 20000 },
    { denominacion: '10000', cantidad: 0, valor_unitario: 10000 },
    { denominacion: '5000', cantidad: 0, valor_unitario: 5000 },
    { denominacion: '2000', cantidad: 0, valor_unitario: 2000 },
    { denominacion: '1000', cantidad: 0, valor_unitario: 1000 },
    { denominacion: '500', cantidad: 0, valor_unitario: 500 },
    { denominacion: '200', cantidad: 0, valor_unitario: 200 },
    { denominacion: '100', cantidad: 0, valor_unitario: 100 },
    { denominacion: '50', cantidad: 0, valor_unitario: 50 },
  ]);
  const [notasCierre, setNotasCierre] = useState('');

  // Contraseñas para seguridad
  const [passwordApertura, setPasswordApertura] = useState('');
  const [passwordCierre, setPasswordCierre] = useState('');

  // Queries
  const { data: turnoData, loading: turnoLoading, refetch: refetchTurno } = useQuery(GET_TURNO_ACTUAL, {
    variables: { cajaId: CAJA_ID },
    pollInterval: 30000,
  });

  const { data: resumenData, loading: resumenLoading } = useQuery(GET_RESUMEN_TURNO, {
    variables: { turnoCajaId: turnoData?.turnoActual?.id },
    skip: !turnoData?.turnoActual?.id,
    pollInterval: 30000,
  });

  // Query para obtener usuario actual
  const { data: userData } = useQuery(ME);
  const currentUser = userData?.me;

  // Calcular tiempo transcurrido
  useEffect(() => {
    if (!turnoData?.turnoActual?.fecha_apertura) {
      setTiempoTranscurrido('');
      return;
    }

    const calcular = () => {
      const ahora = new Date();
      const apertura = new Date(turnoData.turnoActual.fecha_apertura);
      const diff = ahora - apertura;
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTiempoTranscurrido(`${horas}h ${minutos}min`);
    };

    calcular();
    const interval = setInterval(calcular, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [turnoData?.turnoActual?.fecha_apertura]);

  // Mutations
  const [aperturaCaja, { loading: abriendoCaja }] = useMutation(APERTURA_CAJA, {
    onCompleted: () => {
      success('Caja abierta exitosamente');
      setMostrarApertura(false);
      setMontoInicial('50000');
      setNotasApertura('');
      setPasswordApertura('');
      refetchTurno();
    },
    onError: (err) => {
      error(`Error al abrir caja: ${err.message}`);
    },
  });

  const [cierreCaja, { loading: cerrandoCaja }] = useMutation(CIERRE_CAJA, {
    onCompleted: () => {
      success('Caja cerrada exitosamente');
      setMostrarCierre(false);
      setArqueo(arqueo.map(d => ({ ...d, cantidad: 0 })));
      setNotasCierre('');
      setPasswordCierre('');
      refetchTurno();
    },
    onError: (err) => {
      error(`Error al cerrar caja: ${err.message}`);
    },
  });

  // Handlers
  const handleApertura = (e) => {
    e.preventDefault();
    if (parseFloat(montoInicial) < 0) {
      error('El monto inicial debe ser mayor o igual a 0');
      return;
    }
    if (!passwordApertura.trim()) {
      error('Debe ingresar su contraseña para abrir la caja');
      return;
    }
    aperturaCaja({
      variables: {
        input: {
          caja_id: CAJA_ID,
          monto_inicial: parseFloat(montoInicial),
          notas_apertura: notasApertura || null,
          password: passwordApertura,
        },
      },
    });
  };

  const handleCierre = (e) => {
    e.preventDefault();

    const arqueoFiltrado = arqueo.filter(d => d.cantidad > 0);
    const montoReal = calcularMontoReal();
    const montoEsperado = resumenData?.resumenTurnoCaja?.efectivo_esperado || 0;
    const diferencia = Math.abs(montoReal - montoEsperado);

    // Validar que se haya contado al menos una denominacion
    if (arqueoFiltrado.length === 0) {
      error('Debe contar al menos una denominacion para cerrar la caja');
      return;
    }

    if (diferencia > 5000 && !notasCierre) {
      error('Se requieren notas de cierre para diferencias mayores a $5,000');
      return;
    }

    if (!passwordCierre.trim()) {
      error('Debe ingresar su contraseña para cerrar la caja');
      return;
    }

    cierreCaja({
      variables: {
        input: {
          turno_caja_id: turnoData.turnoActual.id,
          arqueo: arqueoFiltrado,
          notas_cierre: notasCierre || null,
          password: passwordCierre,
        },
      },
    });
  };

  const actualizarCantidadArqueo = (index, nuevaCantidad) => {
    setArqueo(arqueo.map((d, i) =>
      i === index ? { ...d, cantidad: parseInt(nuevaCantidad) || 0 } : d
    ));
  };

  // Funciones para cerrar modales (limpian contraseña por seguridad)
  const cerrarModalApertura = () => {
    setMostrarApertura(false);
    setPasswordApertura('');
  };

  const cerrarModalCierre = () => {
    setMostrarCierre(false);
    setPasswordCierre('');
  };

  const calcularMontoReal = () => {
    return arqueo.reduce((sum, d) => sum + (d.cantidad * d.valor_unitario), 0);
  };

  // Formatear moneda
  const formatMoney = (value) => {
    return `$${(value || 0).toLocaleString('es-CO')}`;
  };

  // Obtener monto por metodo de pago
  const getMontoMetodo = (nombreMetodo) => {
    if (!resumenData?.resumenTurnoCaja?.ingresos_por_metodo) return 0;
    const metodo = resumenData.resumenTurnoCaja.ingresos_por_metodo.find(
      m => m.metodo_pago.nombre.toLowerCase().includes(nombreMetodo.toLowerCase())
    );
    return metodo?.total || 0;
  };

  if (turnoLoading) return <div className="caja-loading">Cargando...</div>;

  const turnoActual = turnoData?.turnoActual;
  const resumen = resumenData?.resumenTurnoCaja;
  const montoReal = calcularMontoReal();
  const montoEsperado = resumen?.efectivo_esperado || 0;
  const diferencia = montoReal - montoEsperado;

  return (
    <div className="caja-page">
      {/* Header */}
      <header className="caja-header">
        <div className="header-left">
          <h1>Gestion de Caja</h1>
          <p className="header-subtitle">Control de apertura, cierre y resumen de ventas</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-dark" onClick={() => setMostrarHistorial(true)}>
            <FaHistory /> Ver Historial
          </button>
          {turnoActual && (
            <button className="btn btn-success" onClick={() => setMostrarCierre(true)}>
              <FaCheckCircle /> Cerrar Caja
            </button>
          )}
        </div>
      </header>

      <div className="caja-content">
        {turnoActual ? (
          <>
            {/* Badges de estado */}
            <div className="badges-container">
              <span className="badge badge-open">CAJA ABIERTA</span>
              <span className="badge badge-time">
                <FaClock /> Abierta hace {tiempoTranscurrido}
              </span>
              <span className="badge badge-user">
                <FaUser /> Usuario: {turnoActual.usuario?.nombre_completo || 'Sin usuario'}
              </span>
              <span className="badge badge-date">
                <FaCalendarAlt /> {new Date(turnoActual.fecha_apertura).toLocaleString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/Bogota'
                })}
              </span>
            </div>

            {/* Cards de metricas principales */}
            <div className="metrics-grid">
              <div className="metric-card metric-green">
                <div className="metric-icon">
                  <FaDollarSign />
                </div>
                <div className="metric-content">
                  <span className="metric-label">MONTO INICIAL</span>
                  <span className="metric-value">{formatMoney(turnoActual.monto_inicial)}</span>
                </div>
              </div>

              <div className="metric-card metric-green-light">
                <div className="metric-icon">
                  <FaChartLine />
                </div>
                <div className="metric-content">
                  <span className="metric-label">TOTAL VENTAS</span>
                  <span className="metric-value">{formatMoney(resumen?.total_ventas)}</span>
                  <span className="metric-sub">{resumen?.num_ventas || 0} facturas</span>
                </div>
              </div>

              <div className="metric-card metric-yellow">
                <div className="metric-icon">
                  <FaCheckCircle />
                </div>
                <div className="metric-content">
                  <span className="metric-label">MONTO ESPERADO</span>
                  <span className="metric-value">{formatMoney(resumen?.efectivo_esperado)}</span>
                  <span className="metric-sub">Inicial + Efectivo</span>
                </div>
              </div>
            </div>

            {/* Cards de metodos de pago */}
            <div className="metodos-grid">
              <div className="metodo-card metodo-efectivo">
                <div className="metodo-icon">
                  <FaMoneyBillWave />
                </div>
                <div className="metodo-content">
                  <span className="metodo-label">EFECTIVO</span>
                  <span className="metodo-value">{formatMoney(getMontoMetodo('efectivo'))}</span>
                </div>
              </div>

              <div className="metodo-card metodo-tarjeta">
                <div className="metodo-icon">
                  <FaCreditCard />
                </div>
                <div className="metodo-content">
                  <span className="metodo-label">TARJETA</span>
                  <span className="metodo-value">{formatMoney(getMontoMetodo('tarjeta'))}</span>
                </div>
              </div>

              <div className="metodo-card metodo-transferencia">
                <div className="metodo-icon">
                  <FaExchangeAlt />
                </div>
                <div className="metodo-content">
                  <span className="metodo-label">TRANSFERENCIA</span>
                  <span className="metodo-value">{formatMoney(getMontoMetodo('transfer'))}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="sin-turno-card">
            <div className="sin-turno-icon">
              <FaDollarSign />
            </div>
            <h2>No hay turno abierto</h2>
            <p>Debe abrir un turno de caja para poder realizar ventas</p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setMostrarApertura(true)}
            >
              Abrir Caja
            </button>
          </div>
        )}
      </div>

      {/* Modal Apertura */}
      {mostrarApertura && (
        <div className="modal-overlay" onClick={cerrarModalApertura}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apertura de Caja</h2>
              <button className="btn-close" onClick={cerrarModalApertura}>×</button>
            </div>

            <form onSubmit={handleApertura} className="modal-body">
              <div className="form-group">
                <label>Monto Inicial (Fondo de Caja)</label>
                <input
                  type="number"
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                  step="1000"
                  min="0"
                  required
                  className="form-control"
                />
                <small>Efectivo con el que inicia el turno</small>
              </div>

              <div className="form-group">
                <label>Notas (Opcional)</label>
                <textarea
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  rows="3"
                  className="form-control"
                  placeholder="Observaciones de apertura..."
                />
              </div>

              {/* Usuario actual y contraseña */}
              <div className="form-group user-info-group">
                <label>Usuario</label>
                <div className="user-info-display">
                  <FaUser />
                  <span>{currentUser?.nombre} {currentUser?.apellido}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passwordApertura">
                  Contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="passwordApertura"
                  value={passwordApertura}
                  onChange={(e) => setPasswordApertura(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                  className="form-control"
                  autoFocus
                />
                <small>Confirme su identidad para abrir la caja</small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModalApertura}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={abriendoCaja}>
                  {abriendoCaja ? 'Abriendo...' : 'Abrir Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre */}
      {mostrarCierre && turnoActual && (
        <div className="modal-overlay" onClick={cerrarModalCierre}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cierre de Caja - {turnoActual.codigo}</h2>
              <button className="btn-close" onClick={cerrarModalCierre}>×</button>
            </div>

            <form onSubmit={handleCierre} className="modal-body">
              <div className="arqueo-section">
                <h3>Conteo de Denominaciones</h3>
                <p className="text-muted">Cuente el efectivo fisico en caja</p>

                <div className="arqueo-grid">
                  {arqueo.map((d, index) => (
                    <div key={index} className="arqueo-item">
                      <label>${parseInt(d.denominacion).toLocaleString('es-CO')}</label>
                      <input
                        type="number"
                        value={d.cantidad}
                        onChange={(e) => actualizarCantidadArqueo(index, e.target.value)}
                        min="0"
                        className="form-control-sm"
                      />
                      <span className="subtotal">
                        ${(d.cantidad * d.valor_unitario).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="arqueo-totales">
                  <div className="total-row">
                    <span>Monto Real (Contado):</span>
                    <span className="monto-real">${montoReal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="total-row">
                    <span>Monto Esperado (Sistema):</span>
                    <span>${montoEsperado.toLocaleString('es-CO')}</span>
                  </div>
                  <div className={`total-row diferencia ${diferencia > 0 ? 'positiva' : diferencia < 0 ? 'negativa' : 'exacta'}`}>
                    <span>Diferencia:</span>
                    <span>
                      {diferencia > 0 && '+'}{diferencia < 0 && '-'}${Math.abs(diferencia).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {Math.abs(diferencia) > 0 && (
                  <div className={`alert ${Math.abs(diferencia) > 5000 ? 'alert-warning' : 'alert-info'}`}>
                    {Math.abs(diferencia) > 5000 ? (
                      <>Diferencia mayor a $5,000. Por favor explique la discrepancia en las notas.</>
                    ) : (
                      <>Diferencia menor. Considere agregar notas explicativas.</>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Notas de Cierre {Math.abs(diferencia) > 5000 && <span className="required">*</span>}</label>
                <textarea
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  rows="4"
                  className="form-control"
                  placeholder="Observaciones, incidentes, explicacion de diferencias..."
                  required={Math.abs(diferencia) > 5000}
                />
              </div>

              {/* Usuario actual y contraseña */}
              <div className="form-group user-info-group">
                <label>Usuario</label>
                <div className="user-info-display">
                  <FaUser />
                  <span>{currentUser?.nombre} {currentUser?.apellido}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passwordCierre">
                  Contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="passwordCierre"
                  value={passwordCierre}
                  onChange={(e) => setPasswordCierre(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                  className="form-control"
                />
                <small>Confirme su identidad para cerrar la caja</small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModalCierre}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger" disabled={cerrandoCaja}>
                  {cerrandoCaja ? 'Cerrando...' : 'Cerrar Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      <ModalHistorialCaja
        visible={mostrarHistorial}
        onClose={() => setMostrarHistorial(false)}
      />
    </div>
  );
};

export default CajaPage;
