import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  CAMBIAR_ESTADO_HABITACION,
  REGISTRAR_LIMPIEZA,
  REGISTRAR_MANTENIMIENTO
} from '../../graphql/habitaciones';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import ConfirmModal from '../shared/ConfirmModal';
import SuccessModal from '../shared/SuccessModal';
import {
  Home, Users, DollarSign, Tag, Image, Calendar, Wrench, CheckCircle, Edit
} from 'lucide-react';
import './HabitacionDetalleModal.css';

const ESTADO_CONFIG = {
  disponible: { color: 'success', label: 'Disponible' },
  ocupada: { color: 'danger', label: 'Ocupada' },
  limpieza: { color: 'warning', label: 'En Limpieza' },
  mantenimiento: { color: 'secondary', label: 'Mantenimiento' },
  reservada: { color: 'info', label: 'Reservada' }
};

const TIPO_LABELS = {
  simple: 'Simple',
  doble: 'Doble',
  suite: 'Suite',
  familiar: 'Familiar',
  presidencial: 'Presidencial'
};

function HabitacionDetalleModal({ isOpen, onClose, habitacion, onEdit, onSuccess }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [notasMantenimiento, setNotasMantenimiento] = useState('');
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const [cambiarEstado, { loading: cambiandoEstado }] = useMutation(CAMBIAR_ESTADO_HABITACION, {
    onCompleted: () => {
      onSuccess?.();
      setShowConfirm(false);
      setConfirmAction(null);
    },
    onError: (error) => {
      console.error('Error al cambiar estado:', error);
      setErrorModal({ isOpen: true, message: `Error: ${error.message}` });
    }
  });

  const [registrarLimpieza, { loading: registrandoLimpieza }] = useMutation(REGISTRAR_LIMPIEZA, {
    onCompleted: () => {
      onSuccess?.();
      setShowConfirm(false);
      setConfirmAction(null);
    },
    onError: (error) => {
      console.error('Error al registrar limpieza:', error);
      setErrorModal({ isOpen: true, message: `Error: ${error.message}` });
    }
  });

  const [registrarMantenimiento, { loading: registrandoMantenimiento }] = useMutation(REGISTRAR_MANTENIMIENTO, {
    onCompleted: () => {
      onSuccess?.();
      setShowConfirm(false);
      setConfirmAction(null);
      setNotasMantenimiento('');
    },
    onError: (error) => {
      console.error('Error al registrar mantenimiento:', error);
      setErrorModal({ isOpen: true, message: `Error: ${error.message}` });
    }
  });

  if (!habitacion) return null;

  const loading = cambiandoEstado || registrandoLimpieza || registrandoMantenimiento;

  const handleCambiarEstado = (nuevoEstado) => {
    setConfirmAction({
      type: 'cambiarEstado',
      estado: nuevoEstado,
      title: `Cambiar estado a ${ESTADO_CONFIG[nuevoEstado].label}`,
      message: `¿Está seguro de cambiar el estado de la habitación ${habitacion.numero} a ${ESTADO_CONFIG[nuevoEstado].label}?`,
      onConfirm: async () => {
        await cambiarEstado({
          variables: {
            id: parseInt(habitacion.id),
            estado: nuevoEstado
          }
        });
      }
    });
    setShowConfirm(true);
  };

  const handleMarcarLimpia = () => {
    setConfirmAction({
      type: 'marcarLimpia',
      title: 'Marcar habitación como limpia',
      message: `¿Confirma que la limpieza de la habitación ${habitacion.numero} ha sido completada?`,
      onConfirm: async () => {
        await registrarLimpieza({
          variables: {
            habitacionId: parseInt(habitacion.id)
          }
        });
      }
    });
    setShowConfirm(true);
  };

  const handleIniciarMantenimiento = () => {
    setConfirmAction({
      type: 'iniciarMantenimiento',
      title: 'Registrar Mantenimiento',
      message: `Ingrese las notas sobre el mantenimiento de la habitación ${habitacion.numero}:`,
      requiresInput: true,
      onConfirm: async () => {
        await registrarMantenimiento({
          variables: {
            habitacionId: parseInt(habitacion.id),
            notas: notasMantenimiento || null
          }
        });
      }
    });
    setShowConfirm(true);
  };

  const handleFinalizarMantenimiento = () => {
    handleCambiarEstado('disponible');
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const estadoActual = habitacion.estado;

  // Determinar acciones disponibles según el estado
  const puedeEditar = true;
  const puedeMarcarLimpia = estadoActual === 'limpieza';
  const puedeIniciarMantenimiento = ['disponible', 'limpieza', 'reservada'].includes(estadoActual);
  const puedeFinalizarMantenimiento = estadoActual === 'mantenimiento';
  const puedeCambiarALimpieza = ['disponible', 'ocupada', 'reservada'].includes(estadoActual);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Habitación ${habitacion.numero}`}
        size="large"
      >
        <div className="habitacion-detalle">
          {/* Header con estado */}
          <div className="habitacion-detalle__header">
            <div className="habitacion-detalle__numero">
              <Home size={24} />
              <span>{habitacion.numero}</span>
            </div>
            <Badge variant={ESTADO_CONFIG[estadoActual].color}>
              {ESTADO_CONFIG[estadoActual].label}
            </Badge>
          </div>

          {/* Información General */}
          <div className="habitacion-detalle__section">
            <h3 className="section-title">Información General</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">
                  <Tag size={16} />
                  Tipo
                </div>
                <div className="info-item__value">{TIPO_LABELS[habitacion.tipo]}</div>
              </div>

              <div className="info-item">
                <div className="info-item__label">
                  <Home size={16} />
                  Piso
                </div>
                <div className="info-item__value">{habitacion.piso}</div>
              </div>

              <div className="info-item">
                <div className="info-item__label">
                  <Users size={16} />
                  Capacidad
                </div>
                <div className="info-item__value">{habitacion.capacidad} persona{habitacion.capacidad !== 1 ? 's' : ''}</div>
              </div>

              <div className="info-item">
                <div className="info-item__label">
                  <DollarSign size={16} />
                  Precio por Noche
                </div>
                <div className="info-item__value info-item__value--price">
                  {formatCurrency(habitacion.precio_noche)}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          {habitacion.descripcion && (
            <div className="habitacion-detalle__section">
              <h3 className="section-title">Descripción</h3>
              <p className="descripcion-text">{habitacion.descripcion}</p>
            </div>
          )}

          {/* Comodidades */}
          {habitacion.comodidades && habitacion.comodidades.length > 0 && (
            <div className="habitacion-detalle__section">
              <h3 className="section-title">Comodidades</h3>
              <div className="comodidades-list">
                {habitacion.comodidades.map((comodidad, index) => (
                  <div key={index} className="comodidad-tag">
                    <CheckCircle size={14} />
                    {comodidad}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="habitacion-detalle__section">
            <h3 className="section-title">Historial</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">
                  <Calendar size={16} />
                  Última Limpieza
                </div>
                <div className="info-item__value info-item__value--small">
                  {formatFecha(habitacion.ultima_limpieza)}
                </div>
              </div>

              <div className="info-item">
                <div className="info-item__label">
                  <Wrench size={16} />
                  Último Mantenimiento
                </div>
                <div className="info-item__value info-item__value--small">
                  {formatFecha(habitacion.ultima_mantenimiento)}
                </div>
              </div>
            </div>

            {habitacion.notas_mantenimiento && (
              <div className="notas-mantenimiento">
                <strong>Notas de Mantenimiento:</strong>
                <p>{habitacion.notas_mantenimiento}</p>
              </div>
            )}
          </div>

          {/* Imagen */}
          {habitacion.imagen_url && (
            <div className="habitacion-detalle__section">
              <h3 className="section-title">
                <Image size={18} />
                Imagen
              </h3>
              <div className="habitacion-imagen">
                <img src={habitacion.imagen_url} alt={`Habitación ${habitacion.numero}`} />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="habitacion-detalle__actions">
            <div className="actions-row">
              {/* Siempre mostrar botón Editar */}
              <Button
                variant="outline"
                icon={<Edit size={16} />}
                onClick={() => {
                  onEdit?.(habitacion);
                  onClose();
                }}
                disabled={loading}
              >
                Editar
              </Button>

              {/* Botón Marcar Limpia */}
              {puedeMarcarLimpia && (
                <Button
                  variant="success"
                  icon={<CheckCircle size={16} />}
                  onClick={handleMarcarLimpia}
                  disabled={loading}
                >
                  Marcar Limpia
                </Button>
              )}

              {/* Botón Cambiar a Limpieza */}
              {puedeCambiarALimpieza && (
                <Button
                  variant="warning"
                  onClick={() => handleCambiarEstado('limpieza')}
                  disabled={loading}
                >
                  Cambiar a Limpieza
                </Button>
              )}

              {/* Botón Iniciar Mantenimiento */}
              {puedeIniciarMantenimiento && (
                <Button
                  variant="secondary"
                  icon={<Wrench size={16} />}
                  onClick={handleIniciarMantenimiento}
                  disabled={loading}
                >
                  Iniciar Mantenimiento
                </Button>
              )}

              {/* Botón Finalizar Mantenimiento */}
              {puedeFinalizarMantenimiento && (
                <Button
                  variant="primary"
                  onClick={handleFinalizarMantenimiento}
                  disabled={loading}
                >
                  Finalizar Mantenimiento
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación */}
      {confirmAction && (
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => {
            setShowConfirm(false);
            setConfirmAction(null);
            setNotasMantenimiento('');
          }}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText="Confirmar"
          cancelText="Cancelar"
          variant={confirmAction.type === 'marcarLimpia' ? 'success' : 'primary'}
          loading={loading}
        >
          {confirmAction.requiresInput && (
            <div style={{ marginTop: '1rem' }}>
              <textarea
                value={notasMantenimiento}
                onChange={(e) => setNotasMantenimiento(e.target.value)}
                placeholder="Ingrese las notas del mantenimiento (opcional)"
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontFamily: 'inherit',
                  fontSize: '0.9375rem',
                  resize: 'vertical'
                }}
                disabled={loading}
              />
            </div>
          )}
        </ConfirmModal>
      )}

      {/* Modal de error */}
      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </>
  );
}

export default HabitacionDetalleModal;
