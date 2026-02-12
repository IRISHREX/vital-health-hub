import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useVisualAuth } from '@/hooks/useVisualAuth';
import NotFound from '@/pages/NotFound';

const AuthorizedRoute = ({ module }) => {
  const { user, isLoading } = useAuth();
  const { canView } = useVisualAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (module && !canView(module)) {
    // Optional: redirect to a dedicated 'Access Denied' page
    return <NotFound />;
  }

  return <Outlet />;
};

export default AuthorizedRoute;
