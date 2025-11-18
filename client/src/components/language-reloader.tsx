import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export function LanguageReloader() {
  const { t } = useTranslation();
  
  const handleReloadTranslations = () => {
    // Forçar recarregamento das traduções
    const currentLang = i18n.language;
    localStorage.removeItem('i18nextLng');
    
    // Mudar para outro idioma e voltar para forçar recarga
    const tempLang = currentLang === 'pt-BR' ? 'en-US' : 'pt-BR';
    i18n.changeLanguage(tempLang).then(() => {
      setTimeout(() => {
        i18n.changeLanguage(currentLang).then(() => {
          window.location.reload();
        });
      }, 100);
    });
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="ml-2" 
      onClick={handleReloadTranslations} 
      title="Recarregar traduções"
    >
      <RefreshCcw className="h-4 w-4 mr-1" />
      {t('common.reloadTranslations', 'Atualizar')}
    </Button>
  );
}
