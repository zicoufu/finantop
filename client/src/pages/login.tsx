import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleApiFormError } from "@/lib/formError";
import { Separator } from "@/components/ui/separator";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restaurar erro persistido (se houver) para evitar sumiço por remount
  useEffect(() => {
    const saved = sessionStorage.getItem('loginError');
    if (saved) setLoginError(saved);
  }, []);

  // Schema usando mensagens traduzidas
  const loginSchema = z.object({
    email: z.string().email({ message: t('errors.emailInvalid') }),
    password: z.string().min(1, { message: t('errors.passwordRequired') }),
  });

  const { register, handleSubmit, formState: { errors }, setError, clearErrors } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      try {
        // Tentar fazer login primeiro
        const loginResponse = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return loginResponse;
      } catch (error: any) {
        // Se for erro de usuário inexistente e o email for demo@example.com
        if (error.message?.includes('User not found') && data.email === 'demo@example.com') {
          // Criar dados de exemplo automaticamente
          const initData = await api('/api/init', {
            method: 'POST'
          });
          
          if (initData?.success && initData?.token) {
            return {
              token: initData.token,
              user: { email: data.email, id: initData.userId }
            };
          }
        }
        throw error; // Re-throw se não resolveu
      }
    },
    onSuccess: (data) => {
      // Limpar erro persistente após sucesso
      setLoginError(null);
      sessionStorage.removeItem('loginError');
      toast.success(t('auth.loginSuccess'));
      login(data.token, data.user); // Navega automaticamente para o dashboard
    },
    onError: (error) => {
      // Primeiro, aplica erros de validação por campo (400) usando o handler centralizado
      const fallback = 'errors.generic';
      let userMsg = handleApiFormError<LoginFormValues>(error, setError, t, { defaultMessageKey: fallback });

      // Para 401, exibir mensagem única e clara (sem erros por campo)
      if (error instanceof ApiError && error.status === 401) {
        userMsg = t('errors.invalidEmailOrPassword', 'Senha ou e-mail inválidos.');
        // Não manter erros por campo para evitar piscar
        clearErrors(['email', 'password']);
      }

      // Persistir mensagem em estado local independente do react-hook-form
      setLoginError(userMsg);
      sessionStorage.setItem('loginError', userMsg);

      toast.error(userMsg, { duration: Infinity });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    // Não limpar aqui para evitar sumir imediatamente ao reenvio
    mutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.login', 'Login')}</CardTitle>
          <CardDescription>
            {t('auth.welcomeBack', 'Bem-vindo de volta! Por favor, insira suas credenciais.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input id="email" type="email" placeholder={t('login.emailPlaceholder')} {...register('email')} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('login.loggingIn') : t('login.submit')}
            </Button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword', 'Esqueci minha senha')}
              </Link>
            </div>
          </form>
          {/* Acesso via OAuth Google */}
          <div className="my-2">
            <Separator className="my-4" />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
                let cleanedBase = envBase ? envBase.replace(/\/+$/, '') : '';
                if (!cleanedBase || /localhost(:\d+)?$/i.test(cleanedBase)) {
                  if (typeof window !== 'undefined' && window.location?.origin) {
                    cleanedBase = window.location.origin.replace(/\/+$/, '');
                  } else {
                    cleanedBase = '';
                  }
                }
                const url = `${cleanedBase}/api/auth/google`;
                window.location.href = url;
              }}
            >
              {t('auth.continueWithGoogle', 'Continuar com Google')}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.dontHaveAccount', 'Não tem uma conta?')}{' '}
            <Link to="/register" className="text-primary hover:underline">
              {t('auth.register', 'Registrar')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
