
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePremium?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requirePremium = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  console.log('ProtectedRoute: user:', !!user, 'profile:', !!profile, 'loading:', loading, 'requireAdmin:', requireAdmin);

  if (loading) {
    console.log('ProtectedRoute: Still loading, showing loading screen');
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center">
        <div className="text-umind-gray">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && profile?.role !== 'ADMIN') {
    console.log('ProtectedRoute: Admin required but user is not admin, redirecting to chat');
    return <Navigate to="/chat" replace />;
  }

  if (requirePremium && !['PREMIUM', 'ADMIN'].includes(profile?.role || '')) {
    console.log('ProtectedRoute: Premium required but user is not premium, redirecting to chat');
    return <Navigate to="/chat" replace />;
  }

  console.log('ProtectedRoute: All checks passed, rendering children');
  return <>{children}</>;
}
