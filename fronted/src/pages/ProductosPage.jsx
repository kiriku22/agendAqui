import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  FaPlus,
  FaSearch,
  FaCog,
  FaBox,
  FaExclamationTriangle,
  FaFileExcel,
  FaUpload,
  FaHistory
} from 'react-icons/fa';
import CategoriasModal from '../components/inventario/CategoriasModal';
import ItemFormModal from '../components/inventario/ItemFormModal';
import AjustarStockModal from '../components/inventario/AjustarStockModal';
import IngresoMasivoModal from '../components/inventario/IngresoMasivoModal';
import HistorialStockModal from '../components/inventario/HistorialStockModal';
import { exportarInventarioAExcel } from '../utils/excelExport';
import './InventarioPage.css';
import { GET_ITEMS_INVENTARIO } from '../graphql/inventario';
import { GET_CATEGORIAS_INVENTARIO } from '../graphql/categorias';

const ProductosPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtroStock, setFiltroStock] = useState('todos'); // todos, stock_bajo, agotados
  const [mostrarCategoriasModal, setMostrarCategoriasModal] = useState(false);
  const [mostrarItemModal, setMostrarItemModal] = useState(false);
  const [mostrarStockModal, setMostrarStockModal] = useState(false);
  const [mostrarCargaMasivaModal, setMostrarCargaMasivaModal] = useState(false);
  const [mostrarHistorialModal, setMostrarHistorialModal] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // Queries - Solo productos
  const { data: dataItems, loading: loadingItems, refetch: refetchItems } = useQuery(GET_ITEMS_INVENTARIO, {
    variables: {
      tipo: 'producto',
      ...(categoriaFiltro && { categoria_id: categoriaFiltro }),
      activo: mostrarInactivos ? null : true,
      busqueda: busqueda || null
    },
    fetchPolicy: 'network-only'
  });

  const { data: dataCategorias } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { activa: true, tipo: 'producto' }
  });

  const items = dataItems?.itemsInventario || [];
  const categorias = dataCategorias?.categoriasInventario || [];

  // Filtrar por stock
  const itemsFiltrados = items.filter((item) => {
    if (filtroStock === 'stock_bajo') {
      return item.stock_actual > 0 && item.stock_actual <= item.stock_minimo;
    }
    if (filtroStock === 'agotados') {
      return item.stock_actual === 0;
    }
    return true;
  });

  const estadisticas = {
    total: items.length,
    stockBajo: items.filter((i) => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length,
    agotados: items.filter((i) => i.stock_actual === 0).length,
    valorTotal: items.reduce((sum, i) => sum + (i.stock_actual * i.precio_con_iva), 0)
  };

  const handleNuevoProducto = () => {
    setItemSeleccionado(null);
    setMostrarItemModal(true);
  };

  const handleEditarProducto = (item) => {
    setItemSeleccionado(item);
    setMostrarItemModal(true);
  };

  const handleAjustarStock = (item) => {
    setItemSeleccionado(item);
    setMostrarStockModal(true);
  };

  const handleVerHistorial = (item) => {
    setItemSeleccionado(item);
    setMostrarHistorialModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStockBadgeClass = (item) => {
    if (item.stock_actual === 0) return 'stock-badge stock-agotado';
    if (item.stock_actual <= item.stock_minimo) return 'stock-badge stock-bajo';
    return 'stock-badge stock-ok';
  };

  const getStockBadgeText = (item) => {
    if (item.stock_actual === 0) return 'Agotado';
    if (item.stock_actual <= item.stock_minimo) return 'Stock Bajo';
    return 'Disponible';
  };

  const handleExportarExcel = () => {
    try {
      const nombreArchivo = exportarInventarioAExcel(items, 'Inventario_Productos_Factufy');
      alert(`✅ Archivo exportado exitosamente: ${nombreArchivo}`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al exportar el archivo. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="inventario-page">
      {/* Header */}
      <div className="inventario-header">
        <div className="header-titulo">
          <FaBox className="header-icon" />
          <div>
            <h1>Productos en Inventario</h1>
            <p>Administra el stock de productos disponibles para venta</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setMostrarCategoriasModal(true)}>
            <FaCog /> Categorías
          </button>
          <button className="btn-primary" onClick={handleNuevoProducto}>
            <FaPlus /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="inventario-stats">
        <div className="stat-card" onClick={() => setFiltroStock('todos')}>
          <div className="stat-value">{estadisticas.total}</div>
          <div className="stat-label">Total Productos</div>
        </div>
        <div
          className={`stat-card ${filtroStock === 'stock_bajo' ? 'stat-active' : ''} ${estadisticas.stockBajo > 0 ? 'stat-warning' : ''}`}
          onClick={() => setFiltroStock('stock_bajo')}
        >
          <div className="stat-value">
            {estadisticas.stockBajo}
            {estadisticas.stockBajo > 0 && <FaExclamationTriangle className="warning-icon" />}
          </div>
          <div className="stat-label">Stock Bajo</div>
        </div>
        <div
          className={`stat-card ${filtroStock === 'agotados' ? 'stat-active' : ''} ${estadisticas.agotados > 0 ? 'stat-danger' : ''}`}
          onClick={() => setFiltroStock('agotados')}
        >
          <div className="stat-value">{estadisticas.agotados}</div>
          <div className="stat-label">Agotados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-small">{formatCurrency(estadisticas.valorTotal)}</div>
          <div className="stat-label">Valor Total</div>
        </div>
      </div>

      {/* Barra de herramientas avanzadas */}
      <div className="inventario-toolbar">
        <button className="btn-toolbar" onClick={() => setMostrarCargaMasivaModal(true)} title="Carga masiva desde Excel">
          <FaUpload /> Carga Masiva
        </button>
        <button
          className="btn-toolbar"
          onClick={() => {
            if (itemSeleccionado) {
              handleVerHistorial(itemSeleccionado);
            } else {
              alert('Por favor, selecciona un producto primero haciendo clic en el botón "Editar" o "Stock" del producto que deseas consultar');
            }
          }}
          title="Ver historial de movimientos"
        >
          <FaHistory /> Historial
        </button>
        <button className="btn-toolbar" onClick={handleExportarExcel} title="Exportar inventario a Excel">
          <FaFileExcel /> Exportar
        </button>
      </div>

      {/* Filtros */}
      <div className="inventario-filtros">
        <div className="filtro-busqueda">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o descripción..."
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

      {/* Tabla de Productos */}
      <div className="inventario-tabla-container">
        {loadingItems ? (
          <div className="loading-state">Cargando productos...</div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="empty-state">
            <FaBox />
            <p>No hay productos para mostrar</p>
            <button className="btn-primary" onClick={handleNuevoProducto}>
              <FaPlus /> Crear primer producto
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
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.map((item) => (
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
                    <div className="stock-info">
                      <span className="stock-cantidad">{item.stock_actual}</span>
                      <span className="stock-unidad">{item.unidad_medida}</span>
                    </div>
                  </td>
                  <td>
                    <span className="stock-minimo">{item.stock_minimo} {item.unidad_medida}</span>
                  </td>
                  <td>
                    <span className={getStockBadgeClass(item)}>
                      {item.stock_actual > 0 && item.stock_actual <= item.stock_minimo && (
                        <FaExclamationTriangle style={{ marginRight: '4px', fontSize: '0.875rem' }} />
                      )}
                      {getStockBadgeText(item)}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="btn-accion btn-editar"
                        onClick={() => handleEditarProducto(item)}
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        className="btn-accion btn-stock"
                        onClick={() => handleAjustarStock(item)}
                        title="Ajustar Stock"
                      >
                        Stock
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
          tipo="producto"
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
          tipoFijo="producto"
        />
      )}

      {mostrarStockModal && itemSeleccionado && (
        <AjustarStockModal
          isOpen={mostrarStockModal}
          onClose={() => {
            setMostrarStockModal(false);
            setItemSeleccionado(null);
            refetchItems();
          }}
          item={itemSeleccionado}
        />
      )}

      {mostrarCargaMasivaModal && (
        <IngresoMasivoModal
          isOpen={mostrarCargaMasivaModal}
          onClose={() => {
            setMostrarCargaMasivaModal(false);
            refetchItems();
          }}
          tipo="producto"
        />
      )}

      {mostrarHistorialModal && itemSeleccionado && (
        <HistorialStockModal
          onClose={() => {
            setMostrarHistorialModal(false);
            setItemSeleccionado(null);
          }}
          item={itemSeleccionado}
        />
      )}
    </div>
  );
};

export default ProductosPage;
