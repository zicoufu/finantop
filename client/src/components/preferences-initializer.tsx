import { useEffect } from 'react';
import i18n from '../i18n';

// Função para obter as preferências do usuário do localStorage
const getUserPreferences = () => {
  try {
    const storedPrefs = localStorage.getItem('userPreferences');
    if (storedPrefs) {
      return JSON.parse(storedPrefs);
    }
  } catch (error) {
    console.error('Error reading preferences from localStorage:', error);
  }
  return null;
};

export function PreferencesInitializer() {
  useEffect(() => {
    // Carregar preferências do localStorage na inicialização
    const preferences = getUserPreferences();
    
    if (preferences) {
      // Aplicar idioma
      if (preferences.language) {
        i18n.changeLanguage(preferences.language);
      }
      
      // Aplicar tema
      if (preferences.theme) {
        document.documentElement.classList.remove('dark', 'light');
        
        if (preferences.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (preferences.theme === 'light') {
          document.documentElement.classList.add('light');
        } else if (preferences.theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
        }
      }
    }
  }, []);
  
  // Este componente não renderiza nada
  return null;
}
