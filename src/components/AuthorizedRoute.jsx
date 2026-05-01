import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useVisualAuth } from '@/hooks/useVisualAuth';

const fallbackRouteOrder = [
  { module: 'dashboard', path: '/' },
  { module: 'patients', path: '/patients' },
  { module: 'admissions', path: '/admissions' },
  { module: 'beds', path: '/beds' },
  { module: 'appointments', path: '/appointments' },
  { module: 'tasks', path: '/tasks' },
  { module: 'lab', path: '/lab' },
  { module: 'pharmacy', path: '/pharmacy' },
  { module: 'billing', path: '/billing' },
  { module: 'notifications', path: '/notifications' },
  { module: 'settings', path: '/settings' },
];

const AuthorizedRoute = ({ module, action = "view" }) => {
  const { user, isLoading } = useAuth();
  const { can, canView, isLoading: isVisualAuthLoading } = useVisualAuth();

  if (isLoading || isVisualAuthLoading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const actionMap = { view: "canView", create: "canCreate", edit: "canEdit", delete: "canDelete" };
  const requiredAction = actionMap[String(action).toLowerCase()] || "canView";

  if (module && !can(module, requiredAction)) {
    const fallbackPath = fallbackRouteOrder.find((item) => canView(item.module))?.path;
    return <Navigate to={fallbackPath || "/login"} replace />;
  }

  return <Outlet />;
};

export default AuthorizedRoute;
