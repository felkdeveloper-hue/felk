import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@fe-platform/ui';
import { AdminTextInput, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';
import { useLoginMutation } from '@/hooks';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
    await navigate({ to: ADMIN_ROUTES.dashboard });
  });

  return (
    <PageMotion>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Admin sign in</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Use your staff account to access the commerce admin.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <AdminTextInput
            label="Email"
            type="email"
            registration={register('email')}
            error={errors.email}
          />
          <AdminTextInput
            label="Password"
            type="password"
            registration={register('password')}
            error={errors.password}
          />
          {login.isError ? (
            <p className="text-sm text-red-600">Unable to sign in. Check your credentials.</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link to={ADMIN_ROUTES.dashboard} className="underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </PageMotion>
  );
}
