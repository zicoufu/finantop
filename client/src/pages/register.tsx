import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { insertUserSchema } from '../../../shared/schema';
import { useTranslation } from 'react-i18next';

type RegisterFormValues = z.infer<typeof insertUserSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors }, setError } = useForm<RegisterFormValues>({
    resolver: zodResolver(insertUserSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) => {
      return api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onSuccess: (data) => {
      toast.success(t('auth.registerSuccess'));
      login(data.token, data.user); // This will handle navigation
    },
    onError: (error) => {
      const msg = (error as Error)?.message || t('errors.generic');
      // Show generic/server message
      toast.error(msg);

      if (error instanceof ApiError) {
        // 400 - validação do Zod com fieldErrors
        if (error.status === 400) {
          const fieldErrors = error.data?.errors as Record<string, string[] | undefined> | undefined;
          if (fieldErrors) {
            (Object.entries(fieldErrors) as [keyof RegisterFormValues, string[] | undefined][])?.forEach(([field, msgs]) => {
              if (msgs && msgs.length > 0) {
                setError(field, { type: 'server', message: msgs[0] });
              }
            });
          }
        }
        // 409 - usuário já existe
        if (error.status === 409) {
          const serverMsg: string = error.data?.message || '';
          const isEmail = serverMsg.toLowerCase().includes('email');
          const isUsername = serverMsg.toLowerCase().includes('usuário') || serverMsg.toLowerCase().includes('username') || serverMsg.toLowerCase().includes('nome de usuário');
          const conflictMsg = isEmail
            ? t('errors.conflict.email')
            : isUsername
              ? t('errors.conflict.username')
              : msg;
          if (isEmail) setError('email', { type: 'server', message: conflictMsg });
          if (isUsername) setError('username', { type: 'server', message: conflictMsg });
          if (!isEmail && !isUsername) {
            // fallback: marcar ambos
            setError('email', { type: 'server', message: conflictMsg });
            setError('username', { type: 'server', message: conflictMsg });
          }
          toast.error(conflictMsg);
        }
      }
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('register.name')}</Label>
              <Input id="name" placeholder={t('register.namePlaceholder')} {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t('register.username')}</Label>
              <Input id="username" placeholder={t('register.usernamePlaceholder')} {...register('username')} />
              {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input id="email" type="email" placeholder={t('register.emailPlaceholder')} {...register('email')} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
              <p className="text-xs text-gray-500">
                {t('auth.passwordRequirements')}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('common.creating') : t('register.create')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t('auth.alreadyHaveAccount')} {' '}
            <Link to="/login" className="underline">
              {t('auth.login')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
