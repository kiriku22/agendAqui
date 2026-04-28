import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Printer, Plus, Settings, Star, Trash2, RefreshCw, CheckCircle, XCircle, Monitor } from 'lucide-react';
import {
  GET_IMPRESORAS,
  GET_IMPRESORAS_DEL_SISTEMA,
  CREAR_IMPRESORA,
  ACTUALIZAR_IMPRESORA,
  ELIMINAR_IMPRESORA,
  ESTABLECER_IMPRESORA_PREDETERMINADA
} from '../graphql/impresoras';
import './Impresoras.css';

export default function Impresoras() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [impresoraEditando, setImpresoraEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'factura',
    nombre_sistema: '',
    descripcion: '',
    activa: true,
    es_predeterminada: false,
    ancho_papel: 80
  });

  // Queries
  const { data, loading, error, refetch } = useQuery(GET_IMPRESORAS);
  const { data: dataSistema, loading: loadingSistema, refetch: refetchSistema } = useQuery(GET_IMPRESORAS_DEL_SISTEMA);

  // Mutations
  const [crearImpresora, { loading: creando }] = useMutation(CREAR_IMPRESORA, {
    onCompleted: () => {
      refetch();
      cerrarModal();
    },
    onError: (error) => {
      console.error('Error al crear impresora:', error);
      alert('Error al crear impresora: ' + error.message);
    }
  });

  const [actualizarImpresora, { loading: actualizando }] = useMutation(ACTUALIZAR_IMPRESORA, {
    onCompleted: () => {
      refetch();
      cerrarModal();
    },
    onError: (error) => {
      console.error('Error al actualizar impresora:', error);
      alert('Error al actualizar impresora: ' + error.message);
    }
  });

  const [eliminarImpresora] = useMutation(ELIMINAR_IMPRESORA, {
    onCompleted: () => refetch(),
    onError: (error) => {
      console.error('Error al eliminar impresora:', error);
      alert('Error al eliminar impresora: ' + error.message);
    }
  });

  const [establecerPredeterminada] = useMutation(ESTABLECER_IMPRESORA_PREDETERMINADA, {
    onCompleted: () => refetch(),
    onError: (error) => {
      console.error('Error al establecer predeterminada:', error);
      alert('Error al establecer predeterminada: ' + error.message);
    }
  });

  const abrirModalCrear = () => {
    setImpresoraEditando(null);
    setFormData({
      nombre: '',
      tipo: 'factura',
      nombre_sistema: '',
      descripcion: '',
      activa: true,
      es_predeterminada: false,
      ancho_papel: 80
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (impresora) => {
    setImpresoraEditando(impresora);
    setFormData({
      nombre: impresora.nombre,
      tipo: impresora.tipo,
      nombre_sistema: impresora.nombre_sistema || '',
      descripcion: impresora.descripcion || '',
      activa: impresora.activa,
      es_predeterminada: impresora.es_predeterminada,
      ancho_papel: impresora.ancho_papel || 80
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setImpresoraEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const input = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      nombre_sistema: formData.nombre_sistema || null,
      descripcion: formData.descripcion || null,
      activa: formData.activa,
      es_predeterminada: formData.es_predeterminada,
      ancho_papel: parseInt(formData.ancho_papel)
    };

    if (impresoraEditando) {
      await actualizarImpresora({
        variables: { id: parseInt(impresoraEditando.id), input }
      });
    } else {
      await crearImpresora({
        variables: { input }
      });
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Seguro que desea eliminar esta impresora?')) {
      await eliminarImpresora({ variables: { id: parseInt(id) } });
    }
  };

  const handlePredeterminada = async (id) => {
    await establecerPredeterminada({ variables: { id: parseInt(id) } });
  };

  if (loading) {
    return (
      <div className="impresoras-container">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Cargando impresoras...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="impresoras-container">
        <div className="error-state">
          <XCircle size={32} />
          <p>Error: {error.message}</p>
        </div>
      </div>
    );
  }

  const impresoras = data?.impresoras || [];
  const impresorasSistema = dataSistema?.impresorasDelSistema || [];

  // Agrupar por tipo
  const impresorasPorTipo = {
    factura: impresoras.filter(i => i.tipo === 'factura'),
    cierre: impresoras.filter(i => i.tipo === 'cierre')
  };

  const tiposConfig = {
    factura: { icon: '🧾', label: 'Impresoras de Facturas', color: '#10b981' },
    cierre: { icon: '💰', label: 'Impresoras de Cierres', color: '#f59e0b' }
  };

  return (
    <div className="impresoras-container">
      {/* Header */}
      <div className="impresoras-header">
        <div className="header-title">
          <Printer size={28} />
          <h1>Gestion de Impresoras</h1>
        </div>
        <button className="btn-primario" onClick={abrirModalCrear}>
          <Plus size={18} />
          Nueva Impresora
        </button>
      </div>

      {/* Secciones por tipo */}
      {Object.entries(tiposConfig).map(([tipo, config]) => (
        <div key={tipo} className="seccion-tipo">
          <h2>
            <span className="tipo-icon">{config.icon}</span>
            {config.label}
          </h2>

          {impresorasPorTipo[tipo].length === 0 ? (
            <div className="sin-impresoras">
              <Printer size={24} />
              <p>No hay impresoras configuradas para este tipo</p>
            </div>
          ) : (
            <div className="grid-impresoras">
              {impresorasPorTipo[tipo].map(impresora => (
                <div
                  key={impresora.id}
                  className={`tarjeta-impresora ${!impresora.activa ? 'inactiva' : ''}`}
                >
                  <div className="tarjeta-header">
                    <div className="impresora-info">
                      <Printer size={20} />
                      <span className="impresora-nombre">{impresora.nombre}</span>
                    </div>
                    {impresora.es_predeterminada && (
                      <span className="badge-predeterminada">
                        <Star size={14} />
                        Predeterminada
                      </span>
                    )}
                  </div>

                  <div className="tarjeta-body">
                    {impresora.nombre_sistema && (
                      <div className="detalle">
                        <Monitor size={14} />
                        <span>{impresora.nombre_sistema}</span>
                      </div>
                    )}
                    {impresora.descripcion && (
                      <p className="descripcion">{impresora.descripcion}</p>
                    )}
                    <div className="detalles-extras">
                      <span className={`badge-estado ${impresora.activa ? 'activa' : 'inactiva'}`}>
                        {impresora.activa ? (
                          <><CheckCircle size={12} /> Activa</>
                        ) : (
                          <><XCircle size={12} /> Inactiva</>
                        )}
                      </span>
                      <span className="ancho-papel">{impresora.ancho_papel}mm</span>
                    </div>
                  </div>

                  <div className="tarjeta-footer">
                    {!impresora.es_predeterminada && (
                      <button
                        className="btn-link"
                        onClick={() => handlePredeterminada(impresora.id)}
                        title="Establecer como predeterminada"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button
                      className="btn-secundario btn-sm"
                      onClick={() => abrirModalEditar(impresora)}
                      title="Editar"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      className="btn-peligro btn-sm"
                      onClick={() => handleEliminar(impresora.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Impresoras del Sistema */}
      <div className="seccion-sistema">
        <div className="header-sistema">
          <h2>
            <Monitor size={20} />
            Impresoras Disponibles en el Sistema
          </h2>
          <button
            className="btn-secundario btn-sm"
            onClick={() => refetchSistema()}
            disabled={loadingSistema}
          >
            <RefreshCw size={14} className={loadingSistema ? 'spin' : ''} />
            Actualizar
          </button>
        </div>

        {impresorasSistema.length === 0 ? (
          <div className="sin-impresoras">
            <Monitor size={24} />
            <p>No se detectaron impresoras en el sistema</p>
          </div>
        ) : (
          <div className="lista-sistema">
            {impresorasSistema.map((imp, idx) => (
              <div key={idx} className="impresora-sistema">
                <div className="sistema-info">
                  <Printer size={16} />
                  <span className="nombre">{imp.nombre}</span>
                </div>
                <span className="driver">{imp.nombre_driver}</span>
                <span className={`estado ${imp.estado === 'Normal' ? 'ok' : 'error'}`}>
                  {imp.estado === 'Normal' ? (
                    <><CheckCircle size={12} /> Normal</>
                  ) : (
                    <><XCircle size={12} /> Error</>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Printer size={20} />
                {impresoraEditando ? 'Editar Impresora' : 'Nueva Impresora'}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required
                  placeholder="Ej: Caja Principal"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="factura">Factura</option>
                    <option value="cierre">Cierre de Caja</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Ancho de Papel</label>
                  <select
                    value={formData.ancho_papel}
                    onChange={e => setFormData({...formData, ancho_papel: parseInt(e.target.value)})}
                  >
                    <option value={80}>80mm (Estandar)</option>
                    <option value={58}>58mm (Compacta)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Impresora del Sistema</label>
                <select
                  value={formData.nombre_sistema}
                  onChange={e => setFormData({...formData, nombre_sistema: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {impresorasSistema.map((imp, idx) => (
                    <option key={idx} value={imp.nombre}>{imp.nombre}</option>
                  ))}
                </select>
                <small>Seleccione la impresora instalada en Windows</small>
              </div>

              <div className="form-group">
                <label>Descripcion</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripcion opcional"
                  rows={2}
                />
              </div>

              <div className="form-row checkboxes">
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.activa}
                      onChange={e => setFormData({...formData, activa: e.target.checked})}
                    />
                    Activa
                  </label>
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.es_predeterminada}
                      onChange={e => setFormData({...formData, es_predeterminada: e.target.checked})}
                    />
                    Predeterminada para su tipo
                  </label>
                </div>
              </div>

              <div className="modal-acciones">
                <button type="button" className="btn-secundario" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primario" disabled={creando || actualizando}>
                  {creando || actualizando ? (
                    <><RefreshCw size={16} className="spin" /> Guardando...</>
                  ) : (
                    <><CheckCircle size={16} /> Guardar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
