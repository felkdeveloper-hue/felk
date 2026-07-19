import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ADMIN_ROUTES } from '@/constants';
import { useLoginMutation } from '@/hooks';
import { AppError } from '@/lib/errors';

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

  const errorMessage =
    login.error instanceof AppError
      ? login.error.message
      : login.isError
        ? 'Unable to sign in. Check your credentials.'
        : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0d10] text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 15% 20%, rgba(180,140,90,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(70,90,120,0.22), transparent 50%), linear-gradient(165deg, #0c0d10 0%, #14161c 48%, #0c0d10 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="hidden flex-col justify-between border-r border-white/5 px-12 py-10 lg:flex xl:px-16"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
              Commerce ops
            </p>
            <h1 className="mt-6 max-w-sm font-serif text-5xl leading-[1.05] tracking-tight text-white">
              FE Admin
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Manage catalog, orders, customers, and storefront content from one console.
            </p>
          </div>
          <p className="text-xs text-white/35">Staff access only · FE Platform</p>
        </motion.aside>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
            className="w-full max-w-[400px]"
          >
            <div className="mb-8 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
                Commerce ops
              </p>
              <h1 className="mt-3 font-serif text-3xl tracking-tight text-white">FE Admin</h1>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-white">Sign in</h2>
              <p className="mt-1.5 text-sm text-white/50">
                Use your staff account to open the admin console.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-white/70">Email</span>
                  <input
                    type="email"
                    autoComplete="username"
                    className="border-white/12 w-full rounded-lg border bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-amber-200/40 focus:ring-1 focus:ring-amber-200/25"
                    placeholder="you@company.com"
                    {...register('email')}
                  />
                  {errors.email ? (
                    <span className="block text-xs text-red-300">{errors.email.message}</span>
                  ) : null}
                </label>

                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-white/70">Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="border-white/12 w-full rounded-lg border bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-amber-200/40 focus:ring-1 focus:ring-amber-200/25"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  {errors.password ? (
                    <span className="block text-xs text-red-300">{errors.password.message}</span>
                  ) : null}
                </label>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={login.isPending}
                  className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[#f2efe8] text-sm font-semibold text-[#0c0d10] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {login.isPending ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-white/40">
              <Link
                to={ADMIN_ROUTES.dashboard}
                className="underline-offset-4 hover:text-white/70 hover:underline"
              >
                Back to dashboard
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
