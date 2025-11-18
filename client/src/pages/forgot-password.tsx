import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ForgotForm = { email: string };

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  const schema = z.object({
    email: z.string().email({ message: t('errors.emailInvalid') }),
  });

  const { register, handleSubmit, formState: { errors }, setError, reset } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotForm) => {
      return api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success(t('forgot.success', 'Se o e-mail existir, enviaremos instruções de recuperação.'));
      reset();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 429) {
        toast.error(t('forgot.rateLimited', 'Muitas tentativas. Tente novamente em alguns minutos.'));
        return;
      }
      // Não revelar se o e-mail existe
      toast.error(t('forgot.success', 'Se o e-mail existir, enviaremos instruções de recuperação.'));
    },
  });

  const onSubmit = (data: ForgotForm) => mutation.mutate(data);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('forgot.title', 'Recuperar senha')}</CardTitle>
          <CardDescription>{t('forgot.description', 'Informe seu e-mail para receber instruções.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input id="email" type="email" placeholder={t('login.emailPlaceholder')} {...register('email')} />
              {errors.email && (
                <Alert variant="destructive"><AlertDescription>{errors.email.message}</AlertDescription></Alert>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('forgot.sending', 'Enviando...') : t('forgot.submit', 'Enviar instruções')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('forgot.backToLogin', 'Voltar ao login')} {" "}
            <Link to="/login" className="text-primary hover:underline">{t('auth.login', 'Login')}</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
