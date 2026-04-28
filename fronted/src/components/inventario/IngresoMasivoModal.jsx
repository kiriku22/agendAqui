import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { X, Plus, Trash2, Check, AlertCircle, Download, Upload } from 'lucide-react';
import { CREAR_ITEMS_MASIVO } from '../../graphql/inventario';
import { GET_CATEGORIAS_INVENTARIO } from '../../graphql/categorias';
import './IngresoMasivoModal.css';

function IngresoMasivoModal({ onClose, onSuccess }) {
  const [tabActivo, setTabActivo] = useState('productos'); // productos | servicios
  const [filas, setFilas] = useState([
    { id: Date.now(), codigo: '', nombre: '', categoria_id: '', precio_base: '', stock_actual: '' }
  ]);
  const [errores, setErrores] = useState({});
  const [validado, setValidado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Query para categorías
  const { data: dataCategorias } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { activa: true }
  });

  const categorias = dataCategorias?.categoriasInventario || [];
  const categoriasFiltradas = categorias.filter(c => c.tipo === tabActivo.slice(0, -1));

  // Mutation
  const [crearItemsMasivo, { loading }] = useMutation(CREAR_ITEMS_MASIVO, {
    onCompleted: (data) => {
      setMensaje({ tipo: 'success', texto: `${data.crearItemsMasivo.length} items creados exitosamente` });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
    }
  });

  const agregarFila = () => {
    setFilas([...filas, {
      id: Date.now(),
      codigo: '',
      nombre: '',
      categoria_id: '',
      precio_base: '',
      stock_actual: ''
    }]);
    setValidado(false);
  };

  const eliminarFila = (id) => {
    setFilas(filas.filter(f => f.id !== id));
    const nuevosErrores = { ...errores };
    delete nuevosErrores[id];
    setErrores(nuevosErrores);
    setValidado(false);
  };

  const actualizarFila = (id, campo, valor) => {
    setFilas(filas.map(f =>
      f.id === id ? { ...f, [campo]: valor } : f
    ));

    // Limpiar error del campo si existe
    if (errores[id]?.[campo]) {
      const nuevosErrores = { ...errores };
      delete nuevosErrores[id][campo];
      if (Object.keys(nuevosErrores[id]).length === 0) {
        delete nuevosErrores[id];
      }
      setErrores(nuevosErrores);
    }

    setValidado(false);
  };

  const validarFilas = () => {
    const nuevosErrores = {};
    const codigosVistos = new Set();

    filas.forEach((fila, index) => {
      const erroresFila = {};

      // Validar código (opcional pero único)
      if (fila.codigo) {
        if (codigosVistos.has(fila.codigo)) {
          erroresFila.codigo = 'Código duplicado en esta tabla';
        } else {
          codigosVistos.add(fila.codigo);
        }
      }

      // Validar nombre (requerido)
      if (!fila.nombre || fila.nombre.trim() === '') {
        erroresFila.nombre = 'Nombre requerido';
      }

      // Validar categoría (requerida)
      if (!fila.categoria_id || fila.categoria_id === '') {
        erroresFila.categoria_id = 'Categoría requerida';
      }

      // Validar precio (requerido y numérico)
      if (!fila.precio_base || fila.precio_base === '') {
        erroresFila.precio_base = 'Precio requerido';
      } else if (isNaN(parseFloat(fila.precio_base)) || parseFloat(fila.precio_base) < 0) {
        erroresFila.precio_base = 'Precio inválido';
      }

      // Validar stock solo para productos (requerido y numérico)
      if (tabActivo === 'productos') {
        if (fila.stock_actual === '') {
          erroresFila.stock_actual = 'Stock requerido';
        } else if (isNaN(parseInt(fila.stock_actual)) || parseInt(fila.stock_actual) < 0) {
          erroresFila.stock_actual = 'Stock inválido';
        }
      }

      if (Object.keys(erroresFila).length > 0) {
        nuevosErrores[fila.id] = erroresFila;
      }
    });

    setErrores(nuevosErrores);
    const esValido = Object.keys(nuevosErrores).length === 0 && filas.length > 0;
    setValidado(esValido);

    if (esValido) {
      setMensaje({ tipo: 'success', texto: '¡Validación exitosa! Todos los datos son correctos.' });
    } else {
      setMensaje({ tipo: 'error', texto: 'Hay errores en los datos. Por favor corríjalos.' });
    }

    return esValido;
  };

  const handleGuardar = async () => {
    if (!validado) {
      setMensaje({ tipo: 'error', texto: 'Debe validar los datos antes de guardar' });
      return;
    }

    const items = filas.map(fila => ({
      codigo: fila.codigo || null,
      nombre: fila.nombre.trim(),
      tipo: tabActivo === 'productos' ? 'producto' : 'servicio',
      categoria_id: parseInt(fila.categoria_id),
      precio_base: parseFloat(fila.precio_base),
      stock_actual: tabActivo === 'productos' ? parseInt(fila.stock_actual) : 0,
      stock_minimo: 0,
      iva_porcentaje: 0,
      activo: true
    }));

    await crearItemsMasivo({ variables: { items } });
  };

  const cambiarTab = (nuevoTab) => {
    setTabActivo(nuevoTab);
    setFilas([{ id: Date.now(), codigo: '', nombre: '', categoria_id: '', precio_base: '', stock_actual: '' }]);
    setErrores({});
    setValidado(false);
    setMensaje(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ingreso-masivo-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Upload size={24} />
              Ingreso Masivo de Items
            </h2>
            <p className="modal-subtitle">
              Ingresa múltiples {tabActivo} a la vez en formato de tabla
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab ${tabActivo === 'productos' ? 'active' : ''}`}
            onClick={() => cambiarTab('productos')}
          >
            Productos
          </button>
          <button
            className={`tab ${tabActivo === 'servicios' ? 'active' : ''}`}
            onClick={() => cambiarTab('servicios')}
          >
            Servicios
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.tipo === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Instrucciones */}
        <div className="instrucciones">
          <p>
            <strong>Instrucciones:</strong> Completa los campos en la tabla. Los campos con{' '}
            <span className="requerido">*</span> son obligatorios. Haz clic en "Validar" para verificar
            que todos los datos sean correctos antes de guardar.
          </p>
        </div>

        {/* Tabla Editable */}
        <div className="tabla-container">
          <table className="tabla-masiva">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '120px' }}>Código</th>
                <th style={{ width: '250px' }}>
                  Nombre <span className="requerido">*</span>
                </th>
                <th style={{ width: '200px' }}>
                  Categoría <span className="requerido">*</span>
                </th>
                <th style={{ width: '130px' }}>
                  Precio <span className="requerido">*</span>
                </th>
                {tabActivo === 'productos' && (
                  <th style={{ width: '100px' }}>
                    Stock <span className="requerido">*</span>
                  </th>
                )}
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={fila.id} className={errores[fila.id] ? 'fila-error' : ''}>
                  <td className="num-fila">{index + 1}</td>

                  <td>
                    <input
                      type="text"
                      className={`input-tabla ${errores[fila.id]?.codigo ? 'error' : ''}`}
                      value={fila.codigo}
                      onChange={(e) => actualizarFila(fila.id, 'codigo', e.target.value)}
                      placeholder="Opcional"
                    />
                    {errores[fila.id]?.codigo && (
                      <span className="error-msg">{errores[fila.id].codigo}</span>
                    )}
                  </td>

                  <td>
                    <input
                      type="text"
                      className={`input-tabla ${errores[fila.id]?.nombre ? 'error' : ''}`}
                      value={fila.nombre}
                      onChange={(e) => actualizarFila(fila.id, 'nombre', e.target.value)}
                      placeholder="Nombre del item"
                    />
                    {errores[fila.id]?.nombre && (
                      <span className="error-msg">{errores[fila.id].nombre}</span>
                    )}
                  </td>

                  <td>
                    <select
                      className={`input-tabla ${errores[fila.id]?.categoria_id ? 'error' : ''}`}
                      value={fila.categoria_id}
                      onChange={(e) => actualizarFila(fila.id, 'categoria_id', e.target.value)}
                    >
                      <option value="">Seleccione categoría...</option>
                      {categoriasFiltradas.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                    {errores[fila.id]?.categoria_id && (
                      <span className="error-msg">{errores[fila.id].categoria_id}</span>
                    )}
                  </td>

                  <td>
                    <input
                      type="number"
                      className={`input-tabla ${errores[fila.id]?.precio_base ? 'error' : ''}`}
                      value={fila.precio_base}
                      onChange={(e) => actualizarFila(fila.id, 'precio_base', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                    {errores[fila.id]?.precio_base && (
                      <span className="error-msg">{errores[fila.id].precio_base}</span>
                    )}
                  </td>

                  {tabActivo === 'productos' && (
                    <td>
                      <input
                        type="number"
                        className={`input-tabla ${errores[fila.id]?.stock_actual ? 'error' : ''}`}
                        value={fila.stock_actual}
                        onChange={(e) => actualizarFila(fila.id, 'stock_actual', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                      {errores[fila.id]?.stock_actual && (
                        <span className="error-msg">{errores[fila.id].stock_actual}</span>
                      )}
                    </td>
                  )}

                  <td>
                    {filas.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-delete"
                        onClick={() => eliminarFila(fila.id)}
                        title="Eliminar fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón agregar fila */}
        <div className="acciones-tabla">
          <button type="button" className="btn-secondary" onClick={agregarFila}>
            <Plus size={16} />
            Agregar Fila
          </button>
          <span className="contador-filas">{filas.length} fila(s)</span>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancelar
          </button>
          <button
            onClick={validarFilas}
            className="btn-secondary"
            disabled={loading || filas.length === 0}
          >
            <Check size={16} />
            Validar
          </button>
          <button
            onClick={handleGuardar}
            className="btn-primary"
            disabled={!validado || loading}
          >
            {loading ? 'Guardando...' : `Guardar ${filas.length} Item(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IngresoMasivoModal;
