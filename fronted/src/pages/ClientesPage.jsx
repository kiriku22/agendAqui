import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CLIENTES, ELIMINAR_CLIENTE } from '../graphql/huespedes';
import Loading from '../components/shared/Loading';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import ClienteFormModal from '../components/clientes/ClienteFormModal';
import ClienteDetalleModal from '../components/clientes/ClienteDetalleModal';
import { User, Search, Phone, Mail, Plus, Edit, Trash2, Power, Eye } from 'lucide-react';
import './ClientesPage.css';

function ClientesPage() {
  // Estados para filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    tipo_documento: '',
    activo: true
  });

  const [appliedFilters, setAppliedFilters] = useState({
    busqueda: '',
    tipo_documento: '',
    activo: true
  });

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Query GraphQL para obtener clientes
  const { data, loading, error, refetch } = useQuery(GET_CLIENTES, {
    variables: {
      busqueda: appliedFilters.busqueda || undefined,
      activo: appliedFilters.activo
    },
    pollInterval: 30000,
    fetchPolicy: 'network-only'
  });

  // Mutation para eliminar cliente
  const [eliminarCliente] = useMutation(ELIMINAR_CLIENTE, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      alert(`Error al desactivar cliente: ${error.message}`);
    }
  });

  if (loading) return <Loading fullScreen />;
  if (error) return <div className="error-message">Error al cargar clientes: {error.message}</div>;

  const clientes = data?.clientes || [];

  // Filtrar clientes localmente por tipo de documento
  const clientesFiltrados = clientes.filter(cliente => {
    if (!appliedFilters.tipo_documento) return true;
    return cliente.tipo_documento === appliedFilters.tipo_documento;
  });

  // Manejadores
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      busqueda: '',
      tipo_documento: '',
      activo: true
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleNuevoCliente = () => {
    setClienteSeleccionado(null);
    setModoEdicion(false);
    setShowModal(true);
  };

  const handleEditarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setModoEdicion(true);
    setShowModal(true);
  };

  const handleVerDetalles = (cliente) => {
    setClienteSeleccionado(cliente);
    setShowDetalleModal(true);
  };

  const handleToggleActivo = async (cliente) => {
    if (cliente.activo) {
      // Desactivar
      const confirmar = window.confirm(
        `¿Está seguro de desactivar el cliente ${cliente.nombre} ${cliente.apellido || ''}?`
      );
      if (confirmar) {
        try {
          await eliminarCliente({
            variables: { id: parseInt(cliente.id) }
          });
        } catch (error) {
          console.error('Error al desactivar cliente:', error);
        }
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setClienteSeleccionado(null);
    setModoEdicion(false);
    refetch();
  };

  const getTipoDocumentoBadgeVariant = (tipo) => {
    const variants = {
      'CC': 'info',
      'CE': 'warning',
      'PA': 'success',
      'NIT': 'secondary',
      'TI': 'default',
      'RC': 'default',
      'Otro': 'default'
    };
    return variants[tipo] || 'default';
  };

  const formatNombreCompleto = (cliente) => {
    if (cliente.tipo_documento === 'NIT') {
      return cliente.nombre;
    }
    return `${cliente.nombre} ${cliente.apellido || ''}`.trim();
  };

  return (
    <div className="ClientesPage">
      {/* Header */}
      <div className="ClientesPage__header">
        <div className="ClientesPage__header-title">
          <User size={32} />
          <div>
            <h1>Gestión de Clientes</h1>
            <p>Registro maestro de clientes del hotel</p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={handleNuevoCliente}
        >
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="ClientesPage__filters">
        <div className="ClientesPage__filters-row">
          <div className="filter-group">
            <label htmlFor="busqueda">
              <Search size={16} />
              Buscar
            </label>
            <input
              type="text"
              id="busqueda"
              name="busqueda"
              placeholder="Nombre, apellido o documento..."
              value={filters.busqueda}
              onChange={handleFilterChange}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="tipo_documento">Tipo Documento</label>
            <select
              id="tipo_documento"
              name="tipo_documento"
              value={filters.tipo_documento}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="PA">Pasaporte</option>
              <option value="NIT">NIT</option>
              <option value="TI">Tarjeta de Identidad</option>
              <option value="RC">Registro Civil</option>
            </select>
          </div>

          <div className="filter-group filter-group--checkbox">
            <label htmlFor="activo">
              <input
                type="checkbox"
                id="activo"
                name="activo"
                checked={filters.activo}
                onChange={handleFilterChange}
              />
              Solo activos
            </label>
          </div>

          <div className="filter-actions">
            <Button variant="secondary" size="sm" onClick={handleApplyFilters}>
              Aplicar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="ClientesPage__results">
        <div className="ClientesPage__results-header">
          <p>
            Mostrando {clientesFiltrados.length} de {clientes.length} clientes
          </p>
        </div>

        {/* Tabla de clientes */}
        <div className="ClientesPage__table-container">
          <table className="ClientesPage__table">
            <thead>
              <tr>
                <th>Nombre Completo</th>
                <th>Tipo Doc.</th>
                <th>Documento</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="ClientesPage__table-empty">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className={!cliente.activo ? 'ClientesPage__table-row--inactive' : ''}>
                    <td className="ClientesPage__table-cell--nombre">
                      <User size={16} />
                      {formatNombreCompleto(cliente)}
                    </td>
                    <td>
                      <Badge variant={getTipoDocumentoBadgeVariant(cliente.tipo_documento)}>
                        {cliente.tipo_documento}
                      </Badge>
                    </td>
                    <td>{cliente.numero_documento || 'N/A'}</td>
                    <td>
                      {cliente.email ? (
                        <span className="ClientesPage__table-cell--email">
                          <Mail size={14} />
                          {cliente.email}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      {cliente.telefono ? (
                        <span className="ClientesPage__table-cell--phone">
                          <Phone size={14} />
                          {cliente.telefono}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>{cliente.ciudad || 'N/A'}</td>
                    <td>
                      <Badge variant={cliente.activo ? 'success' : 'danger'}>
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="ClientesPage__table-actions">
                      <button
                        className="action-btn action-btn--info"
                        onClick={() => handleVerDetalles(cliente)}
                        title="Ver Detalles"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => handleEditarCliente(cliente)}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      {cliente.activo && (
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleToggleActivo(cliente)}
                          title="Desactivar"
                        >
                          <Power size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <ClienteFormModal
          visible={showModal}
          onClose={handleModalClose}
          cliente={clienteSeleccionado}
          modoEdicion={modoEdicion}
        />
      )}

      {/* Modal de detalles */}
      {showDetalleModal && clienteSeleccionado && (
        <ClienteDetalleModal
          cliente={clienteSeleccionado}
          onClose={() => setShowDetalleModal(false)}
        />
      )}
    </div>
  );
}

export default ClientesPage;
