import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!loading && user && requireAdmin && !isAdmin && !toastShown.current) {
      toastShown.current = true;
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this area.',
        variant: 'destructive',
      });
    }
  }, [loading, user, isAdmin, requireAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
