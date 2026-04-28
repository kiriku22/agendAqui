import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  FaPlus,
  FaSearch,
  FaCog,
  FaConciergeBell
} from 'react-icons/fa';
import CategoriasModal from '../components/inventario/CategoriasModal';
import ItemFormModal from '../components/inventario/ItemFormModal';
import './InventarioPage.css';
import { GET_ITEMS_INVENTARIO } from '../graphql/inventario';
import { GET_CATEGORIAS_INVENTARIO } from '../graphql/categorias';

const ServiciosPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [mostrarCategoriasModal, setMostrarCategoriasModal] = useState(false);
  const [mostrarItemModal, setMostrarItemModal] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // Queries - Solo servicios
  const { data: dataItems, loading: loadingItems, refetch: refetchItems } = useQuery(GET_ITEMS_INVENTARIO, {
    variables: {
      tipo: 'servicio',
      categoria_id: categoriaFiltro,
      activo: mostrarInactivos ? null : true,
      busqueda: busqueda || null
    },
    fetchPolicy: 'network-only'
  });

  const { data: dataCategorias } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { activa: true, tipo: 'servicio' }
  });

  const items = dataItems?.itemsInventario || [];
  const categorias = dataCategorias?.categoriasInventario || [];

  const handleNuevoServicio = () => {
    setItemSeleccionado(null);
    setMostrarItemModal(true);
  };

  const handleEditarServicio = (item) => {
    setItemSeleccionado(item);
    setMostrarItemModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="inventario-page">
      {/* Header */}
      <div className="inventario-header">
        <div className="header-titulo">
          <FaConciergeBell className="header-icon" />
          <div>
            <h1>Servicios del Hotel</h1>
            <p>Administra todos los servicios disponibles para los huéspedes</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setMostrarCategoriasModal(true)}>
            <FaCog /> Categorías
          </button>
          <button className="btn-primary" onClick={handleNuevoServicio}>
            <FaPlus /> Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="inventario-stats">
        <div className="stat-card">
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Total Servicios</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{items.filter((i) => i.activo).length}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{categorias.length}</div>
          <div className="stat-label">Categorías</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {formatCurrency(items.reduce((sum, i) => sum + (i.precio_con_iva || 0), 0) / items.length || 0)}
          </div>
          <div className="stat-label">Precio Promedio</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="inventario-filtros">
        <div className="filtro-busqueda">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar servicios por nombre, código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          className="filtro-select"
          value={categoriaFiltro || ''}
          onChange={(e) => setCategoriaFiltro(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>

        <label className="filtro-checkbox">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Tabla de Servicios */}
      <div className="inventario-tabla-container">
        {loadingItems ? (
          <div className="loading-state">Cargando servicios...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <FaConciergeBell />
            <p>No hay servicios para mostrar</p>
            <button className="btn-primary" onClick={handleNuevoServicio}>
              <FaPlus /> Crear primer servicio
            </button>
          </div>
        ) : (
          <table className="inventario-tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio Base</th>
                <th>IVA</th>
                <th>Precio Final</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={!item.activo ? 'row-inactiva' : ''}>
                  <td>
                    <span className="codigo">{item.codigo || 'N/A'}</span>
                  </td>
                  <td>
                    <div className="item-nombre">
                      <strong>{item.nombre}</strong>
                      {item.descripcion && <small>{item.descripcion}</small>}
                    </div>
                  </td>
                  <td>
                    {item.categoria && (
                      <span
                        className="categoria-badge"
                        style={{ backgroundColor: item.categoria.color || '#1e40af' }}
                      >
                        {item.categoria.nombre}
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(item.precio_base)}</td>
                  <td>{item.iva_porcentaje}%</td>
                  <td>
                    <strong>{formatCurrency(item.precio_con_iva)}</strong>
                  </td>
                  <td>
                    {item.duracion_minutos ? `${item.duracion_minutos} min` : '—'}
                  </td>
                  <td>
                    <span className={`stock-badge ${item.activo ? 'stock-ok' : 'stock-agotado'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="btn-accion btn-editar"
                        onClick={() => handleEditarServicio(item)}
                        title="Editar"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      {mostrarCategoriasModal && (
        <CategoriasModal
          isOpen={mostrarCategoriasModal}
          onClose={() => {
            setMostrarCategoriasModal(false);
            refetchItems();
          }}
          tipoFiltro="servicio"
        />
      )}

      {mostrarItemModal && (
        <ItemFormModal
          isOpen={mostrarItemModal}
          onClose={() => {
            setMostrarItemModal(false);
            setItemSeleccionado(null);
            refetchItems();
          }}
          item={itemSeleccionado}
          tipoFijo="servicio"
        />
      )}
    </div>
  );
};

export default ServiciosPage;
