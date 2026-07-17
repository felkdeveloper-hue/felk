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
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showBack && backTo ? (
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link to={backTo}>
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>
      ) : (
        <span />
      )}

      {onNext ? (
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={onNext}
          disabled={nextDisabled || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {nextLabel}
          {!isSubmitting ? <ArrowRight className="size-4" aria-hidden /> : null}
        </Button>
      ) : null}
    </div>
  );
}
