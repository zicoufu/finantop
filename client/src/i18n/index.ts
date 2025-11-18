 import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar arquivos de tradução
import ptBR from './locales/pt-BR-corrigido.json';
import enUS from './locales/en-US.json';
import es from './locales/es.json';

// Verificar se há um idioma específico configurado na URL
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');

// Limpar o cache de traduções no localStorage se houver um parâmetro para forçar atualização
if (urlParams.get('refresh_translations') === 'true') {
  localStorage.removeItem('i18nextLng');
  console.log('Forçando recarga das traduções...');
}

// Definir o idioma baseado na URL ou localStorage
const storedLanguage = localStorage.getItem('i18nextLng');
const userLanguage = langParam || storedLanguage || 'pt-BR';

// Se houver um parâmetro de URL, definir no localStorage
if (langParam) {
  localStorage.setItem('i18nextLng', langParam);
}

// Configuração do i18next
i18n
  // Detectar idioma do navegador
  .use(LanguageDetector)
  // Passar o i18n para o react-i18next
  .use(initReactI18next)
  // Inicializar i18next
  .init({
    resources: {
      'pt-BR': {
        translation: ptBR.translation
      },
      'en-US': enUS,
      'es': es
    },
    lng: userLanguage,
    // Prioriza português como fallback padrão
    fallbackLng: ['pt-BR', 'en-US'],
    // Usa flag do Vite para debug em desenvolvimento
    debug: import.meta.env.DEV,
    // Forçar recarregamento das traduções
    load: 'all',
    // Atualizar traduções em runtime
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false, // not necessary for React
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
