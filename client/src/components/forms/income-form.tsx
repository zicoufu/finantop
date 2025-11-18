import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { CategoryColorDot } from "@/components/ui/category-color-dot";
import "@/components/ui/category-color-dot.css";
import { formatDateForInput, parseUserDateInput } from "@/lib/date";
import { useEffect, useState } from "react";
import { handleApiFormError } from "@/lib/formError";

// Função para obter as preferências do usuário do localStorage
function getUserPreferences() {
  try {
    const storedPrefs = localStorage.getItem('userPreferences');
    if (storedPrefs) {
      return JSON.parse(storedPrefs);
    }
  } catch (error) {
    console.error('Error reading user preferences:', error);
  }
  return null;
}

// Função para criar um esquema de validação de data baseado nas preferências do usuário
const createDateSchema = (t: (key: string) => string) => {
  const userPrefs = getUserPreferences();
  const currentLanguage = localStorage.getItem('i18nextLng') || 'pt-BR';
  const dateFormat = userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
  
  // Criar regex apropriada baseada no formato de data
  let dateRegex;
  if (dateFormat === 'YYYY-MM-DD') {
    dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  } else {
    // Formato DD/MM/YYYY
    dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  }
  
  return z.string().refine(
    (value) => {
      if (!value) return false;
      return dateRegex.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value); // Aceita tanto o formato do usuário quanto o formato ISO
    },
    { message: t("income.validation.dateFormat") }
  );
};

const createIncomeSchema = (t: (key: string) => string) => {
  const dateSchema = createDateSchema(t);
  
  return z.object({
    description: z.string().min(1, t("income.validation.descriptionRequired")),
    amount: z.string().min(1, t("income.validation.amountRequired")),
    date: dateSchema,
    categoryId: z.string().min(1, t("income.validation.categoryRequired")),
    status: z.enum(["pending", "received"]),
    isRecurring: z.boolean().optional(),
  });
};

type IncomeFormData = z.infer<ReturnType<typeof createIncomeSchema>>;

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  status: string;
  categoryId: number;
  isRecurring: boolean;
}

interface IncomeFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  categories: Category[];
}

export default function IncomeForm({ initialData, onSuccess, categories }: IncomeFormProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Estado para armazenar o formato de data preferido pelo usuário
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD');
  
  // Carregar preferências do usuário quando o componente montar
  useEffect(() => {
    const userPrefs = getUserPreferences();
    const currentLanguage = i18n.language || 'pt-BR';
    const format = userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
    setDateFormat(format);
    
    // Adicionar listener para o evento de mudança de formato de data
    const handleDateFormatChange = (event: CustomEvent) => {
      if (event.detail && event.detail.format) {
        setDateFormat(event.detail.format);
      }
    };
    
    // Registrar o listener
    window.addEventListener('dateFormatChanged', handleDateFormatChange as EventListener);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('dateFormatChanged', handleDateFormatChange as EventListener);
    };
  }, [i18n.language]);
  
  // Function to translate category names
  // This function is kept here as it's specific to this component's context
  
  // Function to translate category names
  const translateCategoryName = (name: string) => {
    // Direct mapping for exact category names
    const exactCategoryMap: Record<string, string> = {
      "Salário": "salary",
      "Freelance": "freelance",
      "Investimentos": "investments",
      "Bônus": "bonus",
      "Outros": "others"
    };
    
    // Check for exact match first
    if (exactCategoryMap[name]) {
      return t(`categories.${exactCategoryMap[name]}`);
    }
    
    // If no exact match, try pattern matching
    const normalizedName = name.toLowerCase();
    
    if (normalizedName.includes('salário')) {
      return t('categories.salary');
    } else if (normalizedName.includes('freelance')) {
      return t('categories.freelance');
    } else if (normalizedName.includes('investimento')) {
      return t('categories.investments');
    } else if (normalizedName.includes('bônus') || normalizedName.includes('bonus')) {
      return t('categories.bonus');
    } else if (normalizedName.includes('outro')) {
      return t('categories.others');
    } else {
      // Try to find a matching category key or return the original name
      return t(`categories.${normalizedName}`, { defaultValue: name });
    }
  };
  
  const incomeSchema = createIncomeSchema(t);
  
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || "",
      date: initialData?.date || new Date().toISOString().split('T')[0],
      categoryId: initialData?.categoryId?.toString() || "",
      status: (initialData?.status as any) || "pending",
      isRecurring: initialData?.isRecurring || false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      // Converter as datas para o formato ISO antes de enviar para o servidor
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        type: "income",
        date: parseUserDateInput(data.date),
      };
      return api("/api/transactions", { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      // Atualiza listas locais e Relatórios
      queryClient.invalidateQueries({ queryKey: ["transactions", "income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('income.toast.createSuccess'),
        description: t('income.toast.createSuccessDescription'),
      });
      onSuccess();
    },
    onError: (error) => {
      const msg = handleApiFormError<IncomeFormData>(error, form.setError, t, { defaultMessageKey: 'income.toast.createError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      // Converter as datas para o formato ISO antes de enviar para o servidor
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        date: parseUserDateInput(data.date),
      };
      return api(`/api/transactions/${initialData!.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      // Atualiza listas locais e Relatórios
      queryClient.invalidateQueries({ queryKey: ["transactions", "income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('income.toast.updateSuccess'),
        description: t('income.toast.updateSuccessDescription'),
      });
      onSuccess();
    },
    onError: (error) => {
      const msg = handleApiFormError<IncomeFormData>(error, form.setError, t, { defaultMessageKey: 'income.toast.updateError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const onSubmit = (data: IncomeFormData) => {
    if (initialData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">{t('income.form.description')}</Label>
        <Input
          id="description"
          {...form.register("description")}
          placeholder={t('income.form.descriptionPlaceholder')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">{t('income.form.amount')}</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...form.register("amount")}
          placeholder={t('income.form.amountPlaceholder')}
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="categoryId">{t('income.form.category')}</Label>
        <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
          <SelectTrigger>
            <SelectValue placeholder={t('income.form.categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                <div className="flex items-center space-x-2">
                  <CategoryColorDot color={category.color} />
                  <span>{translateCategoryName(category.name)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.categoryId && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="date">{t('income.form.date')}</Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
          placeholder={dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY'}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.date.message}
            {dateFormat === 'DD/MM/YYYY' ? ' (DD/MM/YYYY)' : ' (YYYY-MM-DD)'}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="status">{t('income.form.status')}</Label>
        <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('income.form.statusPending')}</SelectItem>
            <SelectItem value="received">{t('income.form.statusReceived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isRecurring"
          checked={form.watch("isRecurring")}
          onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
        />
        <Label htmlFor="isRecurring">{t('income.form.recurring')}</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.saving') : initialData ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
