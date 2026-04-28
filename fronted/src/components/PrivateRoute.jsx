import { Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ME } from '../graphql/auth';
import Loading from './shared/Loading';

const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const { data, loading, error } = useQuery(ME, {
    skip: !token,
  });

  // Si no hay token, redirigir al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Mientras carga, mostrar loading
  if (loading) {
    return <Loading fullScreen />;
  }

  // Si hay error o no hay usuario, redirigir al login
  if (error || !data?.me) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // Verificar roles si se especificaron
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = data.me.rol;
    if (!allowedRoles.includes(userRole)) {
      // No tiene permiso, redirigir al dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Usuario autenticado y autorizado
  return children;
};

export default PrivateRoute;
