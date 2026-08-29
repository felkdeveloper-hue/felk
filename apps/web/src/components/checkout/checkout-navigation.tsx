import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CheckoutNavigationProps {
  backTo?: string;
  backLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
  showBack?: boolean;
}

export function CheckoutNavigation({
  backTo,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  isSubmitting,
  showBack = true,
}: CheckoutNavigationProps) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      {showBack && backTo ? (
        <Button type="button" variant="outline" asChild className="h-10 w-full sm:h-10 sm:w-auto">
          <Link to={backTo}>
            <ArrowLeft className="size-3.5 sm:size-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>
      ) : (
        <span />
      )}

      {onNext ? (
        <Button
          type="button"
          className="h-10 w-full text-[13px] sm:h-10 sm:w-auto sm:text-sm"
          onClick={onNext}
          disabled={nextDisabled || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden />
          ) : null}
          {nextLabel}
          {!isSubmitting ? <ArrowRight className="size-3.5 sm:size-4" aria-hidden /> : null}
        </Button>
      ) : null}
    </div>
  );
}
