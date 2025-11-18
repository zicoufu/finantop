import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

/**
 * Componente que inicializa automaticamente a autenticação
 * para garantir que os dados do dashboard sejam carregados corretamente
 */
export const AuthInitializer = () => {
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    const initialize = async () => {
      // Se não estiver autenticado, inicializa os dados e faz login automaticamente
      if (!isAuthenticated && !localStorage.getItem('authToken')) {
        try {
          console.log('Inicializando dados de exemplo e fazendo login automático...');
          
          // Primeiro, inicializa os dados de exemplo (que agora retorna um token)
          const initData = await api('/api/init', {
            method: 'POST'
          });
          
          // Se a inicialização foi bem-sucedida e retornou um token
          if (initData && initData.success && initData.token) {
            // Salva o token no localStorage
            localStorage.setItem('authToken', initData.token);
            
            // Busca os dados do usuário para completar o login
            const userData = await api('/api/auth/me');
            
            if (userData) {
              login(initData.token, userData);
              console.log('Inicialização e autenticação automática bem-sucedidas!');
            }
          } else {
            // Fallback: tenta fazer login tradicional se a inicialização falhar
            console.log('Inicialização falhou, tentando login tradicional...');
            const loginData = await api('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({
                email: 'demo@example.com',
                password: 'password'
              })
            });
            
            if (loginData && loginData.token && loginData.user) {
              login(loginData.token, loginData.user);
              console.log('Login tradicional bem-sucedido!');
            }
          }
        } catch (error) {
          console.error('Erro na inicialização/autenticação automática:', error);
        }
      }
    };

    initialize();
  }, [isAuthenticated, login]);

  return null; // Componente não renderiza nada visualmente
};
