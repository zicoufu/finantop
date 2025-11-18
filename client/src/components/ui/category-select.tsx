import { useTranslation } from "react-i18next";
import { Category } from "@/lib/types";
import { useEffect, useState } from "react";

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Mapeamento de categorias normalizadas para chaves de tradução (escopo de módulo para identidade estável)
const CATEGORY_MAP: Record<string, string> = {
  "moradia e habitacao": "housing",
  "alimentacao": "food",
  "transporte": "transportation",
  "saude e bem-estar": "healthWellness",
  "educacao": "education",
  "lazer e entretenimento": "entertainment",
  "vestuario e cuidados pessoais": "clothing",
  "servicos domesticos": "homeServices",
  "animais de estimacao": "pets",
  "despesas financeiras": "financial",
  "impostos e taxas": "taxes",
  "outras despesas": "other",
};

export function CategorySelect({ categories, value, onChange, placeholder }: CategorySelectProps) {
  const { t, i18n } = useTranslation();
  const [translatedCategories, setTranslatedCategories] = useState<Record<string, string>>({});

  // Atualiza as traduções quando o idioma mudar ou quando as categorias mudarem
  useEffect(() => {
    // Função para traduzir uma categoria (definida dentro do useEffect para evitar recriação)
    const translateCategory = (category: Category) => {
      const currentLanguage = i18n.language;
      
      // Se não for português, traduz
      if (currentLanguage !== "pt-BR" && currentLanguage !== "pt") {
        const normalized = normalize(category.name);
        const key = CATEGORY_MAP[normalized];
        
        if (key) {
          return t(`categories.${key}`);
        }
      }
      
      // Se for português ou não encontrar tradução, mantém o nome original
      return category.name;
    };

    const translations: Record<string, string> = {};
    
    categories.forEach(category => {
      translations[category.id] = translateCategory(category);
    });
    
    setTranslatedCategories(translations);
  }, [categories, i18n.language]);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={placeholder || t('expenses.selectCategory')}
      >
        <option value="">{placeholder || t('expenses.selectCategory')}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id.toString()}>
            {translatedCategories[category.id] || category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
