import { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const token = params.get('token');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        toast.error('Token inválido no callback de OAuth');
        return;
      }
      try {
        // Armazena o token primeiro para que o helper api inclua Authorization
        localStorage.setItem('authToken', token);
        // Buscar dados do usuário atual
        const me = await api('/api/auth/me');
        if (!me?.user) throw new Error('Usuário não retornado');
        login(token, me.user);
      } catch (e: any) {
        console.error('[OAuthCallback] Falha ao finalizar login:', e?.message);
        // Limpa token inválido
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        toast.error('Falha ao finalizar login com Google');
      }
    };
    run();
  }, [token, login]);

  // A navegação para /dashboard ocorre dentro de login()
  return <Navigate to="/login" replace />;
}
