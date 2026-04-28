import { Navigate, useLocation } from 'react-router-dom';
import { useModuloHabilitado } from '../hooks/useModuloHabilitado';
import { Lock, Package } from 'lucide-react';
import './ModuloRoute.css';

/**
 * Componente que protege rutas segun modulos activos de la licencia
 *
 * @param {ReactNode} children - Componente a renderizar si tiene acceso
 * @param {string} modulo - Codigo del modulo requerido
 * @param {boolean} mostrarBloqueado - Si es true, muestra UI de "modulo no disponible" en lugar de redirigir
 * @param {string} redirectTo - Ruta a la que redirigir si no tiene acceso (default: '/')
 *
 * @example
 * <ModuloRoute modulo="pedidos_whatsapp">
 *   <PedidosWhatsApp />
 * </ModuloRoute>
 *
 * @example
 * <ModuloRoute modulo="pedidos_whatsapp" mostrarBloqueado={true}>
 *   <PedidosWhatsApp />
 * </ModuloRoute>
 */
export default function ModuloRoute({
  children,
  modulo,
  mostrarBloqueado = false,
  redirectTo = '/'
}) {
  const habilitado = useModuloHabilitado(modulo);
  const location = useLocation();

  // Si tiene el modulo, renderizar children
  if (habilitado) {
    return children;
  }

  // Si no tiene el modulo y se debe mostrar bloqueado
  if (mostrarBloqueado) {
    return (
      <div className="modulo-bloqueado-container">
        <div className="modulo-bloqueado-card">
          <div className="modulo-bloqueado-icon">
            <Lock size={48} />
          </div>
          <h2 className="modulo-bloqueado-titulo">Modulo No Disponible</h2>
          <p className="modulo-bloqueado-mensaje">
            Su licencia no incluye acceso al modulo{' '}
            <strong>{modulo}</strong>.
          </p>
          <div className="modulo-bloqueado-info">
            <Package size={20} />
            <span>
              Para acceder a esta funcionalidad, contacte a soporte para
              actualizar su plan.
            </span>
          </div>
          <div className="modulo-bloqueado-acciones">
            <button
              className="btn-volver-inicio"
              onClick={() => window.history.back()}
            >
              Volver
            </button>
            <a
              href="/mi-licencia"
              className="btn-ver-licencia"
            >
              Ver Mi Licencia
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Redirigir si no tiene acceso
  return <Navigate to={redirectTo} state={{ from: location }} replace />;
}

/**
 * Componente condicional para mostrar contenido solo si tiene un modulo
 * No redirige ni muestra UI de bloqueado, simplemente no renderiza nada
 *
 * @example
 * <ConModulo modulo="pedidos_whatsapp">
 *   <BotonWhatsApp />
 * </ConModulo>
 */
export function ConModulo({ children, modulo }) {
  const habilitado = useModuloHabilitado(modulo);

  if (!habilitado) return null;

  return children;
}

/**
 * Componente para mostrar contenido alternativo si NO tiene un modulo
 *
 * @example
 * <SinModulo modulo="pedidos_whatsapp" fallback={<UpgradePromo />}>
 *   <BiDashboard />
 * </SinModulo>
 */
export function SinModulo({ children, modulo, fallback = null }) {
  const habilitado = useModuloHabilitado(modulo);

  if (habilitado) {
    return children;
  }

  return fallback;
}
