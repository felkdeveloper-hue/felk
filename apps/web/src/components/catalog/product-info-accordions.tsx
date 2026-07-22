import { List, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { hasMeaningfulText } from '@/utils/catalog/specifications';

export interface ProductInfoAccordionsProps {
  description?: string;
  returnPolicy?: string;
  warrantyDetails?: string;
}

export function ProductInfoAccordions({
  description,
  returnPolicy,
  warrantyDetails,
}: ProductInfoAccordionsProps) {
  const showDescription = hasMeaningfulText(description);
  const showReturns = hasMeaningfulText(returnPolicy);
  const showWarranty = hasMeaningfulText(warrantyDetails);

  if (!showDescription && !showReturns && !showWarranty) return null;

  return (
    <Accordion type="multiple" className="rounded-xl border">
      {showDescription ? (
        <AccordionItem value="description" className="border-b px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <List className="text-muted-foreground size-5 shrink-0" />
              <div>
                <p className="font-semibold">Product Description</p>
                <p className="text-muted-foreground text-xs font-normal">
                  Manufacture, care and fit
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pl-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {description}
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}
      {showReturns ? (
        <AccordionItem value="returns" className={showWarranty ? 'border-b px-4' : 'px-4'}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <RefreshCcw className="text-muted-foreground size-5 shrink-0" />
              <div>
                <p className="font-semibold">Returns & Refunds</p>
                <p className="text-muted-foreground text-xs font-normal">
                  Return and refund policy
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pl-8">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {returnPolicy}
            </p>
          </AccordionContent>
        </AccordionItem>
      ) : null}
      {showWarranty ? (
        <AccordionItem value="warranty" className="px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <ShieldCheck className="text-muted-foreground size-5 shrink-0" />
              <div>
                <p className="font-semibold">Warranty</p>
                <p className="text-muted-foreground text-xs font-normal">Coverage details</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pl-8">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {warrantyDetails}
            </p>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
}
