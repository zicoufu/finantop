import { useState, useEffect } from 'react';
import i18n from '../i18n';
import { api } from '@/lib/api';

// Estender a interface Window para incluir nossa propriedade global
declare global {
  interface Window {
    globalDateFormat?: string;
  }
}

export interface UserPreferences {
  language: string;
  theme: string;
  currency: string;
  dateFormat: string;
}

const defaultPreferences: UserPreferences = {
  language: 'pt-BR',
  theme: 'light',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Função para aplicar o tema
  const applyTheme = (theme: string) => {
    document.documentElement.classList.remove('dark', 'light');
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    }
  };

  // Função para aplicar o idioma
  const applyLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  // Função para aplicar o formato de data
  const applyDateFormat = (format: string) => {
    // Armazena o formato de data em uma variável global para acesso em todo o sistema
    window.globalDateFormat = format;
    // Dispara um evento personalizado para notificar componentes sobre a mudança de formato
    window.dispatchEvent(new CustomEvent('dateFormatChanged', { detail: { format } }));
  };

  // Função para salvar preferências no localStorage
  const savePreferencesToLocalStorage = (prefs: UserPreferences) => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  };

  // Carregar preferências do usuário
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        
        // Primeiro, tenta carregar do localStorage para aplicação imediata
        const storedPrefs = localStorage.getItem('userPreferences');
        if (storedPrefs) {
          const parsedPrefs = JSON.parse(storedPrefs);
          setPreferences(parsedPrefs);
          applyTheme(parsedPrefs.theme);
          applyLanguage(parsedPrefs.language);
          applyDateFormat(parsedPrefs.dateFormat);
        }
        
        // Depois, busca do servidor para garantir dados atualizados
        const serverPrefs = await api('/api/user/preferences');
        if (serverPrefs) {
          setPreferences(serverPrefs);
          savePreferencesToLocalStorage(serverPrefs);
          applyTheme(serverPrefs.theme);
          applyLanguage(serverPrefs.language);
          applyDateFormat(serverPrefs.dateFormat);
        }
      } catch (err) {
        console.error('Error fetching user preferences:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Função para atualizar preferências
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      // Atualizar no servidor
      await api('/api/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(updatedPreferences)
      });
      
      // Atualizar estado local
      setPreferences(updatedPreferences);
      
      // Salvar no localStorage
      savePreferencesToLocalStorage(updatedPreferences);
      
      // Aplicar mudanças imediatamente
      if (newPreferences.theme) {
        applyTheme(newPreferences.theme);
      }
      
      if (newPreferences.language) {
        applyLanguage(newPreferences.language);
      }
      
      if (newPreferences.dateFormat) {
        applyDateFormat(newPreferences.dateFormat);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    }
  };

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
  };
}
