import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { useTranslation } from "react-i18next";
import { useUserPreferences } from "@/hooks/use-user-preferences";

export default function UserPreferences() {
  // Inicializar i18n
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Usar o hook de preferências do usuário
  const { preferences, isLoading, updatePreferences } = useUserPreferences();
  
  // Local state for preferences form
  const [formData, setFormData] = useState({
    language: "pt-BR",
    theme: "light",
    currency: "BRL",
    dateFormat: "DD/MM/YYYY",
  });
  
  // Atualizar estado local quando as preferências são carregadas
  useEffect(() => {
    if (preferences) {
      setFormData({
        ...formData,
        ...preferences,
      });
    }
  }, [preferences]);
  
  // Função para lidar com mudanças nos campos do formulário
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para lidar com a submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await updatePreferences(formData);
    
    if (success) {
      toast({
        title: t("preferences.success", "Preferências atualizadas"),
        description: t("preferences.preferencesUpdated", "Suas preferências foram atualizadas com sucesso.")
      });
    } else {
      toast({
        title: t("common.error", "Erro"),
        description: t("preferences.updateError", "Ocorreu um erro ao atualizar suas preferências."),
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8">{t("common.loading", "Carregando...")}</div>;
  }
  
  return (
    <div className="container mx-auto py-4">
      <PageHeader title={t("preferences.title", "Preferências do Usuário")} />
      
      <Card>
        <CardHeader>
          <CardTitle>{t("preferences.personalSettings", "Configurações Pessoais")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Idioma */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t("preferences.language", "Idioma")}</label>
              <Select 
                value={formData.language} 
                onValueChange={(value) => handleChange("language", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("preferences.selectLanguage", "Selecione o idioma")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Tema */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t("preferences.theme", "Tema")}</label>
              <Select 
                value={formData.theme} 
                onValueChange={(value) => handleChange("theme", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("preferences.selectTheme", "Selecione o tema")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("preferences.light", "Claro")}</SelectItem>
                  <SelectItem value="dark">{t("preferences.dark", "Escuro")}</SelectItem>
                  <SelectItem value="system">{t("preferences.system", "Sistema")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Moeda */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t("preferences.currency", "Moeda")}</label>
              <Select 
                value={formData.currency} 
                onValueChange={(value) => setFormData({...formData, currency: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("preferences.selectCurrency", "Selecione a moeda")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">R$ (Real)</SelectItem>
                  <SelectItem value="USD">$ (Dólar)</SelectItem>
                  <SelectItem value="EUR">€ (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Formato de data */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t("preferences.dateFormat", "Formato de Data")}</label>
              <Select 
                value={formData.dateFormat} 
                onValueChange={(value) => setFormData({...formData, dateFormat: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("preferences.selectDateFormat", "Selecione o formato de data")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? t("common.saving", "Salvando...") : t("common.save", "Salvar")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
