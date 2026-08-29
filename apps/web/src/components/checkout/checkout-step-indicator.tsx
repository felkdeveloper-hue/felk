import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { useIsMobile } from '@/hooks';
import { cn } from '@/lib/utils';

export interface CheckoutStepIndicatorProps {
  currentStep: CheckoutStepId;
}

/** Mobile skips the review step — payment places the order directly. */
const MOBILE_CHECKOUT_STEPS = CHECKOUT_STEPS.filter((step) => step.id !== 'review');

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
  const isMobile = useIsMobile(640);
  const steps = isMobile ? MOBILE_CHECKOUT_STEPS : CHECKOUT_STEPS;
  const resolvedStep: CheckoutStepId =
    isMobile && currentStep === 'review' ? 'payment' : currentStep;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === resolvedStep),
  );

  return (
    <nav aria-label="Checkout progress" className="mb-4 sm:mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-4">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === resolvedStep;
          const isUpcoming = index > currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-1.5 sm:gap-4">
              <Link
                to={step.path}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isComplete && 'text-primary hover:underline',
                  isUpcoming && 'text-muted-foreground pointer-events-none',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-md border text-[10px] font-medium sm:size-6 sm:rounded-full sm:text-xs',
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
              {index < steps.length - 1 ? (
                <span className="bg-border hidden h-px w-6 sm:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
      <motion.div
        className="bg-muted mt-2.5 h-0.5 overflow-hidden rounded-full sm:mt-4 sm:h-1"
        aria-hidden
        initial={false}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-primary h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </motion.div>
    </nav>
  );
}
