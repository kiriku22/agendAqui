import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  FaPlus,
  FaSearch,
  FaCog,
  FaFileExport,
  FaFileImport,
  FaBox,
  FaExclamationTriangle,
  FaFilter
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import CategoriasModal from '../components/inventario/CategoriasModal';
import ItemFormModal from '../components/inventario/ItemFormModal';
import AjustarStockModal from '../components/inventario/AjustarStockModal';
import IngresoMasivoModal from '../components/inventario/IngresoMasivoModal';
import HistorialStockModal from '../components/inventario/HistorialStockModal';
import './InventarioPage.css';
import { GET_ITEMS_INVENTARIO } from '../graphql/inventario';
import { GET_CATEGORIAS_INVENTARIO } from '../graphql/categorias';

const InventarioPage = () => {
  const [tabActual, setTabActual] = useState('todos'); // todos, productos, servicios, stock_bajo
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [mostrarCategoriasModal, setMostrarCategoriasModal] = useState(false);
  const [mostrarItemModal, setMostrarItemModal] = useState(false);
  const [mostrarStockModal, setMostrarStockModal] = useState(false);
  const [mostrarHistorialModal, setMostrarHistorialModal] = useState(false);
  const [mostrarIngresoMasivoModal, setMostrarIngresoMasivoModal] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // Queries
  const { data: dataItems, loading: loadingItems, refetch: refetchItems } = useQuery(GET_ITEMS_INVENTARIO, {
    variables: {
      tipo: tabActual === 'productos' ? 'producto' : tabActual === 'servicios' ? 'servicio' : null,
      categoria_id: categoriaFiltro,
      activo: mostrarInactivos ? null : true,
      busqueda: busqueda || null
    },
    fetchPolicy: 'network-only'
  });

  const { data: dataCategorias } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { activa: true }
  });

  const items = dataItems?.itemsInventario || [];
  const categorias = dataCategorias?.categoriasInventario || [];

  // Filtros
  const itemsFiltrados = items.filter((item) => {
    if (tabActual === 'stock_bajo') {
      return item.tipo === 'producto' && item.stock_actual <= item.stock_minimo;
    }
    return true;
  });

  const estadisticas = {
    total: items.length,
    productos: items.filter((i) => i.tipo === 'producto').length,
    servicios: items.filter((i) => i.tipo === 'servicio').length,
    stockBajo: items.filter((i) => i.tipo === 'producto' && i.stock_actual <= i.stock_minimo).length
  };

  const handleNuevoItem = () => {
    setItemSeleccionado(null);
    setMostrarItemModal(true);
  };

  const handleEditarItem = (item) => {
    setItemSeleccionado(item);
    setMostrarItemModal(true);
  };

  const handleAjustarStock = (item) => {
    setItemSeleccionado(item);
    setMostrarStockModal(true);
  };

  const handleVerHistorial = (item) => {
    console.log('🔍🔍🔍 HISTORIAL BUTTON CLICKED 🔍🔍🔍');
    console.log('🔍 handleVerHistorial called with item:', item);
    console.log('🔍 handleVerHistorial item.id:', item?.id);
    console.log('🔍 handleVerHistorial item.nombre:', item?.nombre);
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
    if (item.tipo === 'servicio') return 'stock-badge stock-servicio';
    if (item.stock_actual === 0) return 'stock-badge stock-agotado';
    if (item.stock_actual <= item.stock_minimo) return 'stock-badge stock-bajo';
    return 'stock-badge stock-ok';
  };

  const getStockBadgeText = (item) => {
    if (item.tipo === 'servicio') return 'Servicio';
    if (item.stock_actual === 0) return 'Agotado';
    if (item.stock_actual <= item.stock_minimo) return 'Stock Bajo';
    return 'Disponible';
  };

  const handleExportarExcel = () => {
    if (!items || items.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = itemsFiltrados.map((item) => ({
      Código: item.codigo || '',
      Nombre: item.nombre,
      Tipo: item.tipo === 'producto' ? 'Producto' : 'Servicio',
      Categoría: item.categoria?.nombre || '',
      'Precio Base': item.precio_base,
      'IVA %': item.iva_porcentaje,
      'Precio con IVA': item.precio_con_iva || item.precio_base,
      Stock: item.tipo === 'producto' ? item.stock_actual : 'N/A',
      'Stock Mínimo': item.tipo === 'producto' ? item.stock_minimo : 'N/A',
      'Unidad Medida': item.unidad_medida || '',
      Ubicación: item.ubicacion_almacen || '',
      'Precio Compra': item.precio_compra || '',
      'Margen %': item.margen_utilidad || '',
      Activo: item.activo ? 'Sí' : 'No',
      'Fecha Creación': item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO') : ''
    }));

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Código
      { wch: 30 }, // Nombre
      { wch: 10 }, // Tipo
      { wch: 20 }, // Categoría
      { wch: 12 }, // Precio Base
      { wch: 8 },  // IVA %
      { wch: 14 }, // Precio con IVA
      { wch: 10 }, // Stock
      { wch: 12 }, // Stock Mínimo
      { wch: 12 }, // Unidad Medida
      { wch: 15 }, // Ubicación
      { wch: 12 }, // Precio Compra
      { wch: 10 }, // Margen %
      { wch: 8 },  // Activo
      { wch: 14 }  // Fecha Creación
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Inventario_${tabActual}_${fecha}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  return (
    <Layout>
      <div className="inventario-page">
        {/* Header */}
        <div className="inventario-header">
          <div className="header-titulo">
            <FaBox className="header-icon" />
            <div>
              <h1>Gestión de Inventario</h1>
              <p>Administra productos y servicios del hotel</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setMostrarCategoriasModal(true)}>
              <FaCog /> Categorías
            </button>
            <button className="btn-secondary" onClick={() => setMostrarIngresoMasivoModal(true)}>
              <FaFileImport /> Ingreso Masivo
            </button>
            <button className="btn-secondary" onClick={handleExportarExcel} disabled={items.length === 0}>
              <FaFileExport /> Exportar
            </button>
            <button className="btn-primary" onClick={handleNuevoItem}>
              <FaPlus /> Nuevo Item
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="inventario-stats">
          <div className="stat-card" onClick={() => setTabActual('todos')}>
            <div className="stat-value">{estadisticas.total}</div>
            <div className="stat-label">Total Items</div>
          </div>
          <div className="stat-card" onClick={() => setTabActual('productos')}>
            <div className="stat-value">{estadisticas.productos}</div>
            <div className="stat-label">Productos</div>
          </div>
          <div className="stat-card" onClick={() => setTabActual('servicios')}>
            <div className="stat-value">{estadisticas.servicios}</div>
            <div className="stat-label">Servicios</div>
          </div>
          <div
            className={`stat-card ${estadisticas.stockBajo > 0 ? 'stat-warning' : ''}`}
            onClick={() => setTabActual('stock_bajo')}
          >
            <div className="stat-value">
              {estadisticas.stockBajo}
              {estadisticas.stockBajo > 0 && <FaExclamationTriangle className="warning-icon" />}
            </div>
            <div className="stat-label">Stock Bajo</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="inventario-tabs">
          <button
            className={`tab ${tabActual === 'todos' ? 'active' : ''}`}
            onClick={() => setTabActual('todos')}
          >
            Todos ({estadisticas.total})
          </button>
          <button
            className={`tab ${tabActual === 'productos' ? 'active' : ''}`}
            onClick={() => setTabActual('productos')}
          >
            Productos ({estadisticas.productos})
          </button>
          <button
            className={`tab ${tabActual === 'servicios' ? 'active' : ''}`}
            onClick={() => setTabActual('servicios')}
          >
            Servicios ({estadisticas.servicios})
          </button>
          <button
            className={`tab ${tabActual === 'stock_bajo' ? 'active' : ''} ${estadisticas.stockBajo > 0 ? 'tab-warning' : ''}`}
            onClick={() => setTabActual('stock_bajo')}
          >
            Stock Bajo ({estadisticas.stockBajo})
          </button>
        </div>

        {/* Filtros */}
        <div className="inventario-filtros">
          <div className="filtro-busqueda">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
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

        {/* Tabla de Items */}
        <div className="inventario-tabla-container">
          {loadingItems ? (
            <div className="loading-state">Cargando inventario...</div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="empty-state">
              <FaBox />
              <p>No hay items para mostrar</p>
              <button className="btn-primary" onClick={handleNuevoItem}>
                <FaPlus /> Crear primer item
              </button>
            </div>
          ) : (
            <table className="inventario-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Precio Base</th>
                  <th>IVA</th>
                  <th>Precio Final</th>
                  <th>Stock</th>
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
                      <span className={`tipo-badge tipo-${item.tipo}`}>
                        {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                      </span>
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
                      {item.tipo === 'producto' ? (
                        <div className="stock-info">
                          <span className="stock-cantidad">
                            {item.stock_actual} / {item.stock_minimo}
                          </span>
                          <span className="stock-unidad">{item.unidad_medida}</span>
                        </div>
                      ) : (
                        <span className="stock-na">—</span>
                      )}
                    </td>
                    <td>
                      <span className={getStockBadgeClass(item)}>
                        {item.tipo !== 'servicio' && item.stock_actual > 0 && item.stock_actual <= item.stock_minimo && (
                          <FaExclamationTriangle style={{ marginRight: '4px', fontSize: '0.875rem' }} />
                        )}
                        {getStockBadgeText(item)}
                      </span>
                    </td>
                    <td>
                      <div className="acciones">
                        <button
                          className="btn-accion btn-editar"
                          onClick={() => handleEditarItem(item)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        {item.tipo === 'producto' && (
                          <>
                            <button
                              className="btn-accion btn-stock"
                              onClick={() => handleAjustarStock(item)}
                              title="Ajustar Stock"
                            >
                              Stock
                            </button>
                            <button
                              className="btn-accion btn-historial"
                              onClick={() => handleVerHistorial(item)}
                              title="Ver Historial"
                            >
                              Historial
                            </button>
                          </>
                        )}
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

        {mostrarIngresoMasivoModal && (
          <IngresoMasivoModal
            onClose={() => setMostrarIngresoMasivoModal(false)}
            onSuccess={() => refetchItems()}
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
    </Layout>
  );
};

export default InventarioPage;
