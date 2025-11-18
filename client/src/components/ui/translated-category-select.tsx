import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryColorDot } from "@/components/ui/category-color-dot";
import { Category } from "@/lib/types";

interface TranslatedCategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  categories: Category[];
  placeholder: string;
}

export function TranslatedCategorySelect({
  value,
  onValueChange,
  categories,
  placeholder
}: TranslatedCategorySelectProps) {
  const { t } = useTranslation();

  // Função para traduzir o nome da categoria diretamente
  const getTranslatedCategoryName = (name: string): string => {
    const categoryMap: Record<string, string> = {
      "Moradia e Habitação": "housing",
      "Alimentação": "food",
      "Transporte": "transportation",
      "Saúde e Bem-estar": "healthWellness",
      "Educação": "education",
      "Entretenimento": "entertainment",
      "Vestuário e Cuidados Pessoais": "clothing",
      "Serviços Domésticos": "homeServices",
      "Animais de Estimação": "pets",
      "Despesas Financeiras": "financial",
      "Impostos e Taxas": "taxes",
      "Outras Despesas": "other"
    };

    const key = categoryMap[name];
    return key ? t(`categories.${key}`) : name;
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            <div className="flex items-center space-x-2">
              <CategoryColorDot color={category.color} />
              <span>{getTranslatedCategoryName(category.name)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
