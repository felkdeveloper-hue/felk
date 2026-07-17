import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { cn } from '@/lib/utils';

export interface CheckoutStepIndicatorProps {
  currentStep: CheckoutStepId;
}

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
  const currentIndex = CHECKOUT_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isUpcoming = index > currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-4">
              <Link
                to={step.path}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isComplete && 'text-primary hover:underline',
                  isUpcoming && 'text-muted-foreground pointer-events-none',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border text-xs font-medium',
                    isCurrent && 'border-primary-foreground/30 bg-primary-foreground/10',
                    isComplete && 'border-primary bg-primary/10 text-primary',
                    isUpcoming && 'border-border',
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
              {index < CHECKOUT_STEPS.length - 1 ? (
                <span className="bg-border hidden h-px w-6 sm:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
      <motion.div
        className="bg-muted mt-4 h-1 overflow-hidden rounded-full"
        aria-hidden
        initial={false}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-primary h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / CHECKOUT_STEPS.length) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </motion.div>
    </nav>
  );
}
