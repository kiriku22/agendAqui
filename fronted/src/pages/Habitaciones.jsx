import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus } from 'lucide-react';
import { GET_HABITACIONES, REGISTRAR_LIMPIEZA } from '../graphql/habitaciones';
import Loading from '../components/shared/Loading';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Select from '../components/shared/Select';
import ConfirmModal from '../components/shared/ConfirmModal';
import SuccessModal from '../components/shared/SuccessModal';
import HabitacionModal from '../components/habitaciones/HabitacionModal';
import HabitacionDetalleModal from '../components/habitaciones/HabitacionDetalleModal';
import './Habitaciones.css';

function Habitaciones() {
  const [filters, setFilters] = useState({
    estado: '',
    piso: '',
    tipo: ''
  });

  // Estados para modales
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showConfirmLimpieza, setShowConfirmLimpieza] = useState(false);
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data, loading, error, refetch } = useQuery(GET_HABITACIONES, {
    pollInterval: 10000 // Actualizar cada 10 segundos
  });

  const [registrarLimpieza, { loading: registrandoLimpieza }] = useMutation(REGISTRAR_LIMPIEZA, {
    refetchQueries: [{ query: GET_HABITACIONES }],
    onCompleted: () => {
      setShowConfirmLimpieza(false);
      setHabitacionSeleccionada(null);
    },
    onError: (error) => {
      console.error('Error al registrar limpieza:', error);
      setErrorModal({ isOpen: true, message: `Error al registrar limpieza: ${error.message}` });
    }
  });

  if (loading) return <Loading fullScreen />;
  if (error) return <div className="error-message">Error al cargar habitaciones: {error.message}</div>;

  const habitaciones = data?.habitaciones || [];

  // Filtrar habitaciones
  const habitacionesFiltradas = habitaciones.filter(hab => {
    if (filters.estado && hab.estado !== filters.estado) return false;
    if (filters.piso && hab.piso !== parseInt(filters.piso)) return false;
    if (filters.tipo && hab.tipo !== filters.tipo) return false;
    return true;
  });

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Handlers para modales
  const handleCrearHabitacion = () => {
    setHabitacionSeleccionada(null);
    setShowCrearModal(true);
  };

  const handleVerDetalle = (habitacion) => {
    setHabitacionSeleccionada(habitacion);
    setShowDetalleModal(true);
  };

  const handleEditarHabitacion = (habitacion) => {
    setHabitacionSeleccionada(habitacion);
    setShowEditModal(true);
  };

  const handleMarcarLimpia = (habitacion) => {
    setHabitacionSeleccionada(habitacion);
    setShowConfirmLimpieza(true);
  };

  const confirmarLimpieza = async () => {
    if (!habitacionSeleccionada) return;
    await registrarLimpieza({
      variables: {
        habitacionId: parseInt(habitacionSeleccionada.id)
      }
    });
  };

  return (
    <div className="habitaciones-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Gestión de Habitaciones</h1>
            <p className="page-subtitle">Administra el inventario de habitaciones del hotel</p>
          </div>
          <button className="btn-nueva-habitacion" onClick={handleCrearHabitacion}>
            <Plus size={18} />
            Nueva Habitación
          </button>
        </div>

        <div className="filters-section">
          <Select
            label="Estado"
            name="estado"
            value={filters.estado}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'disponible', label: 'Disponible' },
              { value: 'ocupada', label: 'Ocupada' },
              { value: 'limpieza', label: 'En Limpieza' },
              { value: 'mantenimiento', label: 'Mantenimiento' },
              { value: 'reservada', label: 'Reservada' }
            ]}
          />

          <Select
            label="Piso"
            name="piso"
            value={filters.piso}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Todos los pisos' },
              { value: '1', label: 'Piso 1' },
              { value: '2', label: 'Piso 2' },
              { value: '3', label: 'Piso 3' },
              { value: '4', label: 'Piso 4' }
            ]}
          />

          <Select
            label="Tipo"
            name="tipo"
            value={filters.tipo}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'simple', label: 'Simple' },
              { value: 'doble', label: 'Doble' },
              { value: 'suite', label: 'Suite' },
              { value: 'familiar', label: 'Familiar' },
              { value: 'presidencial', label: 'Presidencial' }
            ]}
          />

          <div className="filter-actions">
            <Button
              variant="secondary"
              onClick={() => setFilters({ estado: '', piso: '', tipo: '' })}
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>

        <div className="habitaciones-stats">
          <span className="stats-text">
            Mostrando {habitacionesFiltradas.length} de {habitaciones.length} habitaciones
          </span>
        </div>

        {habitacionesFiltradas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛏️</div>
            <h3>No se encontraron habitaciones</h3>
            <p>
              {habitaciones.length === 0
                ? 'Comienza agregando habitaciones a tu inventario hotelero.'
                : 'Intenta ajustar los filtros para ver más resultados.'}
            </p>
            {habitaciones.length === 0 && (
              <Button variant="primary" onClick={handleCrearHabitacion}>
                ➕ Crear Primera Habitación
              </Button>
            )}
          </div>
        ) : (
          <div className="habitaciones-grid">
            {habitacionesFiltradas.map((habitacion) => (
              <div key={habitacion.id} className="habitacion-card">
                <div className="habitacion-header">
                  <div>
                    <h3 className="habitacion-numero">Habitación {habitacion.numero}</h3>
                    <p className="habitacion-tipo">{habitacion.tipo.charAt(0).toUpperCase() + habitacion.tipo.slice(1)}</p>
                  </div>
                  <Badge variant={habitacion.estado}>
                    {habitacion.estado}
                  </Badge>
                </div>

                <div className="habitacion-info">
                  <div className="info-item">
                    <span className="info-label">Piso:</span>
                    <span className="info-value">{habitacion.piso}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Capacidad:</span>
                    <span className="info-value">{habitacion.capacidad} {habitacion.capacidad === 1 ? 'persona' : 'personas'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Precio por noche:</span>
                    <span className="info-value info-value--price">{formatPrice(habitacion.precio_noche)}</span>
                  </div>
                </div>

                <p className="habitacion-descripcion">
                  {habitacion.descripcion || `Habitación ${habitacion.tipo} en ${habitacion.piso === 1 ? 'primer' : habitacion.piso === 2 ? 'segundo' : habitacion.piso === 3 ? 'tercer' : habitacion.piso === 4 ? 'cuarto' : `piso ${habitacion.piso}`} piso`}
                </p>

                <div className="habitacion-actions">
                  <Button variant="outline" size="sm" fullWidth onClick={() => handleVerDetalle(habitacion)}>
                    Ver Detalles
                  </Button>
                  {habitacion.estado === 'limpieza' && (
                    <Button variant="secondary" size="sm" fullWidth onClick={() => handleMarcarLimpia(habitacion)}>
                      Marcar Limpia
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modales */}
        <HabitacionModal
          isOpen={showCrearModal}
          onClose={() => setShowCrearModal(false)}
          onSuccess={refetch}
        />

        <HabitacionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setHabitacionSeleccionada(null);
          }}
          habitacion={habitacionSeleccionada}
          onSuccess={refetch}
        />

        <HabitacionDetalleModal
          isOpen={showDetalleModal}
          onClose={() => {
            setShowDetalleModal(false);
            setHabitacionSeleccionada(null);
          }}
          habitacion={habitacionSeleccionada}
          onEdit={(hab) => {
            setShowDetalleModal(false);
            // Usar setTimeout para asegurar que el estado se actualiza después de cerrar el modal
            setTimeout(() => {
              setHabitacionSeleccionada(hab);
              setShowEditModal(true);
            }, 0);
          }}
          onSuccess={refetch}
        />

        <ConfirmModal
          isOpen={showConfirmLimpieza}
          onClose={() => {
            setShowConfirmLimpieza(false);
            setHabitacionSeleccionada(null);
          }}
          onConfirm={confirmarLimpieza}
          title="Marcar habitación como limpia"
          message={`¿Confirma que la limpieza de la habitación ${habitacionSeleccionada?.numero} ha sido completada?`}
          confirmText="Sí, marcar limpia"
          cancelText="Cancelar"
          variant="success"
          loading={registrandoLimpieza}
        />

        {/* Modal de error */}
        <SuccessModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ isOpen: false, message: '' })}
          type="error"
          message={errorModal.message}
        />
      </div>
  );
}

export default Habitaciones;
