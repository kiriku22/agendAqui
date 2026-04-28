import React, { useState, useEffect } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { GET_HISTORIAL_TURNOS, REIMPRIMIR_CIERRE_CAJA } from '../../graphql/caja';
import { GET_USUARIOS } from '../../graphql/configuracion';
import { FaTimes, FaSearch, FaChevronLeft, FaChevronRight, FaFilter, FaEye, FaPrint } from 'react-icons/fa';
import { useNotification } from '../../contexts/NotificationContext';
import ModalDetalleCierre from './ModalDetalleCierre';
import './ModalHistorialCaja.css';

const ModalHistorialCaja = ({ visible, onClose }) => {
  const LIMIT = 10;
  const { success, error: showError } = useNotification();

  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(0);

  // Estados para modal de detalle y reimpresion
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [reimprimiendo, setReimprimiendo] = useState(null);

  // Query para usuarios (para el select)
  const { data: usuariosData } = useQuery(GET_USUARIOS, {
    variables: { activo: true },
    skip: !visible
  });

  // Query lazy para historial
  const [fetchHistorial, { data: historialData, loading, error }] = useLazyQuery(GET_HISTORIAL_TURNOS, {
    fetchPolicy: 'network-only'
  });

  // Mutation para reimprimir cierre
  const [reimprimirCierre] = useMutation(REIMPRIMIR_CIERRE_CAJA);

  // Cargar historial cuando se abre el modal
  useEffect(() => {
    if (visible) {
      buscarHistorial();
    }
  }, [visible]);

  // Función para buscar
  const buscarHistorial = (newPage = 0) => {
    setPage(newPage);
    fetchHistorial({
      variables: {
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
        usuarioId: usuarioId ? parseInt(usuarioId) : null,
        estado: estado || null,
        limit: LIMIT,
        offset: newPage * LIMIT
      }
    });
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setUsuarioId('');
    setEstado('');
    setPage(0);
    fetchHistorial({
      variables: {
        fechaDesde: null,
        fechaHasta: null,
        usuarioId: null,
        estado: null,
        limit: LIMIT,
        offset: 0
      }
    });
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatearMoneda = (valor) => {
    if (valor === null || valor === undefined) return '-';
    return `$${valor.toLocaleString('es-CO')}`;
  };

  // Obtener clase de diferencia
  const getClaseDiferencia = (diferencia) => {
    if (diferencia === null || diferencia === undefined) return '';
    if (diferencia === 0) return 'diferencia-cero';
    if (diferencia > 0) return 'diferencia-positiva';
    return 'diferencia-negativa';
  };

  // Formatear diferencia
  const formatearDiferencia = (diferencia) => {
    if (diferencia === null || diferencia === undefined) return '-';
    const signo = diferencia > 0 ? '+' : '';
    return `${signo}${formatearMoneda(diferencia)}`;
  };

  // Manejar ver detalle
  const handleVerDetalle = (turnoId) => {
    setTurnoSeleccionado(turnoId);
    setModalDetalleVisible(true);
  };

  // Cerrar modal de detalle
  const handleCerrarDetalle = () => {
    setModalDetalleVisible(false);
    setTurnoSeleccionado(null);
  };

  // Manejar reimpresion
  const handleReimprimir = async (turnoId) => {
    if (reimprimiendo) return;

    setReimprimiendo(turnoId);
    try {
      const result = await reimprimirCierre({
        variables: { turnoCajaId: turnoId }
      });

      if (result.data?.reimprimirCierreCaja) {
        success('Cierre enviado a la cola de impresion');
      } else {
        showError('No se pudo enviar a imprimir');
      }
    } catch (err) {
      console.error('Error al reimprimir:', err);
      showError('Error al reimprimir: ' + err.message);
    } finally {
      setReimprimiendo(null);
    }
  };

  if (!visible) return null;

  const turnos = historialData?.historialTurnos?.turnos || [];
  const total = historialData?.historialTurnos?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="modal-historial-overlay" onClick={onClose}>
      <div className="modal-historial-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-historial-header">
          <h2>Historial de Turnos</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Filtros */}
        <div className="modal-historial-filtros">
          <div className="filtro-grupo">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="filtro-input"
            />
          </div>
          <div className="filtro-grupo">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="filtro-input"
            />
          </div>
          <div className="filtro-grupo">
            <label>Usuario</label>
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              className="filtro-select"
            >
              <option value="">Todos</option>
              {usuariosData?.usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-grupo">
            <label>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="filtro-select"
            >
              <option value="">Todos</option>
              <option value="abierto">Abierto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div className="filtro-acciones">
            <button className="btn-filtrar" onClick={() => buscarHistorial(0)}>
              <FaSearch /> Buscar
            </button>
            <button className="btn-limpiar" onClick={limpiarFiltros}>
              <FaFilter /> Limpiar
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="modal-historial-body">
          {loading && (
            <div className="historial-loading">Cargando...</div>
          )}

          {error && (
            <div className="historial-error">Error al cargar el historial</div>
          )}

          {!loading && !error && turnos.length === 0 && (
            <div className="historial-empty">
              No se encontraron turnos con los filtros seleccionados
            </div>
          )}

          {!loading && !error && turnos.length > 0 && (
            <table className="historial-tabla">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th>Cajero</th>
                  <th>Ventas</th>
                  <th>Total</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                  <th className="col-acciones-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((turno) => (
                  <tr key={turno.id}>
                    <td className="col-codigo">{turno.codigo}</td>
                    <td className="col-fecha">{formatearFecha(turno.fecha_apertura)}</td>
                    <td className="col-fecha">{formatearFecha(turno.fecha_cierre)}</td>
                    <td className="col-cajero">{turno.usuario?.nombre_completo || '-'}</td>
                    <td className="col-ventas">{turno.num_ventas}</td>
                    <td className="col-total">{formatearMoneda(turno.total_ventas)}</td>
                    <td className={`col-diferencia ${getClaseDiferencia(turno.diferencia)}`}>
                      {formatearDiferencia(turno.diferencia)}
                    </td>
                    <td className="col-estado">
                      <span className={`badge-estado badge-${turno.estado}`}>
                        {turno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="col-acciones">
                      {turno.estado === 'cerrado' && (
                        <>
                          <button
                            className="btn-accion btn-ver-detalle"
                            onClick={() => handleVerDetalle(turno.id)}
                            title="Ver detalle del cierre"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn-accion btn-reimprimir"
                            onClick={() => handleReimprimir(turno.id)}
                            disabled={reimprimiendo === turno.id}
                            title="Reimprimir cierre"
                          >
                            {reimprimiendo === turno.id ? (
                              <span className="spinner-mini"></span>
                            ) : (
                              <FaPrint />
                            )}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginacion */}
        {totalPages > 1 && (
          <div className="modal-historial-paginacion">
            <button
              className="btn-pagina"
              onClick={() => buscarHistorial(page - 1)}
              disabled={page === 0}
            >
              <FaChevronLeft /> Anterior
            </button>
            <span className="pagina-info">
              Pagina {page + 1} de {totalPages} ({total} registros)
            </span>
            <button
              className="btn-pagina"
              onClick={() => buscarHistorial(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Siguiente <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Cierre */}
      <ModalDetalleCierre
        visible={modalDetalleVisible}
        onClose={handleCerrarDetalle}
        turnoId={turnoSeleccionado}
      />
    </div>
  );
};

export default ModalHistorialCaja;
