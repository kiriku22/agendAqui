import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HUESPEDES } from '../graphql/huespedes';
import Loading from '../components/shared/Loading';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import HuespedModal from '../components/huespedes/HuespedModal';
import HuespedDetalleModal from '../components/huespedes/HuespedDetalleModal';
import { User, Search, Globe, Phone, Mail, Plus, Eye, Edit } from 'lucide-react';
import './Huespedes.css';

function Huespedes() {
  // Estados para filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    nacionalidad: '',
    tipo_documento: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({
    busqueda: '',
    nacionalidad: '',
    tipo_documento: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [huespedSeleccionado, setHuespedSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Query GraphQL para obtener huéspedes
  const { data, loading, error, refetch } = useQuery(GET_HUESPEDES, {
    pollInterval: 30000,
    fetchPolicy: 'network-only'
  });

  if (loading) return <Loading fullScreen />;
  if (error) return <div className="error-message">Error al cargar huéspedes: {error.message}</div>;

  const huespedes = data?.huespedes || [];

  // Filtrar huéspedes según los filtros aplicados
  const huespedesFiltrados = huespedes.filter(huesped => {
    if (!appliedFilters.busqueda && !appliedFilters.nacionalidad && !appliedFilters.tipo_documento && !appliedFilters.fechaDesde && !appliedFilters.fechaHasta) {
      return true;
    }

    // Búsqueda por texto (nombre, documento, teléfono, email)
    if (appliedFilters.busqueda) {
      const busqueda = appliedFilters.busqueda.toLowerCase();
      const matchBusqueda =
        huesped.nombre_completo?.toLowerCase().includes(busqueda) ||
        huesped.numero_documento?.toLowerCase().includes(busqueda) ||
        huesped.telefono?.toLowerCase().includes(busqueda) ||
        huesped.email?.toLowerCase().includes(busqueda);

      if (!matchBusqueda) return false;
    }

    // Filtro por nacionalidad
    if (appliedFilters.nacionalidad && huesped.nacionalidad !== appliedFilters.nacionalidad) {
      return false;
    }

    // Filtro por tipo de documento
    if (appliedFilters.tipo_documento && huesped.tipo_documento !== appliedFilters.tipo_documento) {
      return false;
    }

    // Filtro por rango de fechas
    if (appliedFilters.fechaDesde || appliedFilters.fechaHasta) {
      const fechaCreacion = new Date(huesped.created_at);

      if (appliedFilters.fechaDesde && fechaCreacion < new Date(appliedFilters.fechaDesde)) {
        return false;
      }

      if (appliedFilters.fechaHasta && fechaCreacion > new Date(appliedFilters.fechaHasta)) {
        return false;
      }
    }

    return true;
  });

  // Manejadores
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters({
      busqueda: '',
      nacionalidad: '',
      tipo_documento: '',
      fechaDesde: '',
      fechaHasta: ''
    });
    setAppliedFilters({
      busqueda: '',
      nacionalidad: '',
      tipo_documento: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  const handleNuevoHuesped = () => {
    setHuespedSeleccionado(null);
    setModoEdicion(false);
    setShowModal(true);
  };

  const handleVerDetalles = (huesped) => {
    setHuespedSeleccionado(huesped);
    setShowDetalleModal(true);
  };

  const handleEditarHuesped = (huesped) => {
    setHuespedSeleccionado(huesped);
    setModoEdicion(true);
    setShowModal(true);
  };

  const getTipoDocumentoBadgeVariant = (tipo) => {
    const variants = {
      'CC': 'info',
      'CE': 'warning',
      'Pasaporte': 'success',
      'TI': 'secondary',
      'NIT': 'default',
      'Otro': 'default'
    };
    return variants[tipo] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="huespedes-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Huéspedes</h1>
          <p className="page-subtitle">Gestiona los registros de huéspedes del hotel</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={handleNuevoHuesped}
        >
          Nuevo Huésped
        </Button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="input-group">
          <label htmlFor="busqueda" className="input-label">
            <Search size={16} /> Búsqueda
          </label>
          <input
            type="text"
            id="busqueda"
            name="busqueda"
            value={filters.busqueda}
            onChange={handleFilterChange}
            placeholder="Nombre, documento, teléfono o email..."
            className="search-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="tipo_documento" className="input-label">Tipo Documento</label>
          <select
            id="tipo_documento"
            name="tipo_documento"
            value={filters.tipo_documento}
            onChange={handleFilterChange}
            className="select-input"
          >
            <option value="">Todos</option>
            <option value="CC">Cédula (CC)</option>
            <option value="CE">Cédula Extranjería (CE)</option>
            <option value="Pasaporte">Pasaporte</option>
            <option value="TI">Tarjeta Identidad (TI)</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="nacionalidad" className="input-label">Nacionalidad</label>
          <input
            type="text"
            id="nacionalidad"
            name="nacionalidad"
            value={filters.nacionalidad}
            onChange={handleFilterChange}
            placeholder="Ej: Colombiana"
            className="text-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="fechaDesde" className="input-label">Desde</label>
          <input
            type="date"
            id="fechaDesde"
            name="fechaDesde"
            value={filters.fechaDesde}
            onChange={handleFilterChange}
            className="date-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="fechaHasta" className="input-label">Hasta</label>
          <input
            type="date"
            id="fechaHasta"
            name="fechaHasta"
            value={filters.fechaHasta}
            onChange={handleFilterChange}
            className="date-input"
          />
        </div>

        <div className="filter-actions">
          <Button variant="primary" onClick={handleApplyFilters}>
            Buscar
          </Button>
          <Button variant="secondary" onClick={handleClearFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="huespedes-stats">
        <span className="stats-text">
          Mostrando {huespedesFiltrados.length} de {huespedes.length} huéspedes
        </span>
      </div>

      {/* Grid de Tarjetas o Estado Vacío */}
      {huespedesFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <User size={64} />
          </div>
          <h3>No se encontraron huéspedes</h3>
          <p>
            {huespedes.length === 0
              ? 'Comienza registrando tu primer huésped.'
              : 'Intenta ajustar los filtros para ver más resultados.'}
          </p>
          {huespedes.length === 0 && (
            <Button variant="primary" onClick={handleNuevoHuesped}>
              Registrar Primer Huésped
            </Button>
          )}
        </div>
      ) : (
        <div className="huespedes-grid">
          {huespedesFiltrados.map((huesped) => (
            <div key={huesped.id} className="huesped-card">
              {/* Card Header */}
              <div className="huesped-header">
                <div>
                  <h3 className="huesped-nombre">{huesped.nombre_completo || 'Sin nombre'}</h3>
                  <p className="huesped-documento">
                    <Badge variant={getTipoDocumentoBadgeVariant(huesped.tipo_documento)}>
                      {huesped.tipo_documento}
                    </Badge>
                    <span className="documento-numero">{huesped.numero_documento}</span>
                  </p>
                </div>
              </div>

              {/* Card Info */}
              <div className="huesped-info">
                <div className="info-item">
                  <Globe size={14} />
                  <span>{huesped.nacionalidad || 'N/A'}</span>
                </div>
                {huesped.telefono && (
                  <div className="info-item">
                    <Phone size={14} />
                    <span>{huesped.telefono}</span>
                  </div>
                )}
                {huesped.email && (
                  <div className="info-item">
                    <Mail size={14} />
                    <span className="info-email">{huesped.email}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Registrado:</span>
                  <span>{formatDate(huesped.created_at)}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="huesped-actions">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Eye size={16} />}
                  onClick={() => handleVerDetalles(huesped)}
                >
                  Ver Detalles
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Edit size={16} />}
                  onClick={() => handleEditarHuesped(huesped)}
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      <HuespedModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setHuespedSeleccionado(null);
          setModoEdicion(false);
        }}
        huesped={huespedSeleccionado}
        modoEdicion={modoEdicion}
        onSuccess={() => {
          refetch();
        }}
      />

      <HuespedDetalleModal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setHuespedSeleccionado(null);
        }}
        huesped={huespedSeleccionado}
        onEdit={handleEditarHuesped}
      />
    </div>
  );
}

export default Huespedes;
