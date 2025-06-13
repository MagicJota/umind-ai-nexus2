
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePremium?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requirePremium = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center">
        <div className="text-umind-gray">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && profile?.role !== 'ADMIN') {
    return <Navigate to="/chat" replace />;
  }

  if (requirePremium && !['PREMIUM', 'ADMIN'].includes(profile?.role || '')) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}
