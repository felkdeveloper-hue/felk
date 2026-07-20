import { List, RefreshCcw } from 'lucide-react';
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
}

export function ProductInfoAccordions({ description, returnPolicy }: ProductInfoAccordionsProps) {
  const showDescription = hasMeaningfulText(description);
  const showReturns = hasMeaningfulText(returnPolicy);

  if (!showDescription && !showReturns) return null;

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
        <AccordionItem value="returns" className="px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <RefreshCcw className="text-muted-foreground size-5 shrink-0" />
              <div>
                <p className="font-semibold">Returns & Exchange</p>
                <p className="text-muted-foreground text-xs font-normal">
                  Return and exchange policy
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
    </Accordion>
  );
}
