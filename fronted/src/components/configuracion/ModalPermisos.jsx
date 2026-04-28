import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Shield, Loader, AlertCircle, CheckCircle, Users, User, ChevronDown, ChevronRight, Info } from 'lucide-react';
import {
  GET_PERMISOS_ROL_AGRUPADOS,
  GET_PERMISOS_USUARIO_AGRUPADOS,
  ASIGNAR_PERMISOS_ROL,
  ASIGNAR_PERMISO_USUARIO,
  QUITAR_PERMISO_USUARIO
} from '../../graphql/permisos';
import { GET_USUARIOS } from '../../graphql/configuracion';
import './ModalConfig.css';
import './ModalPermisos.css';

const ROLES = [
  { value: 'admin', label: 'Administrador', color: '#ef4444', descripcion: 'Acceso total al sistema' },
  { value: 'gerente', label: 'Gerente', color: '#f59e0b', descripcion: 'Reportes y gestión general' },
  { value: 'recepcionista', label: 'Recepcionista', color: '#3b82f6', descripcion: 'Operaciones diarias' },
  { value: 'limpieza', label: 'Limpieza', color: '#10b981', descripcion: 'Estado de habitaciones' },
  { value: 'mantenimiento', label: 'Mantenimiento', color: '#6b7280', descripcion: 'Mantenimiento de habitaciones' }
];

const MODULO_NOMBRES = {
  dashboard: 'Dashboard',
  habitaciones: 'Habitaciones',
  reservas: 'Reservas',
  hospedajes: 'Hospedajes',
  consumos: 'Consumos',
  clientes: 'Clientes',
  inventario: 'Inventario',
  pos: 'Punto de Venta',
  caja: 'Caja',
  factubox: 'Facturación Electrónica',
  reportes: 'Reportes',
  configuracion: 'Configuración'
};

function ModalPermisos({ onClose }) {
  const [tabActivo, setTabActivo] = useState('roles');
  const [rolSeleccionado, setRolSeleccionado] = useState('recepcionista');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [modulosExpandidos, setModulosExpandidos] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [cambiosPendientes, setCambiosPendientes] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Query usuarios
  const { data: dataUsuarios, loading: loadingUsuarios } = useQuery(GET_USUARIOS, {
    variables: { activo: true }
  });

  // Query permisos rol
  const { data: dataPermisosRol, loading: loadingPermisosRol, refetch: refetchRol } = useQuery(
    GET_PERMISOS_ROL_AGRUPADOS,
    {
      variables: { rol: rolSeleccionado },
      skip: tabActivo !== 'roles',
      fetchPolicy: 'network-only'
    }
  );

  // Query permisos usuario
  const { data: dataPermisosUsuario, loading: loadingPermisosUsuario, refetch: refetchUsuario } = useQuery(
    GET_PERMISOS_USUARIO_AGRUPADOS,
    {
      variables: { usuario_id: parseInt(usuarioSeleccionado) },
      skip: tabActivo !== 'usuarios' || !usuarioSeleccionado,
      fetchPolicy: 'network-only'
    }
  );

  // Mutations
  const [asignarPermisosRol] = useMutation(ASIGNAR_PERMISOS_ROL);
  const [asignarPermisoUsuario] = useMutation(ASIGNAR_PERMISO_USUARIO);
  const [quitarPermisoUsuario] = useMutation(QUITAR_PERMISO_USUARIO);

  // Datos procesados
  const permisosRolAgrupados = dataPermisosRol?.permisosRolAgrupados || [];
  const permisosUsuarioAgrupados = dataPermisosUsuario?.permisosUsuarioAgrupados || [];
  const usuarios = dataUsuarios?.usuarios?.filter(u => u.activo && u.rol !== 'admin') || [];

  // Contar cambios pendientes
  const numCambiosPendientes = Object.keys(cambiosPendientes).length;

  // Toggle módulo expandido
  const toggleModulo = (modulo) => {
    setModulosExpandidos(prev => ({
      ...prev,
      [modulo]: prev[modulo] === false ? true : false
    }));
  };

  // Verificar si módulo está expandido (por defecto expandido)
  const isModuloExpandido = (modulo) => {
    return modulosExpandidos[modulo] !== false;
  };

  // Handler para cambio de permiso en rol
  const handleTogglePermisoRol = (permisoId, estadoActual) => {
    setCambiosPendientes(prev => {
      const newState = { ...prev };
      if (newState[permisoId] !== undefined) {
        // Si ya tenía un cambio pendiente, verificar si volvió al estado original
        delete newState[permisoId];
      } else {
        newState[permisoId] = !estadoActual;
      }
      return newState;
    });
  };

  // Guardar permisos de rol
  const handleGuardarPermisosRol = async () => {
    setGuardando(true);
    try {
      // Calcular IDs seleccionados
      const idsSeleccionados = [];
      permisosRolAgrupados.forEach(grupo => {
        grupo.permisos.forEach(p => {
          const cambio = cambiosPendientes[p.id];
          const estaAsignado = cambio !== undefined ? cambio : p.asignado;
          if (estaAsignado) {
            idsSeleccionados.push(parseInt(p.id));
          }
        });
      });

      await asignarPermisosRol({
        variables: {
          rol: rolSeleccionado,
          permisos_ids: idsSeleccionados
        }
      });

      setMensaje({ tipo: 'success', texto: `Permisos del rol ${rolSeleccionado} actualizados correctamente` });
      setCambiosPendientes({});
      refetchRol();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  // Handler para cambio de permiso en usuario
  const handleTogglePermisoUsuario = async (permiso) => {
    setGuardando(true);
    try {
      if (permiso.origen === 'rol' && permiso.asignado) {
        // Quitar permiso que viene del rol
        await asignarPermisoUsuario({
          variables: {
            usuario_id: parseInt(usuarioSeleccionado),
            permiso_id: parseInt(permiso.id),
            tipo_asignacion: 'quitar',
            motivo: 'Quitado manualmente desde configuración'
          }
        });
        setMensaje({ tipo: 'success', texto: 'Permiso quitado del usuario' });
      } else if (permiso.origen === 'usuario_quitado') {
        // Restaurar permiso quitado
        await quitarPermisoUsuario({
          variables: {
            usuario_id: parseInt(usuarioSeleccionado),
            permiso_id: parseInt(permiso.id)
          }
        });
        setMensaje({ tipo: 'success', texto: 'Permiso restaurado del rol' });
      } else if (permiso.origen === 'usuario_agregado') {
        // Quitar permiso agregado manualmente
        await quitarPermisoUsuario({
          variables: {
            usuario_id: parseInt(usuarioSeleccionado),
            permiso_id: parseInt(permiso.id)
          }
        });
        setMensaje({ tipo: 'success', texto: 'Permiso removido del usuario' });
      } else {
        // Agregar permiso
        await asignarPermisoUsuario({
          variables: {
            usuario_id: parseInt(usuarioSeleccionado),
            permiso_id: parseInt(permiso.id),
            tipo_asignacion: 'agregar',
            motivo: 'Agregado manualmente desde configuración'
          }
        });
        setMensaje({ tipo: 'success', texto: 'Permiso agregado al usuario' });
      }
      refetchUsuario();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  // Limpiar mensaje después de 3 segundos
  if (mensaje) {
    setTimeout(() => setMensaje(null), 3000);
  }

  // Cambiar rol seleccionado
  const handleCambiarRol = (rol) => {
    if (numCambiosPendientes > 0) {
      if (!confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) {
        return;
      }
    }
    setRolSeleccionado(rol);
    setCambiosPendientes({});
  };

  // Renderizar checkbox de permiso
  const renderPermisoCheckbox = (permiso, esRol = true) => {
    let estadoActual = permiso.asignado;
    let tienesCambio = false;

    if (esRol) {
      const cambio = cambiosPendientes[permiso.id];
      if (cambio !== undefined) {
        estadoActual = cambio;
        tienesCambio = true;
      }
    }

    const getOrigenBadge = () => {
      if (esRol) return null;

      switch (permiso.origen) {
        case 'rol':
          return <span className="permiso-badge permiso-badge--rol">Del rol</span>;
        case 'usuario_agregado':
          return <span className="permiso-badge permiso-badge--agregado">Agregado</span>;
        case 'usuario_quitado':
          return <span className="permiso-badge permiso-badge--quitado">Quitado</span>;
        default:
          return null;
      }
    };

    return (
      <div
        key={permiso.id}
        className={`permiso-item ${tienesCambio ? 'permiso-item--modificado' : ''} ${!esRol && permiso.origen !== 'sin_permiso' ? `permiso-item--${permiso.origen}` : ''}`}
      >
        <label className="permiso-checkbox">
          <input
            type="checkbox"
            checked={estadoActual}
            onChange={() => esRol
              ? handleTogglePermisoRol(permiso.id, permiso.asignado)
              : handleTogglePermisoUsuario(permiso)
            }
            disabled={guardando || (esRol && rolSeleccionado === 'admin')}
          />
          <div className="permiso-info">
            <span className="permiso-nombre">{permiso.nombre}</span>
            {permiso.descripcion && (
              <span className="permiso-descripcion">{permiso.descripcion}</span>
            )}
          </div>
          {getOrigenBadge()}
        </label>
      </div>
    );
  };

  // Renderizar módulo con permisos
  const renderModuloPermisos = (grupo, esRol = true) => {
    const expandido = isModuloExpandido(grupo.modulo);

    // Contar permisos asignados (considerando cambios pendientes para rol)
    let permisosAsignados;
    if (esRol) {
      permisosAsignados = grupo.permisos.filter(p => {
        const cambio = cambiosPendientes[p.id];
        return cambio !== undefined ? cambio : p.asignado;
      }).length;
    } else {
      permisosAsignados = grupo.permisos.filter(p => p.asignado).length;
    }

    return (
      <div key={grupo.modulo} className="modulo-permisos">
        <div
          className="modulo-header"
          onClick={() => toggleModulo(grupo.modulo)}
        >
          <div className="modulo-header__left">
            {expandido ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="modulo-nombre">
              {MODULO_NOMBRES[grupo.modulo] || grupo.modulo}
            </span>
          </div>
          <span className={`modulo-contador ${permisosAsignados === grupo.permisos.length ? 'modulo-contador--full' : ''}`}>
            {permisosAsignados}/{grupo.permisos.length}
          </span>
        </div>
        {expandido && (
          <div className="modulo-permisos-lista">
            {grupo.permisos.map(p => renderPermisoCheckbox(p, esRol))}
          </div>
        )}
      </div>
    );
  };

  const usuarioSeleccionadoData = usuarios.find(u => u.id === usuarioSeleccionado);

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--xlarge">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' }}>
            <Shield size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-config__title">Gestión de Permisos</h2>
            <p className="modal-config__subtitle">
              Configurar permisos por rol y por usuario
            </p>
          </div>
          <button onClick={onClose} className="modal-config__close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="permisos-tabs">
          <button
            className={`permisos-tab ${tabActivo === 'roles' ? 'permisos-tab--activo' : ''}`}
            onClick={() => {
              if (numCambiosPendientes > 0) {
                if (!confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) {
                  return;
                }
              }
              setTabActivo('roles');
              setCambiosPendientes({});
            }}
          >
            <Users size={18} />
            <span>Por Rol</span>
          </button>
          <button
            className={`permisos-tab ${tabActivo === 'usuarios' ? 'permisos-tab--activo' : ''}`}
            onClick={() => {
              if (numCambiosPendientes > 0) {
                if (!confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) {
                  return;
                }
              }
              setTabActivo('usuarios');
              setCambiosPendientes({});
            }}
          >
            <User size={18} />
            <span>Por Usuario</span>
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`alert alert--${mensaje.tipo}`} style={{ margin: '0 1.5rem' }}>
            {mensaje.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Contenido */}
        <div className="modal-config__form">
          {tabActivo === 'roles' ? (
            <>
              {/* Selector de Rol */}
              <div className="permisos-selector">
                <label>Seleccionar Rol:</label>
                <div className="roles-buttons">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      className={`rol-button ${rolSeleccionado === r.value ? 'rol-button--activo' : ''}`}
                      style={{
                        '--rol-color': r.color,
                        borderColor: rolSeleccionado === r.value ? r.color : undefined,
                        backgroundColor: rolSeleccionado === r.value ? `${r.color}15` : undefined
                      }}
                      onClick={() => handleCambiarRol(r.value)}
                      disabled={guardando}
                    >
                      <span className="rol-button__nombre">{r.label}</span>
                      <span className="rol-button__desc">{r.descripcion}</span>
                      {r.value === 'admin' && (
                        <span className="rol-tag">Todos los permisos</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Admin */}
              {rolSeleccionado === 'admin' && (
                <div className="alert alert--info">
                  <Info size={20} />
                  <span>El rol Administrador tiene todos los permisos por defecto y no puede ser modificado.</span>
                </div>
              )}

              {/* Lista de Permisos del Rol */}
              {loadingPermisosRol ? (
                <div className="loading-center">
                  <Loader className="spinner" size={32} />
                  <p>Cargando permisos...</p>
                </div>
              ) : (
                <div className="permisos-lista">
                  {permisosRolAgrupados.map(grupo => renderModuloPermisos(grupo, true))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selector de Usuario */}
              <div className="permisos-selector">
                <label>Seleccionar Usuario:</label>
                {loadingUsuarios ? (
                  <div className="loading-inline">
                    <Loader className="spinner" size={20} />
                    <span>Cargando usuarios...</span>
                  </div>
                ) : (
                  <select
                    value={usuarioSeleccionado}
                    onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                    className="usuario-select"
                    disabled={guardando}
                  >
                    <option value="">-- Seleccione un usuario --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellido} ({u.usuario}) - {u.rol}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Info sobre usuario seleccionado */}
              {usuarioSeleccionado && usuarioSeleccionadoData && (
                <div className="usuario-info-box">
                  <div className="usuario-info-box__header">
                    <User size={20} />
                    <span>{usuarioSeleccionadoData.nombre} {usuarioSeleccionadoData.apellido}</span>
                  </div>
                  <div className="usuario-info-box__rol">
                    Rol base: <strong>{usuarioSeleccionadoData.rol}</strong>
                  </div>
                </div>
              )}

              {/* Leyenda */}
              {usuarioSeleccionado && (
                <div className="permisos-leyenda">
                  <span className="leyenda-item leyenda-item--rol">
                    <span className="leyenda-dot"></span>
                    Del rol base
                  </span>
                  <span className="leyenda-item leyenda-item--agregado">
                    <span className="leyenda-dot"></span>
                    Agregado manualmente
                  </span>
                  <span className="leyenda-item leyenda-item--quitado">
                    <span className="leyenda-dot"></span>
                    Quitado del rol
                  </span>
                </div>
              )}

              {/* Lista de Permisos del Usuario */}
              {!usuarioSeleccionado ? (
                <div className="empty-state">
                  <User size={48} />
                  <h3>Selecciona un usuario</h3>
                  <p>Elige un usuario de la lista para ver y modificar sus permisos específicos.</p>
                </div>
              ) : loadingPermisosUsuario ? (
                <div className="loading-center">
                  <Loader className="spinner" size={32} />
                  <p>Cargando permisos del usuario...</p>
                </div>
              ) : (
                <div className="permisos-lista">
                  {permisosUsuarioAgrupados.map(grupo => renderModuloPermisos(grupo, false))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-config__footer">
          <button onClick={onClose} className="btn-secondary" disabled={guardando}>
            Cerrar
          </button>
          {tabActivo === 'roles' && numCambiosPendientes > 0 && (
            <button
              onClick={handleGuardarPermisosRol}
              className="btn-primary"
              disabled={guardando || rolSeleccionado === 'admin'}
            >
              {guardando ? (
                <>
                  <Loader className="spinner" size={16} />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Guardar Cambios ({numCambiosPendientes})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalPermisos;
