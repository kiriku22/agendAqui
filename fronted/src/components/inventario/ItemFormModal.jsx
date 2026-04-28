import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { FaTimes, FaSave, FaBox, FaCog } from 'react-icons/fa';
import './ItemFormModal.css';
import { GET_CATEGORIAS_INVENTARIO } from '../../graphql/categorias';
import {
  CREAR_ITEM_INVENTARIO,
  ACTUALIZAR_ITEM_INVENTARIO
} from '../../graphql/inventario';

const ItemFormModal = ({ isOpen, onClose, item = null }) => {
  const isEditing = !!item;

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'producto',
    categoria_id: '',
    precio_base: '',
    iva_porcentaje: '19',
    stock_actual: '0',
    stock_minimo: '0',
    unidad_medida: 'unidad',
    ubicacion_almacen: '',
    duracion_minutos: '',
    precio_compra: '',
    imagen_url: '',
    notas: ''
  });

  const { data: dataCategorias } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { activa: true }
  });

  const [crearItem, { loading: creando }] = useMutation(CREAR_ITEM_INVENTARIO);
  const [actualizarItem, { loading: actualizando }] = useMutation(ACTUALIZAR_ITEM_INVENTARIO);

  useEffect(() => {
    if (item) {
      setFormData({
        codigo: item.codigo || '',
        nombre: item.nombre || '',
        descripcion: item.descripcion || '',
        tipo: item.tipo || 'producto',
        categoria_id: item.categoria_id?.toString() || '',
        precio_base: item.precio_base?.toString() || '',
        iva_porcentaje: item.iva_porcentaje?.toString() || '19',
        stock_actual: item.stock_actual?.toString() || '0',
        stock_minimo: item.stock_minimo?.toString() || '0',
        unidad_medida: item.unidad_medida || 'unidad',
        ubicacion_almacen: item.ubicacion_almacen || '',
        duracion_minutos: item.duracion_minutos?.toString() || '',
        precio_compra: item.precio_compra?.toString() || '',
        imagen_url: item.imagen_url || '',
        notas: item.notas || ''
      });
    }
  }, [item]);

  const categorias = dataCategorias?.categoriasInventario || [];
  const categoriasFiltradas = categorias.filter(
    (cat) => cat.tipo === formData.tipo || cat.tipo === 'ambos'
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calcularPrecioConIva = () => {
    const base = parseFloat(formData.precio_base) || 0;
    const iva = parseFloat(formData.iva_porcentaje) || 0;
    return base * (1 + iva / 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const input = {
        codigo: formData.codigo || null,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        tipo: formData.tipo,
        categoria_id: parseInt(formData.categoria_id),
        precio_base: parseFloat(formData.precio_base),
        iva_porcentaje: parseFloat(formData.iva_porcentaje) || 0,
        unidad_medida: formData.unidad_medida || 'unidad',
        imagen_url: formData.imagen_url || null,
        notas: formData.notas || null
      };

      // Campos específicos de productos
      if (formData.tipo === 'producto') {
        input.stock_actual = parseInt(formData.stock_actual) || 0;
        input.stock_minimo = parseInt(formData.stock_minimo) || 0;
        input.ubicacion_almacen = formData.ubicacion_almacen || null;
        input.precio_compra = formData.precio_compra ? parseFloat(formData.precio_compra) : null;
      }

      // Campos específicos de servicios
      if (formData.tipo === 'servicio' && formData.duracion_minutos) {
        input.duracion_minutos = parseInt(formData.duracion_minutos);
      }

      if (isEditing) {
        const updateInput = { ...input };
        delete updateInput.stock_actual; // No actualizar stock directamente
        delete updateInput.tipo; // No cambiar tipo en edición

        await actualizarItem({
          variables: {
            id: item.id,
            input: updateInput
          }
        });
      } else {
        await crearItem({
          variables: { input }
        });
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar item:', error);
      alert(error.message || 'Error al guardar el item');
    }
  };

  if (!isOpen) return null;

  const precioConIva = calcularPrecioConIva();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="item-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="item-form-header">
          <h2>
            <FaBox /> {isEditing ? 'Editar Item' : 'Nuevo Item'}
          </h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="item-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Información Básica</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  required
                  disabled={isEditing}
                >
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                </select>
                {isEditing && (
                  <small className="help-text">El tipo no se puede cambiar después de crear</small>
                )}
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => handleChange('categoria_id', e.target.value)}
                  required
                >
                  <option value="">Seleccione una categoría</option>
                  {categoriasFiltradas.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Código</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => handleChange('codigo', e.target.value)}
                  placeholder="Ej: PROD-001"
                />
              </div>

              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  required
                  placeholder="Nombre del item"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Descripción detallada del item"
                rows="2"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Precios</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Precio Base *</label>
                <input
                  type="number"
                  value={formData.precio_base}
                  onChange={(e) => handleChange('precio_base', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>IVA (%)</label>
                <input
                  type="number"
                  value={formData.iva_porcentaje}
                  onChange={(e) => handleChange('iva_porcentaje', e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Precio Final (con IVA)</label>
                <div className="precio-calculado">
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                  }).format(precioConIva)}
                </div>
              </div>
            </div>

            {formData.tipo === 'producto' && (
              <div className="form-group">
                <label>Precio de Compra</label>
                <input
                  type="number"
                  value={formData.precio_compra}
                  onChange={(e) => handleChange('precio_compra', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Costo de adquisición"
                />
              </div>
            )}
          </div>

          {/* Sección de Stock (solo productos) */}
          {formData.tipo === 'producto' && (
            <div className="form-section">
              <h3>Control de Inventario</h3>

              <div className="form-row">
                {!isEditing && (
                  <div className="form-group">
                    <label>Stock Inicial *</label>
                    <input
                      type="number"
                      value={formData.stock_actual}
                      onChange={(e) => handleChange('stock_actual', e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Stock Mínimo *</label>
                  <input
                    type="number"
                    value={formData.stock_minimo}
                    onChange={(e) => handleChange('stock_minimo', e.target.value)}
                    min="0"
                    required
                  />
                  <small className="help-text">
                    Se generarán alertas cuando el stock esté en este nivel
                  </small>
                </div>

                <div className="form-group">
                  <label>Unidad de Medida</label>
                  <select
                    value={formData.unidad_medida}
                    onChange={(e) => handleChange('unidad_medida', e.target.value)}
                  >
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                    <option value="botella">Botella</option>
                    <option value="litro">Litro</option>
                    <option value="kilogramo">Kilogramo</option>
                    <option value="par">Par</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ubicación en Almacén</label>
                <input
                  type="text"
                  value={formData.ubicacion_almacen}
                  onChange={(e) => handleChange('ubicacion_almacen', e.target.value)}
                  placeholder="Ej: Bodega Principal, Estante A-3"
                />
              </div>
            </div>
          )}

          {/* Sección de Servicio */}
          {formData.tipo === 'servicio' && (
            <div className="form-section">
              <h3>Detalles del Servicio</h3>

              <div className="form-group">
                <label>Duración (minutos)</label>
                <input
                  type="number"
                  value={formData.duracion_minutos}
                  onChange={(e) => handleChange('duracion_minutos', e.target.value)}
                  min="0"
                  placeholder="Duración estimada del servicio"
                />
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Información Adicional</h3>

            <div className="form-group">
              <label>URL de Imagen</label>
              <input
                type="url"
                value={formData.imagen_url}
                onChange={(e) => handleChange('imagen_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => handleChange('notas', e.target.value)}
                placeholder="Notas adicionales, instrucciones especiales, etc."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-guardar"
              disabled={creando || actualizando}
            >
              <FaSave />
              {creando || actualizando ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Item'}
            </button>
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemFormModal;
