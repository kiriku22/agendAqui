import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { FaTimes, FaPlus, FaEdit, FaTrash, FaSave, FaGripVertical } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import './CategoriasModal.css';
import {
  GET_CATEGORIAS_INVENTARIO,
  CREAR_CATEGORIA_INVENTARIO,
  ACTUALIZAR_CATEGORIA_INVENTARIO,
  ELIMINAR_CATEGORIA_INVENTARIO
} from '../../graphql/categorias';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmModal from '../shared/ConfirmModal';

const CategoriasModal = ({ isOpen, onClose, tipo = null }) => {
  const [categorias, setCategorias] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: tipo || 'producto',
    color: '#1e40af',
    icono: 'FaBox',
    orden: 0
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { state: confirmState, confirm, execute, close } = useConfirmation();

  const { data, loading, refetch } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { tipo },
    fetchPolicy: 'network-only'
  });

  const [crearCategoria] = useMutation(CREAR_CATEGORIA_INVENTARIO);
  const [actualizarCategoria] = useMutation(ACTUALIZAR_CATEGORIA_INVENTARIO);
  const [eliminarCategoria] = useMutation(ELIMINAR_CATEGORIA_INVENTARIO);

  useEffect(() => {
    if (data?.categoriasInventario) {
      setCategorias([...data.categoriasInventario].sort((a, b) => a.orden - b.orden));
    }
  }, [data]);

  const iconosDisponibles = [
    'FaBox', 'FaWineGlass', 'FaGlassCheers', 'FaCookie', 'FaBreadSlice',
    'FaSoap', 'FaBath', 'FaGift', 'FaPills', 'FaTshirt', 'FaCar',
    'FaSpa', 'FaConciergeBell', 'FaGlassMartini', 'FaUtensils', 'FaMapMarkedAlt',
    'FaEllipsisH', 'FaCoffee', 'FaBeer', 'FaAppleAlt', 'FaIceCream'
  ];

  const coloresDisponibles = [
    '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
    '#1e40af', '#ec4899', '#f43f5e', '#14b8a6', '#6366f1',
    '#a855f7', '#d946ef', '#6b7280'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await actualizarCategoria({
          variables: {
            id: typeof editingId === 'string' ? parseInt(editingId, 10) : editingId,
            input: {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              color: formData.color,
              icono: formData.icono,
              orden: formData.orden
            }
          }
        });
        setEditingId(null);
      } else {
        await crearCategoria({
          variables: {
            input: formData
          }
        });
        setIsCreating(false);
      }
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert(error.message);
    }
  };

  const handleEdit = (categoria) => {
    setFormData({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      tipo: categoria.tipo,
      color: categoria.color || '#1e40af',
      icono: categoria.icono || 'FaBox',
      orden: categoria.orden
    });
    setEditingId(categoria.id);
    setIsCreating(false);
  };

  const handleDelete = (id) => {
    confirm(
      async () => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        await eliminarCategoria({ variables: { id: numericId } });
        refetch();
      },
      {
        title: 'Eliminar Categoría',
        message: '¿Está seguro de eliminar esta categoría? Si tiene items asociados, se desactivará en lugar de eliminarse.',
        variant: 'danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleNuevaCategoria = () => {
    resetForm();
    setIsCreating(true);
    setEditingId(null);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo: tipo || 'producto',
      color: '#1e40af',
      icono: 'FaBox',
      orden: categorias.length
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const renderIcon = (iconName) => {
    const IconComponent = FaIcons[iconName] || FaIcons.FaBox;
    return <IconComponent />;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="categorias-modal" onClick={(e) => e.stopPropagation()}>
        <div className="categorias-modal-header">
          <h2>Gestión de Categorías</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="categorias-modal-body">
          {/* Botón Nueva Categoría */}
          {!isCreating && !editingId && (
            <button className="btn-nueva-categoria" onClick={handleNuevaCategoria}>
              <FaPlus /> Nueva Categoría
            </button>
          )}

          {/* Formulario de Creación/Edición */}
          {(isCreating || editingId) && (
            <form className="categoria-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: bebidas_alcoholicas"
                  />
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                    disabled={!!editingId}
                  >
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Breve descripción de la categoría"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker-container">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: formData.color }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    {showColorPicker && (
                      <div className="color-picker-palette">
                        {coloresDisponibles.map((color) => (
                          <div
                            key={color}
                            className={`color-option ${formData.color === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setFormData({ ...formData, color });
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Icono</label>
                  <div className="icon-picker-container">
                    <div
                      className="icon-preview"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                      {renderIcon(formData.icono)}
                    </div>
                    {showIconPicker && (
                      <div className="icon-picker-palette">
                        {iconosDisponibles.map((icono) => (
                          <div
                            key={icono}
                            className={`icon-option ${formData.icono === icono ? 'selected' : ''}`}
                            onClick={() => {
                              setFormData({ ...formData, icono });
                              setShowIconPicker(false);
                            }}
                          >
                            {renderIcon(icono)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-guardar">
                  <FaSave /> Guardar
                </button>
                <button type="button" className="btn-cancelar" onClick={handleCancel}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de Categorías */}
          <div className="categorias-lista">
            <h3>Categorías Existentes</h3>
            {loading ? (
              <p>Cargando categorías...</p>
            ) : categorias.length === 0 ? (
              <p className="no-data">No hay categorías creadas</p>
            ) : (
              <div className="categorias-grid">
                {categorias.map((categoria) => (
                  <div
                    key={categoria.id}
                    className={`categoria-card ${!categoria.activa ? 'inactiva' : ''} ${editingId === categoria.id ? 'editing' : ''}`}
                  >
                    <div className="categoria-drag">
                      <FaGripVertical />
                    </div>
                    <div
                      className="categoria-color"
                      style={{ backgroundColor: categoria.color || '#1e40af' }}
                    />
                    <div className="categoria-icon" style={{ color: categoria.color || '#1e40af' }}>
                      {renderIcon(categoria.icono || 'FaBox')}
                    </div>
                    <div className="categoria-info">
                      <h4>{categoria.nombre}</h4>
                      <p className="categoria-descripcion">{categoria.descripcion || 'Sin descripción'}</p>
                      <div className="categoria-meta">
                        <span className={`tipo-badge tipo-${categoria.tipo}`}>
                          {categoria.tipo}
                        </span>
                        <span className="orden-badge">Orden: {categoria.orden}</span>
                      </div>
                    </div>
                    <div className="categoria-actions">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(categoria)}
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(categoria.id)}
                        title="Eliminar"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        {...confirmState}
        onConfirm={execute}
        onClose={close}
      />
    </div>
  );
};

export default CategoriasModal;
